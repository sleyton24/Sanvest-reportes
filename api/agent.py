"""Agente conversacional sobre los datos del panel (tool use con Claude Opus 4.8).

El modelo NO escribe SQL: se le exponen como herramientas los mismos accesos
read-only que usan las rutas HTTP (catálogo + db.fetch parametrizado). Así las
respuestas quedan ancladas a datos reales/reconciliados y no hay superficie de
inyección. Streaming vía SSE; el loop de tool-use corre en el servidor.

Requiere ANTHROPIC_API_KEY en el entorno (.env). Modelo: claude-opus-4-8.
"""
from __future__ import annotations

import json
import os
from typing import Any, Iterator

from . import catalog as cat
from . import measures as meas
from .db import build_where, fetch, qi

MODEL = "claude-opus-5"
MAX_ITERS = 8          # tope de vueltas de tool-use por pregunta
MAX_TOKENS = 8000      # suficiente para una respuesta analítica (streaming)
ROW_CAP = 500          # tope duro de filas por consulta

AGGS = {"sum": "SUM", "avg": "AVG", "min": "MIN", "max": "MAX", "count": "COUNT"}


# --------------------------------------------------------------------------
# Esquema de la unidad (se embebe en el system prompt; ~2-5 KB por unidad)
# --------------------------------------------------------------------------
def build_schema_text(unit: str) -> str:
    c = cat.get_unit(unit)
    if not c:
        raise ValueError(f"unidad '{unit}' no existe")
    lines = [f"# Esquema de datos de la unidad '{unit}'", ""]
    for t in c["tables"]:
        model_name = t.get("model_name") or t["slug"]
        lines.append(f"## tabla `{t['slug']}`  (modelo PBI: {model_name}, filas: {t.get('rows', '?')})")
        for col in t["columns"]:
            role = col.get("role", "")
            dtype = col.get("dtype", "")
            tag = f" [{role}]" if role else ""
            # backticks: hacen visibles los espacios finales del nombre real
            # (p.ej. `Fecha ID `, `Mes de carga `) para que el agente los use exactos.
            lines.append(f"  - `{col['name']}`  ({dtype}){tag}")
        lines.append("")
    ms = meas.list_measures(unit)
    if ms:
        lines.append("## medidas DAX disponibles (usar compute_measure):")
        for m in ms:
            lines.append(f"  - id={m['id']}  «{m['name']}»  sobre `{m['table']}`  ({m.get('unit_measure', '')})")
    return "\n".join(lines)


SYSTEM_BASE = """Eres el asistente analítico de Sanvest BI. Respondes preguntas sobre los datos \
que alimentan los paneles de Power BI migrados (ventas, costos, financieros, etc.), \
consultando exclusivamente las herramientas disponibles.

REGLAS (estrictas — es información financiera):
1. NUNCA inventes cifras. Todo número que reportes debe venir de una llamada a una herramienta en \
esta misma conversación. Si no lo obtuviste de una herramienta, no lo afirmes.
2. Si un dato no está disponible o la tabla/columna no existe, dilo claramente («no tengo ese dato») \
en vez de aproximar.
3. Cita SIEMPRE el contexto de cada cifra: proyecto/activo, período (mes/año o FechaID) y de qué tabla salió.
4. Usa los nombres EXACTOS de columnas y los valores EXACTOS de filtro. Si dudas del valor de un filtro \
(p. ej. el nombre exacto de un proyecto o el último período), usa `distinct_values` para descubrirlo antes de filtrar.
5. Para totales/sumas/promedios usa `aggregate` (no traigas filas y sumes a mano). Para el detalle usa `query_table`.
6. Las cifras de UF muéstralas con separador de miles y 0-2 decimales. Primero el número/respuesta, después el contexto. El LARGO permitido te lo indica el bloque de abajo y es estricto.
7. Responde en español (Chile). No reveles SQL ni detalles internos salvo que se pidan.

DIAGNÓSTICO DE CARGAS (cuando te pregunten porque una carga "quedó mal"):
- Verifica los períodos realmente cargados con `distinct_values` sobre las columnas de año/mes/período \
(p. ej. `Año`, `Mes`, `Periodo`, `Fecha ID`) y compáralos con lo que la persona esperaba.
- Señales de problema: un año/mes que desapareció o quedó pisado por otro, meses faltantes, filas \
duplicadas, o valores fuera de rango (ceros o negativos donde no corresponde, saltos bruscos respecto a \
meses previos). Usa `aggregate`/`query_table` para mostrar la evidencia (el antes/después por período).
- Explica con precisión QUÉ está mal y CÓMO corregirlo: volver a subir el archivo correcto con el nombre \
esperado (los informes se detectan por nombre), revisar hoja/columnas contra la plantilla «Descargar \
ejemplo», o restaurar desde respaldo si se pisó un período.
- IMPORTANTE: tú NO modificas ni cargas datos; solo diagnosticas y guías paso a paso. Nunca digas que \
"ya lo arreglaste"; el usuario ejecuta la corrección.

SOBRE EL REPORTE QUE EL USUARIO ESTÁ VIENDO:
- Si más abajo viene un bloque "REPORTE EN PANTALLA", el usuario te pregunta MIRANDO ese reporte: sus filtros (activo/proyecto, año, mes) son el contexto por defecto. Si pregunta "¿por qué bajó el EBITDA?" se refiere a ese activo y ese período, no tienes que preguntárselo.
- Esas cifras son las que él ve, pero NO son tu fuente: verifícalas con las herramientas antes de explicarlas. Si lo que consultas no coincide con lo que está en pantalla, dilo explícitamente (suele significar que el filtro que ves y el dato de la tabla no son el mismo período).
- Cuando pregunte por una comparación que el reporte no muestra (otro mes, otro activo), consúltala con las herramientas; no te limites a lo que está en pantalla.

Tienes el esquema completo de la unidad activa más abajo. Empieza razonando qué tabla/columna responde la \
pregunta; descubre valores de filtro con distinct_values si hace falta; consulta; y responde con la cifra citada."""


# --------------------------------------------------------------------------
# Herramientas (read-only; reusan catálogo + db, igual que las rutas HTTP)
# --------------------------------------------------------------------------
def _check_cols(unit: str, slug: str, names: list[str]) -> None:
    cols = cat.table_columns(unit, slug)
    if not cols:
        raise ValueError(f"la tabla '{slug}' no existe en la unidad '{unit}'")
    bad = [n for n in names if n and n not in cols]
    if bad:
        raise ValueError(f"columnas desconocidas {bad}. Columnas válidas: {sorted(cols)}")


def _resolve_cols(unit: str, slug: str, tokens: list[str]) -> list[str]:
    """Resuelve cada token de group-by contra el nombre REAL de la columna en el
    catálogo. Tolera el espacio tras la coma en 'a, b' SIN romper nombres reales
    que tienen espacios (p.ej. 'Fecha ID ', 'Mes de carga '). Match exacto primero,
    luego por igualdad sin espacios alrededor."""
    cols = cat.table_columns(unit, slug)
    if not cols:
        raise ValueError(f"la tabla '{slug}' no existe en la unidad '{unit}'")
    stripped = {}
    for c in cols:
        stripped.setdefault(c.strip(), c)
    out = []
    for tok in tokens:
        if tok in cols:
            out.append(tok)
        elif tok.strip() in stripped:
            out.append(stripped[tok.strip()])
        else:
            raise ValueError(f"columna desconocida en 'by': '{tok}'. Columnas válidas: {sorted(cols)}")
    return out


def t_get_schema(unit: str, **_) -> dict:
    return json.loads(json.dumps({"schema": build_schema_text(unit)}))


def t_query_table(unit: str, table: str, filters: dict | None = None,
                  order_by: str | None = None, order_dir: str = "asc",
                  limit: int = 50, **_) -> dict:
    if not cat.get_table(unit, table):
        raise ValueError(f"la tabla '{table}' no existe en la unidad '{unit}'")
    filters = filters or {}
    _check_cols(unit, table, list(filters.keys()) + ([order_by] if order_by else []))
    where, params = build_where(filters)
    order = (f"ORDER BY {qi(order_by)} {'DESC' if str(order_dir).lower() == 'desc' else 'ASC'}"
             if order_by else "")
    lim = max(1, min(int(50 if limit is None else limit), ROW_CAP))
    rows = fetch(f"SELECT * FROM {qi(table)} {where} {order} LIMIT :_lim", {**params, "_lim": lim})
    return {"table": table, "filters": filters, "returned": len(rows), "rows": rows}


def t_aggregate(unit: str, table: str, measure: str, agg: str = "sum",
                by: str | None = None, filters: dict | None = None, **_) -> dict:
    if agg not in AGGS:
        raise ValueError(f"agg debe ser uno de {list(AGGS)}")
    if not cat.get_table(unit, table):
        raise ValueError(f"la tabla '{table}' no existe en la unidad '{unit}'")
    group_cols = _resolve_cols(unit, table, by.split(",")) if by else []
    filters = filters or {}
    _check_cols(unit, table, [measure] + group_cols + list(filters.keys()))
    where, params = build_where(filters)
    sel_group = ", ".join(qi(c) for c in group_cols)
    sel = (sel_group + ", " if sel_group else "") + f"{AGGS[agg]}({qi(measure)}) AS value"
    group = f"GROUP BY {sel_group}" if sel_group else ""
    order = f"ORDER BY {sel_group}" if sel_group else ""
    data = fetch(f"SELECT {sel} FROM {qi(table)} {where} {group} {order}", params)
    return {"table": table, "measure": measure, "agg": agg, "by": group_cols, "data": data}


def t_distinct_values(unit: str, table: str, column: str, **_) -> dict:
    _check_cols(unit, table, [column])
    rows = fetch(f"SELECT DISTINCT {qi(column)} AS v FROM {qi(table)} "
                 f"WHERE {qi(column)} IS NOT NULL ORDER BY 1")
    return {"table": table, "column": column, "values": [r["v"] for r in rows]}


def t_compute_measure(unit: str, measure_id: str, filters: dict | None = None, **_) -> dict:
    m = meas.get_measure(unit, measure_id)
    if not m:
        raise ValueError(f"la medida '{measure_id}' no existe en '{unit}'. "
                         f"Disponibles: {[x['id'] for x in meas.list_measures(unit)]}")
    filters = filters or {}
    _check_cols(unit, m["table"], list(filters.keys()))
    return {"measure": measure_id, "filters": filters, "value": meas.compute_measure(m, filters)}


DISPATCH = {
    "get_schema": t_get_schema,
    "query_table": t_query_table,
    "aggregate": t_aggregate,
    "distinct_values": t_distinct_values,
    "compute_measure": t_compute_measure,
}

TOOLS = [
    {
        "name": "get_schema",
        "description": "Devuelve el esquema completo (tablas, columnas y medidas) de la unidad activa. "
                       "Normalmente ya lo tienes en el system prompt; úsalo solo si necesitas refrescarlo.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "distinct_values",
        "description": "Lista los valores distintos de una columna (p. ej. proyectos, períodos, categorías). "
                       "Úsalo para descubrir el valor EXACTO de un filtro antes de consultar.",
        "input_schema": {
            "type": "object",
            "properties": {
                "table": {"type": "string", "description": "slug de la tabla"},
                "column": {"type": "string", "description": "nombre exacto de la columna"},
            },
            "required": ["table", "column"],
        },
    },
    {
        "name": "query_table",
        "description": "Trae filas de una tabla con filtros de igualdad (columna=valor), orden y límite. "
                       "Para el detalle. Para totales usa 'aggregate'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "table": {"type": "string", "description": "slug de la tabla"},
                "filters": {"type": "object", "description": "pares columna=valor (igualdad exacta)",
                            "additionalProperties": {"type": ["string", "number", "boolean"]}},
                "order_by": {"type": "string", "description": "columna para ordenar (opcional)"},
                "order_dir": {"type": "string", "enum": ["asc", "desc"]},
                "limit": {"type": "integer", "description": f"máx filas (1-{ROW_CAP}, def. 50)"},
            },
            "required": ["table"],
        },
    },
    {
        "name": "aggregate",
        "description": "Agrega una medida (SUM/AVG/MIN/MAX/COUNT) con filtros y group-by opcional. "
                       "Úsalo para totales, sumas, promedios y comparativos por proyecto/período.",
        "input_schema": {
            "type": "object",
            "properties": {
                "table": {"type": "string", "description": "slug de la tabla"},
                "measure": {"type": "string", "description": "columna numérica a agregar"},
                "agg": {"type": "string", "enum": list(AGGS.keys())},
                "by": {"type": "string", "description": "columnas group-by separadas por coma (opcional)"},
                "filters": {"type": "object", "description": "pares columna=valor (igualdad exacta)",
                            "additionalProperties": {"type": ["string", "number", "boolean"]}},
            },
            "required": ["table", "measure"],
        },
    },
    {
        "name": "compute_measure",
        "description": "Calcula una medida DAX predefinida de la unidad por su id, con filtros opcionales.",
        "input_schema": {
            "type": "object",
            "properties": {
                "measure_id": {"type": "string"},
                "filters": {"type": "object", "additionalProperties": {"type": ["string", "number", "boolean"]}},
            },
            "required": ["measure_id"],
        },
    },
]


# --------------------------------------------------------------------------
# Loop de agente con streaming SSE
# --------------------------------------------------------------------------
def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False, default=str)}\n\n"


def _client():
    import anthropic  # import perezoso: no rompe el arranque si falta la lib/clave
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("Falta ANTHROPIC_API_KEY en el entorno (.env).")
    return anthropic.Anthropic()


def _vista_text(vista: dict | None) -> str | None:
    """Bloque legible con lo que el usuario tiene en pantalla (unidad, filtros y cifras).
    Va DESPUÉS del esquema cacheado: cambia con cada pregunta y rompería el caché."""
    if not vista:
        return None
    partes = [f"REPORTE EN PANTALLA: {vista.get('titulo') or vista.get('unidad') or ''}".strip()]
    filtros = vista.get("filtros") or {}
    if isinstance(filtros, dict) and filtros:
        partes.append("Filtros activos: "
                      + ", ".join(f"{k} = {v}" for k, v in list(filtros.items())[:12]))
    cifras = vista.get("cifras") or []
    if isinstance(cifras, list) and cifras:
        vis = [f"  · {c.get('label')}: {c.get('valor')}" for c in cifras[:40]
               if isinstance(c, dict) and c.get("label")]
        if vis:
            partes.append("Cifras visibles en pantalla:" + chr(10)
                          + chr(10).join(vis))
    return chr(10).join(partes)


# Precio por millón de tokens (USD) para estimar el gasto que se muestra en Admin.
# Fuente: tarifas de la API de Anthropic. La lectura de caché cuesta ~10% de la
# entrada y escribirlo ~125%. Si cambian las tarifas, se ajusta acá.
PRECIOS_USD = {
    "claude-opus-5":   (5.0, 25.0),
    "claude-opus-4-8": (5.0, 25.0),
    "claude-sonnet-5": (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
}


def costo_usd(model: str, entrada: int, salida: int, cache_read: int, cache_write: int) -> float:
    """Costo estimado de una pregunta. Si el modelo no está en la tabla se usa la
    tarifa de Opus (la más alta de las que usamos): mejor sobreestimar que ocultar."""
    pe, ps = PRECIOS_USD.get(model, (5.0, 25.0))
    return ((entrada * pe) + (salida * ps)
            + (cache_read * pe * 0.10) + (cache_write * pe * 1.25)) / 1_000_000


def _acumular(uso, final) -> None:
    """Suma el usage de una vuelta del bucle de herramientas al acumulador."""
    u = getattr(final, "usage", None)
    if u is None:
        return
    uso["entrada"] += getattr(u, "input_tokens", 0) or 0
    uso["salida"] += getattr(u, "output_tokens", 0) or 0
    uso["cache_read"] += getattr(u, "cache_read_input_tokens", 0) or 0
    uso["cache_write"] += getattr(u, "cache_creation_input_tokens", 0) or 0
    uso["iteraciones"] += 1


def _largo_text(turnos: int) -> str:
    """Instrucción de largo según cuántas preguntas lleva la conversación.

    La primera respuesta va corta —la cifra y nada más— y se va permitiendo más
    desarrollo a medida que la persona sigue preguntando: si insiste, quiere
    profundidad; si preguntó una vez, quiere el dato. `turnos` = preguntas del
    usuario en esta conversación (incluida la actual)."""
    if turnos <= 1:
        return ("LARGO DE LA RESPUESTA (estricto): esta es la PRIMERA pregunta. Responde en "
                "1 o 2 frases, máximo 40 palabras. Solo la cifra o el hecho, con su activo, "
                "período y tabla. PROHIBIDO: preámbulos, viñetas, títulos, resumir la pregunta, "
                "explicar cómo lo consultaste o listar lo que podrías analizar. Si hay algo "
                "relevante que quedó fuera, cierra con una frase corta ofreciéndolo "
                "(«¿Lo desgloso por cuenta?»).")
    if turnos <= 3:
        return ("LARGO DE LA RESPUESTA: la conversación ya avanzó. Puedes desarrollar hasta "
                "unas 6 líneas, con una lista corta si aclara de verdad. Sigue partiendo por "
                "la cifra; sin preámbulos ni relleno.")
    return ("LARGO DE LA RESPUESTA: conversación de análisis en curso. Puedes profundizar sin "
            "límite estricto —comparaciones, tabla pequeña, causas— siempre que cada línea "
            "aporte. Nada de relleno ni repetir lo ya dicho.")


def run_agent_sse(unit: str, history: list[dict], vista: dict | None = None,
                  usuario: str | None = None) -> Iterator[str]:
    """`history` = [{'role':'user'|'assistant', 'content': str}, ...] (turnos de texto).
    `vista` = reporte que el usuario tiene en pantalla (unidad, filtros, cifras visibles).
    `usuario` = quién pregunta, para registrar el consumo de tokens (panel Admin).
    Genera eventos SSE: {type:text|tool|done|error}."""
    try:
        if not cat.get_unit(unit):
            yield _sse({"type": "error", "error": f"unidad '{unit}' no existe"})
            return
        client = _client()
    except Exception as e:  # noqa: BLE001
        yield _sse({"type": "error", "error": str(e)})
        return

    # El esquema es estable y va con cache_control (se reusa entre preguntas); la
    # vista cambia en cada pregunta, así que va DESPUÉS del punto de caché.
    system = [
        {"type": "text", "text": SYSTEM_BASE},
        {"type": "text", "text": build_schema_text(unit), "cache_control": {"type": "ephemeral"}},
    ]
    if (vtxt := _vista_text(vista)):
        system.append({"type": "text", "text": vtxt})
    # Turnos de la persona (incluye la pregunta actual): manda el largo permitido y,
    # cuando la conversación se pone densa, sube el esfuerzo de razonamiento.
    turnos = sum(1 for m in history if m.get("role") == "user")
    system.append({"type": "text", "text": _largo_text(turnos)})
    esfuerzo = "medium" if turnos <= 2 else "high"
    messages: list[dict] = [{"role": m["role"], "content": m["content"]} for m in history if m.get("content")]

    uso = {"entrada": 0, "salida": 0, "cache_read": 0, "cache_write": 0, "iteraciones": 0}
    try:
        for _ in range(MAX_ITERS):
            with client.messages.stream(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system,
                tools=TOOLS,
                messages=messages,
                thinking={"type": "adaptive"},
                output_config={"effort": esfuerzo},
            ) as stream:
                for ev in stream:
                    if ev.type == "content_block_delta" and getattr(ev.delta, "type", None) == "text_delta":
                        yield _sse({"type": "text", "text": ev.delta.text})
                final = stream.get_final_message()
            _acumular(uso, final)

            if final.stop_reason != "tool_use":
                break

            messages.append({"role": "assistant", "content": final.content})
            results = []
            for blk in final.content:
                if blk.type != "tool_use":
                    continue
                yield _sse({"type": "tool", "name": blk.name, "input": blk.input})
                fn = DISPATCH.get(blk.name)
                try:
                    if fn is None:
                        raise ValueError(f"herramienta desconocida: {blk.name}")
                    out = fn(unit, **(blk.input or {}))
                    results.append({"type": "tool_result", "tool_use_id": blk.id,
                                    "content": json.dumps(out, ensure_ascii=False, default=str)})
                except Exception as e:  # noqa: BLE001
                    results.append({"type": "tool_result", "tool_use_id": blk.id,
                                    "content": f"Error ejecutando la herramienta: {e}", "is_error": True})
            messages.append({"role": "user", "content": results})
        yield _sse({"type": "done"})
    except Exception as e:  # noqa: BLE001
        yield _sse({"type": "error", "error": f"{type(e).__name__}: {e}"})
    finally:
        # Registrar el gasto aunque el usuario haya cerrado el chat a media respuesta
        # (ahí el generador recibe GeneratorExit y este finally sigue corriendo).
        if uso["iteraciones"]:
            from . import auth
            auth.add_agent_usage(
                usuario or "?", "asistente", unit, MODEL, uso["entrada"], uso["salida"],
                uso["cache_read"], uso["cache_write"], uso["iteraciones"],
                costo_usd(MODEL, uso["entrada"], uso["salida"], uso["cache_read"], uso["cache_write"]))

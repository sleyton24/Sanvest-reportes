"""Auditoría de datos cargados (READ-ONLY): chequeos deterministas que levantan
alertas. NO escribe nada en la BD. Pensado para un botón "Auditar" en Admin.

Chequeos por tabla de HECHOS (las de dimensión/calendario se saltan por nombre):
  - stale        : el último período cargado es demasiado viejo (posible carga olvidada)
  - gaps         : faltan meses en medio de la serie
  - pegados      : el último período tiene EXACTAMENTE los mismos montos que el
                   anterior (posible carga duplicada / dato arrastrado)
  - vacio        : la tabla está vacía o el último período viene todo en cero

Diseño: recorre el catálogo, detecta la columna de período (YYYYMM entero o fecha),
agrega una medida numérica por período y compara. Severidades: error/warn/info.
"""
from __future__ import annotations

import datetime as dt
import re
from typing import Any

from sqlalchemy import inspect as sa_inspect
from sqlalchemy import text
from sqlalchemy.engine import Engine

# Tablas que NO son de hechos (calendarios, fichas, dimensiones): se saltan.
_SKIP = re.compile(
    r"(aux|tiempo|_id$|property_info|tipolog|gp_and_lp|modelo_original|"
    r"renovacion|_original$|date_)",
    re.IGNORECASE,
)

# Candidatos de columna de período: primero el id entero YYYYMM, luego fecha.
_FID_NAMES = ["fechaid", "fechid", "dateid", "fecha id"]
_DATE_NAMES = ["fecha", "date"]


def _norm(s: str) -> str:
    return re.sub(r"\s+", "", str(s)).lower()


def _period_col(cols: list[str]) -> tuple[str | None, str]:
    """Devuelve (columna, tipo) donde tipo = 'fid' (entero YYYYMM) o 'date'."""
    norm = {c: _norm(c) for c in cols}
    for c in cols:
        if norm[c] in _FID_NAMES:
            return c, "fid"
    for c in cols:
        if norm[c] in _DATE_NAMES:
            return c, "date"
    return None, ""


def _to_ym(v: Any, kind: str) -> int | None:
    """Normaliza un valor de período a YYYYMM entero."""
    if v is None:
        return None
    if kind == "fid":
        try:
            n = int(float(v))
            return n if 190000 <= n <= 999912 else None
        except (TypeError, ValueError):
            return None
    s = str(v)[:10]
    m = re.match(r"(\d{4})-(\d{2})", s)
    return int(m.group(1)) * 100 + int(m.group(2)) if m else None


def _numeric_cols(engine: Engine, slug: str, cols_meta: list[dict]) -> list[str]:
    """Columnas numéricas 'de medida' (excluye las de período/id)."""
    out = []
    for c in cols_meta:
        t = str(c.get("type", "")).upper()
        name = c["name"]
        if any(k in _norm(name) for k in _FID_NAMES) or _norm(name) in ("año", "anio", "mes", "year", "month", "orden", "indice", "trimestre"):
            continue
        if any(k in t for k in ("INT", "NUMERIC", "FLOAT", "REAL", "DOUBLE", "DECIMAL")):
            out.append(name)
    return out


def _q(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _alert(sev: str, unit: str, table: str, check: str, msg: str) -> dict:
    return {"severity": sev, "unit": unit, "table": table, "check": check, "message": msg}


def _f(x) -> float:
    try:
        return float(x) if x is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def audit_table(engine: Engine, unit: str, slug: str, today_ym: int) -> list[dict]:
    insp = sa_inspect(engine)
    try:
        cols_meta = insp.get_columns(slug)
    except Exception:  # noqa: BLE001 — tabla no existe en la BD
        return []
    cols = [c["name"] for c in cols_meta]
    pcol, kind = _period_col(cols)
    alerts: list[dict] = []

    with engine.connect() as con:
        total = con.execute(text(f"SELECT COUNT(*) FROM {_q(slug)}")).scalar() or 0
    if total == 0:
        return [_alert("warn", unit, slug, "vacio", "La tabla está vacía (sin filas).")]
    if pcol is None:
        return []  # sin período no aplican los chequeos temporales

    nums = _numeric_cols(engine, slug, cols_meta)
    if not nums:
        return []

    # una fila por período con la SUMA de cada medida; magnitud = suma de |medidas|
    sel = ", ".join(f"SUM({_q(c)}) AS m{i}" for i, c in enumerate(nums))
    with engine.connect() as con:
        rows = con.execute(text(
            f"SELECT {_q(pcol)} AS p, {sel} FROM {_q(slug)} "
            f"GROUP BY {_q(pcol)} ORDER BY {_q(pcol)}")).fetchall()
    # period -> (magnitud, tupla de sumas)
    agg: dict[int, tuple[float, tuple]] = {}
    for r in rows:
        ym = _to_ym(r[0], kind)
        if ym is None:
            continue
        sums = tuple(_f(v) for v in r[1:])
        agg[ym] = (sum(abs(s) for s in sums), sums)

    reported = sorted(ym for ym, (mag, _) in agg.items() if mag > 0.01)
    if not reported:
        return [_alert("warn", unit, slug, "vacio",
                       "La tabla tiene filas pero todas las medidas están en cero.")]
    last_ym = reported[-1]

    # 1) stale: último período REPORTADO con >= 2 meses de atraso
    months_old = (today_ym // 100 - last_ym // 100) * 12 + (today_ym % 100 - last_ym % 100)
    if months_old >= 2:
        alerts.append(_alert("warn", unit, slug, "stale",
                             f"Último dato reportado {last_ym} — {months_old} meses de atraso."))

    # 2) gaps: meses faltantes ENTRE períodos reportados (huecos en medio)
    def _idx(ym): return (ym // 100) * 12 + (ym % 100 - 1)
    rep_set = set(reported)
    first_i, last_i = _idx(reported[0]), _idx(last_ym)
    missing = []
    for k in range(first_i, last_i + 1):
        ym = (k // 12) * 100 + (k % 12 + 1)
        if ym not in rep_set:
            missing.append(f"{k//12}-{k%12+1:02d}")
    if 0 < len(missing) <= 24:
        alerts.append(_alert("warn", unit, slug, "gaps",
                             f"Faltan {len(missing)} mes(es) con dato en la serie: "
                             f"{', '.join(missing[:6])}" + ("…" if len(missing) > 6 else "")))

    # 3) pegados: el último reportado tiene TODAS las medidas idénticas al reportado
    # anterior (duplicado real; exigir coincidencia total baja los falsos positivos).
    # Solo sobre períodos <= hoy: en meses futuros las proyecciones se repiten legítimo.
    if len(reported) >= 2 and last_ym <= today_ym:
        prev_ym = reported[-2]
        cur_sums, prev_sums = agg[last_ym][1], agg[prev_ym][1]
        if len(cur_sums) >= 2 and all(abs(a - b) < 0.01 for a, b in zip(cur_sums, prev_sums)):
            alerts.append(_alert("warn", unit, slug, "pegados",
                                 f"El período {last_ym} tiene TODAS las medidas idénticas a "
                                 f"{prev_ym} — posible carga duplicada / dato pegado."))

    return alerts


# Tablas de hechos a auditar, por unidad (del catálogo, filtrando dimensiones).
def _fact_tables(unit_cat: dict) -> list[str]:
    return [t["slug"] for t in unit_cat.get("tables", []) if not _SKIP.search(t["slug"])]


def run_audit(engine: Engine, units: dict[str, dict], today: dt.date | None = None) -> dict:
    """Corre todos los chequeos y devuelve {generated, alerts:[...], summary}."""
    today = today or dt.date.today()
    today_ym = today.year * 100 + today.month
    alerts: list[dict] = []
    for unit, cat in units.items():
        for slug in _fact_tables(cat):
            try:
                alerts.extend(audit_table(engine, unit, slug, today_ym))
            except Exception as e:  # noqa: BLE001 — un chequeo roto no tumba la auditoría
                alerts.append(_alert("info", unit, slug, "error-chequeo", f"No se pudo auditar: {e}"))
    order = {"error": 0, "warn": 1, "info": 2}
    alerts.sort(key=lambda a: (order.get(a["severity"], 3), a["unit"], a["table"]))
    summary = {
        "errores": sum(1 for a in alerts if a["severity"] == "error"),
        "advertencias": sum(1 for a in alerts if a["severity"] == "warn"),
        "info": sum(1 for a in alerts if a["severity"] == "info"),
    }
    return {"generated": today.isoformat(), "alerts": alerts, "summary": summary}

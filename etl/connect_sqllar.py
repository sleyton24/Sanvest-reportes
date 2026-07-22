# KPIs por edificio de RR (LAR) calculados EN VIVO desde la BD operativa SQLLAR.
#
# El cuadro "KPIs por Edificios" del dashboard RR sale de la tabla plana
# `rr_edificios_lar`, que antes se sembraba a mano (quedaba pegada). Ahora se calcula
# de las tablas operativas de SQLLAR (mismo servidor Postgres, base "SQLLAR"):
#   - deptos = unidades con tipología de departamento (patrón "<n>D<n>B")
#   - ocupación = arrendadas (estado '200') / total deptos
#   - arriendo UF/m² = Σ precio_monto (UF) / Σ superficie útil, sobre las arrendadas
# Verificado: el conteo de deptos reproduce exacto el cuadro (Boldo 126, Brooklyn 478,
# Central 562, …). La ocupación/arriendo salen al valor ACTUAL (por eso difieren del
# último snapshot). Requiere autorización para leer SQLLAR (datos de arrendatarios).
from __future__ import annotations

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from .connect_lar import _read, _write

RR_TABLE = "rr_edificios_lar"
DEPTO_RE = r"[0-9]D[0-9]B"          # tipología de departamento (dormitorios/baños)
ESTADO_ARRENDADO = "200"            # estado de unidad = arrendada/ocupada


def sqllar_engine(bi_engine: Engine) -> Engine:
    """Engine a la base 'SQLLAR' del MISMO servidor Postgres que usa el BI. En dev
    (SQLite) no existe → error claro."""
    url = bi_engine.url
    if not url.get_backend_name().startswith("postgresql"):
        raise ValueError("SQLLAR solo está disponible en el Postgres de producción "
                         "(en dev el BI usa SQLite). Corra esto contra prod.")
    return create_engine(url.set(database="SQLLAR"), pool_pre_ping=True)


def _kpis_from_sqllar(sq: Engine) -> pd.DataFrame:
    """Consulta SQLLAR y devuelve por edificio: deptos, arrendadas, arriendo_uf, sup_util."""
    q = text(f"""
        SELECT pr.nombre AS activo,
               COUNT(*) AS deptos,
               SUM(CASE WHEN un.estado = :arr THEN 1 ELSE 0 END) AS arrendadas,
               SUM(CASE WHEN un.estado = :arr AND un.precio_divisa = 'UF'
                        THEN un.precio_monto ELSE 0 END) AS arriendo_uf,
               SUM(CASE WHEN un.estado = :arr
                        THEN COALESCE(un.superficie_util, 0) ELSE 0 END) AS sup_util
        FROM unidades un
        JOIN propiedades pr ON pr.id = un.propiedad_id
        WHERE pr.propiedad_tipo = 'Multifamily'
          AND un.tipologia ~ :re
        GROUP BY pr.nombre
        ORDER BY pr.nombre
    """)
    with sq.connect() as con:
        rows = con.execute(q, {"arr": ESTADO_ARRENDADO, "re": DEPTO_RE}).fetchall()
    return pd.DataFrame([dict(r._mapping) for r in rows])


def refresh_rr_edificios(bi_engine: Engine, period_fid: int) -> dict:
    """Calcula los KPIs por edificio desde SQLLAR y upsert en rr_edificios_lar para el
    período `period_fid` (AAAAMM, lo pasa el endpoint con el mes vigente)."""
    sq = sqllar_engine(bi_engine)
    src = _kpis_from_sqllar(sq)
    if src.empty:
        raise ValueError("SQLLAR no devolvió edificios (¿propiedades/unidades vacías?)")

    anio, mes = period_fid // 100, period_fid % 100
    fecha = f"{anio}-{mes:02d}-01"
    built = []
    for _, r in src.iterrows():
        deptos = float(r["deptos"] or 0)
        arrend = float(r["arrendadas"] or 0)
        sup = float(r["sup_util"] or 0)
        arr_uf = float(r["arriendo_uf"] or 0)
        built.append({
            "Activo": r["activo"],
            "Fecha ID": period_fid,
            "MES 2": mes,
            "Cantidad Deptos": deptos,
            "Ocupación Deptos (%)": (arrend / deptos) if deptos else 0.0,
            "Arriendo Deptos (UF/m2)(**)": (arr_uf / sup) if sup else 0.0,
            "Superficie Total Ocupada": sup,
        })
    new = pd.DataFrame(built)

    # upsert por (Activo, Fecha ID): conserva el histórico de otros períodos, reemplaza
    # las filas del período recalculado. Rellena las columnas faltantes del destino.
    cur = _read(bi_engine, RR_TABLE)
    for c in cur.columns:
        if c not in new.columns:
            new[c] = None
    new = new[list(cur.columns)]
    key = lambda d: d["Activo"].astype(str) + "|" + pd.to_numeric(d["Fecha ID"], errors="coerce").astype("Int64").astype(str)
    nk = set(key(new))
    keep = cur[~key(cur).isin(nk)]
    merged = pd.concat([keep, new], ignore_index=True)
    _write(bi_engine, RR_TABLE, merged)
    return {RR_TABLE: {
        "filas_actualizadas": len(new), "filas_insertadas": 0,
        "periodo": period_fid, "edificios": len(new),
    }}

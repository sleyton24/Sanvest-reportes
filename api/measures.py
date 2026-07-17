"""Registro de medidas DAX por unidad, replicadas fielmente.

Cada medida declara su expresión DAX original (para trazabilidad) y la expresión
SQL equivalente sobre la tabla plana. Son medidas de **contexto de filtro**
(agregados), así que se calculan al vuelo en la API con los filtros del visual,
NO se precalculan en la tabla plana (ver docs/decisiones.md).
"""
from __future__ import annotations

from .db import build_where, qi, scalar

# unidad -> [ medidas ]
MEASURES: dict[str, list[dict]] = {
    "DV": [
        {
            "id": "ventas_proyeccion_menos_acumuladas",
            "name": "Proyección venta total − Ventas acumuladas",
            "table": "dv_ventas",
            "dax": "MAX('DV Ventas'[PROYECCIÓN_VENTA_TOTAL(UF)]) - "
                   "MAX('DV Ventas'[VENTAS_ACUMULADAS])",
            "sql_expr": f"MAX({qi('PROYECCIÓN_VENTA_TOTAL(UF)')}) - "
                        f"MAX({qi('VENTAS_ACUMULADAS')})",
            "unit_measure": "UF",
        },
        {
            "id": "uso_y_fondo_doble_max_monto",
            "name": "Máx. de Monto + Máx. de Monto (Uso y Fondo)",
            "table": "dv_uso_y_fondo",
            "dax": "MAX('DV Uso y Fondo'[Monto]) + MAX('DV Uso y Fondo'[Monto])",
            "sql_expr": f"(MAX({qi('Monto')}) + MAX({qi('Monto')}))",
            "unit_measure": "UF",
        },
    ],
}


def list_measures(unit: str) -> list[dict]:
    return [{k: m[k] for k in ("id", "name", "table", "dax", "unit_measure")}
            for m in MEASURES.get(unit, [])]


def get_measure(unit: str, measure_id: str) -> dict | None:
    for m in MEASURES.get(unit, []):
        if m["id"] == measure_id:
            return m
    return None


def compute_measure(m: dict, filters: dict) -> float | None:
    where, params = build_where(filters)
    sql = f"SELECT {m['sql_expr']} AS value FROM {qi(m['table'])} {where}"
    val = scalar(sql, params)
    return float(val) if val is not None else None

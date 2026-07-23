"""Reemplaza la tabla `ventas_civitas` (Cuadro de Ventas a la Fecha de Civitas) con la
lista vigente de ventas escrituradas.

Uso: editar la lista VENTAS y correr

    .venv/Scripts/python.exe scripts/set_ventas_civitas.py

Escribe a la BD que apunte el `.env` (PG* = prod). Usa `_write` (DELETE + INSERT, sin
DDL), así que respeta el esquema de la tabla. El dashboard agrupa por Comprador.
"""
from __future__ import annotations

import pandas as pd

from etl.db import get_engine
from etl.connect_lar import _write

TABLE = "ventas_civitas"

# (Comprador, Oficinas, Venta Neta [UF])
VENTAS = [
    ("HAM SpA",                        "704",                 11982.00),
    ("Turismo Siete Hermanos SPA",     "601 y 602",           26910.00),
    ("Inmobiliaria Vitacura 3535 SpA", "604",                 11690.00),
    ("KINGO",                          "1503",                22359.00),
    ("Estac. Bracker",                 "E-213,214 y 215",      1800.00),
    ("Inmob. Lucerna Ltda.",           "501, 502, 503 y 504",  53350.00),
    ("Inv. Los Cactus Ltda",           "702",                 16461.77),
    ("Inv. Victory",                   "1401, 1402, 1403",    53451.00),
    ("Inv. JLC",                       "LC 2",                22300.00),
    ("Inv. Alta",                      "203 y 204",           27750.00),
]


def build() -> pd.DataFrame:
    return pd.DataFrame(VENTAS, columns=["Comprador", "Oficinas", "Venta Neta"])


def main() -> None:
    df = build()
    _write(get_engine(), TABLE, df)
    print(f"{TABLE}: {len(df)} filas, total {df['Venta Neta'].sum():,.2f} UF")


if __name__ == "__main__":
    main()

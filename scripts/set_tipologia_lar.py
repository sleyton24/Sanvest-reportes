"""Reemplaza la tabla `tipologia` (cuadro 'KPIs Grupo' de LAR/RR) con los valores
vigentes del período. El dashboard toma el MAX de "UNIDADES ADMINISTRADAS" por métrica.

Uso: editar FILAS y correr

    .venv/Scripts/python.exe scripts/set_tipologia_lar.py

Escribe a la BD del `.env` (PG* = prod). Usa `_write` (DELETE + INSERT, sin DDL).
OJO: 'UNIDADES ADMINISTRADAS REAL' (total administradas) es INDEPENDIENTE del desglose
por modelo (que puede sumar menos: unidades sin clasificar por tipología).
"""
from __future__ import annotations

import sys
import unicodedata
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from etl.db import get_engine
from etl.connect_lar import _read, _write

TABLE = "tipologia"
ANIO, MES = 2026, 6

# (métrica, unidades) en orden de despliegue
FILAS = [
    ("UNIDADES ADMINISTRADAS BAJO CONTRATO", 2796),
    ("UNIDADES ADMINISTRADAS REAL",          3205),   # total administradas (override)
    ("Studio",                                462),
    ("1D + 1B",                              1624),
    ("1D + 2B",                                 1),
    ("2D + 1B",                                25),
    ("2D + 2B",                               755),
    ("2D + 2B Mariposa",                      250),
    ("3D + 3B",                                25),
    ("EDIFICIOS ADMINISTRADOS",                12),
    ("M² ÚTILES ADMINISTRADOS",            153703),
    ("M² TOTALES ADMINISTRADOS",           167508),
]


def _n(s) -> str:
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip().lower()


def build(cur_cols) -> pd.DataFrame:
    rows = []
    for metrica, val in FILAS:
        rec = {
            _n("Mes Carga"): MES, _n("Año Carga"): ANIO,
            _n("Nombre activo-empresa"): "LARGROUP", _n("Versión"): "REAL ",
            _n("TIPOLOGIAS/MÉTRICA"): metrica, _n("UNIDADES ADMINISTRADAS"): float(val),
            _n("Año información"): ANIO, _n("Mes"): MES,
        }
        rows.append({c: rec.get(_n(c)) for c in cur_cols})
    return pd.DataFrame(rows, columns=list(cur_cols))


def main() -> None:
    eng = get_engine()
    cur = _read(eng, TABLE)
    df = build(cur.columns)
    _write(eng, TABLE, df)
    print(f"{TABLE}: {len(df)} filas (REAL total administradas = 3.205)")


if __name__ == "__main__":
    main()

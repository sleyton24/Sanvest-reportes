"""Puebla `ppto_base` en eerr_civitas = presupuesto FIJO (anual) desde
`CIVITAS.xlsx`, hoja 'EERR CIVITAS', columna ppto (D), por (fechaID, Nivel 1).

`apply_atempora` usa ppto_base para el ppto de los meses CERRADOS (presupuesto),
dejando la proyección del FC solo para los meses futuros. Así el mes recién cerrado
muestra Real vs Presupuesto (y no Real ≈ proyección). Re-correr si cambia el
presupuesto:  .venv/Scripts/python.exe scripts/set_ppto_base_civitas.py

OJO: en la hoja el fechaID viene como TEXTO ('202501'); se castea a int.
"""
from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import openpyxl
from sqlalchemy import text

from etl.db import get_engine

SRC = "Formatos para reportes PBI/CIVITAS.xlsx"
SHEET = "EERR CIVITAS"   # A=Nivel2 B=Nivel1 C=Monto D=ppto ... H=fechaID


def _norm(s) -> str:
    if s is None:
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip().lower()


def _toint(v):
    try:
        return int(str(v).strip())
    except (TypeError, ValueError):
        return None


def main() -> None:
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    rows = list(wb[SHEET].iter_rows(values_only=True))
    wb.close()
    budget: dict[tuple[int, str], float] = {}
    for r in rows[1:]:
        n1 = r[1] if len(r) > 1 else None
        p = r[3] if len(r) > 3 else None
        fid = _toint(r[7] if len(r) > 7 else None)
        if n1 is None or fid is None:
            continue
        budget[(fid, _norm(n1))] = float(p) if isinstance(p, (int, float)) else 0.0

    eng = get_engine()
    with eng.begin() as c:
        c.execute(text('ALTER TABLE eerr_civitas ADD COLUMN IF NOT EXISTS "ppto_base" double precision'))
        n = 0
        for fid, n1 in c.execute(text('SELECT "fechaID","Nivel 1 " FROM eerr_civitas')).fetchall():
            b = budget.get((int(fid), _norm(n1)))
            if b is not None:
                c.execute(text('UPDATE eerr_civitas SET "ppto_base"=:b '
                               'WHERE "fechaID"=:f AND "Nivel 1 "=:n'),
                          {"b": b, "f": int(fid), "n": n1})
                n += 1
    print(f"ppto_base: {n} filas pobladas desde '{SHEET}' ({len(budget)} claves de presupuesto)")


if __name__ == "__main__":
    main()

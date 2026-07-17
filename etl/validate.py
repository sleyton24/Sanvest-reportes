"""Validación de un Excel subido contra la estructura esperada de una unidad.

Verifica, por cada tabla de la unidad, que la hoja exista y que estén las
columnas que el M castea. Se corre ANTES de cargar (Fase 4), para no escribir
tablas planas con estructura inesperada.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from .pipeline import load_config


def validate_unit_file(unit: str, excel_path: str | Path) -> dict:
    cfg = load_config(unit)
    xls = pd.ExcelFile(excel_path, engine="openpyxl")
    sheets = set(xls.sheet_names)

    tables = []
    ok_all = True
    for t in cfg["tables"]:
        sheet = t["sheet"]
        rec: dict = {"table": t["table"], "sheet": sheet,
                     "sheet_found": sheet in sheets, "missing_columns": []}
        if not rec["sheet_found"]:
            rec["ok"] = False
            ok_all = False
            tables.append(rec)
            continue
        promote = t.get("extra_steps", {}).get("promote_headers", True)
        if promote:
            hdr = pd.read_excel(excel_path, sheet_name=sheet, nrows=0, engine="openpyxl")
            cols = {str(c) for c in hdr.columns}
            expected = [c["col"] for c in t["columns"]]
            rec["missing_columns"] = [c for c in expected if c not in cols]
        rec["ok"] = not rec["missing_columns"]
        if not rec["ok"]:
            ok_all = False
        tables.append(rec)

    return {"unit": unit, "ok": ok_all, "sheets_in_file": sorted(sheets),
            "tables": tables}


def expected_structure(unit: str) -> dict:
    cfg = load_config(unit)
    return {
        "unit": unit,
        "tables": [
            {"table": t["table"], "sheet": t["sheet"],
             "columns": [c["col"] for c in t["columns"]]}
            for t in cfg["tables"]
        ],
    }

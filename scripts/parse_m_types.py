"""Extrae, fielmente del M, el mapa columna->tipo y la hoja de cada tabla.

Genera etl/config/<unidad>.json para alimentar el ETL. No inventa tipos:
los toma de Table.TransformColumnTypes del .pbix.

Uso: python scripts/parse_m_types.py <Unidad>   (default: DV)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "docs" / "_raw"
PQ = {r["TableName"]: r.get("Expression", "")
      for r in json.loads((RAW / "power_query.json").read_text(encoding="utf-8"))}

# Tablas por unidad de negocio
UNITS = {
    "DV": [
        "Amortizacion", "DV Construccion", "DV Escrituras", "DV Evolucion de costos",
        "DV Indicadores Financieros", "DV KPIS", "DV Uso y Fondo", "DV Ventas",
        "FECHA AUX", "Financieros Sanvest",
    ],
    "Hotel": [
        "Hotel FULL", "Hotel Graficos", "Hotel Original", "Hotel PPTO", "Hotel Real",
    ],
    # Renta Residencial / LAR — SIN las 2 tablas de SQL (Renovaciones/Resumen LAR)
    "RR": [
        "Indicadores Financieros", "Indicadores Financieros Lar", "RR Edificios LAR",
        "RR KPis", "Real+PPTO+LY", "TIEMPO AUX", "Tipologia",
    ],
    # USA / Bemiston / St Grand / MILA — 2 archivos fuente (BD Gestion USA + USA.xlsx)
    "USA": [
        "Bemiston GP and LP Information", "Bemiston Property Info", "MILA FINAL",
        "Ocupación PPTO", "St Grand", "St grand final (2)", "Tiempo ID",
        "USA Bemiston Tipologias", "USA Bemiston ppto", "USA Graficos",
        "USA KPIS GESTION", "USA Modelo Original Bemiston", "USA Renovación contratos",
        "Uso Y fondo Bemiston", "fINAL beMISTON",
        "DIF I Y II", "DIF II", "KPI", "USA Bemiston (2)",
        "USA DIF I y II ACUMULADOS", "USA EV costos Bemiston",
    ],
    # Construcción (ICEMM) — núcleo Chile (ICEMM.xlsx)
    "ICEMM": ["ICEMM Mensual", "ICEMM YTD", "Flujo"],
    # Atémpora (Civitas) — CIVITAS.xlsx
    "Atempora": ["EERR CIVITAS", "KPIS Atempora", "Detalle arriendo civitas",
                 "Morosidad", "Ventas Civitas", "deuda civitas", "Date AUX Civitas"],
    # Estados Financieros del Grupo — Base balance.xlsx
    "Grupo": ["Balance", "EERR Grupo", "Cascada"],
}

import re as _re
RE_FILE = _re.compile(r'File\.Contents\(\s*"([^"]+)"', _re.I)

# Tipo M -> (pandas dtype, categoria SQL Server). Faithful mapping.
M_TYPE = {
    "Int64.Type": ("Int64", "BIGINT"),
    "type number": ("float64", "FLOAT"),
    "Currency.Type": ("float64", "MONEY"),
    "Percentage.Type": ("float64", "FLOAT"),
    "type date": ("datetime64[ns]", "DATE"),
    "type datetime": ("datetime64[ns]", "DATETIME2"),
    "type datetimezone": ("datetime64[ns]", "DATETIMEOFFSET"),
    "type time": ("object", "TIME"),
    "type text": ("string", "NVARCHAR(255)"),
    "type logical": ("boolean", "BIT"),
    "type any": ("object", "NVARCHAR(255)"),
    "Int8.Type": ("Int64", "SMALLINT"),
}

RE_SHEET = re.compile(r'\[Item="([^"]+)",\s*Kind="Sheet"\]')
# Aislar cada bloque Table.TransformColumnTypes(...) con conteo de llaves
RE_TCT_START = re.compile(r'Table\.TransformColumnTypes\(')
# pares {"col", tipo} donde el tipo NO empieza por comilla (excluye RenameColumns)
RE_PAIR = re.compile(r'\{"((?:[^"]|"")*)",\s*(?!")([^}]+?)\}')


def _tct_blocks(expr: str) -> list[str]:
    """Devuelve el texto de cada llamada Table.TransformColumnTypes(...) por
    balanceo de parentesis (robusto ante el paso final antes de `in`)."""
    blocks = []
    for m in RE_TCT_START.finditer(expr):
        i = m.end()
        depth = 1
        while i < len(expr) and depth:
            c = expr[i]
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
            i += 1
        blocks.append(expr[m.end():i - 1])
    return blocks


def extract(table: str, expr: str) -> dict:
    sheet_m = RE_SHEET.search(expr)
    sheet = sheet_m.group(1) if sheet_m else None
    # Puede haber 2 TransformColumnTypes; unir todos los pares (el ultimo gana)
    pairs: dict[str, str] = {}
    order: list[str] = []
    for block in _tct_blocks(expr):
        for col, mtype in RE_PAIR.findall(block):
            col = col.replace('""', '"')
            mtype = mtype.strip()
            if col not in pairs:
                order.append(col)
            pairs[col] = mtype
    cols = []
    unknown = []
    for col in order:
        mtype = pairs[col]
        mapped = M_TYPE.get(mtype)
        if mapped is None:
            unknown.append((col, mtype))
            mapped = ("object", "NVARCHAR(255)")
        cols.append({"col": col, "m_type": mtype,
                     "pandas": mapped[0], "sql": mapped[1]})
    extra = {
        "filter_rows": "Table.SelectRows" in expr,
        "rename_cols": "Table.RenameColumns" in expr,
        "remove_cols": "Table.RemoveColumns" in expr,
        "remove_error_rows": "Table.RemoveRowsWithErrors" in expr,
        "promote_headers": "Table.PromoteHeaders" in expr,
    }
    fm = RE_FILE.search(expr)
    src_file = fm.group(1).replace("\\", "/").split("/")[-1] if fm else None
    return {"table": table, "sheet": sheet, "file": src_file, "columns": cols,
            "extra_steps": extra, "unknown_types": unknown}


def main() -> int:
    unit = sys.argv[1] if len(sys.argv) > 1 else "DV"
    tables = UNITS[unit]
    out = {"unit": unit, "tables": []}
    for t in tables:
        if t not in PQ:
            print(f"[WARN] {t} no tiene query M")
            continue
        rec = extract(t, PQ[t])
        out["tables"].append(rec)
        flags = [k for k, v in rec["extra_steps"].items()
                 if v and k not in ("promote_headers",)]
        uk = f"  UNKNOWN={rec['unknown_types']}" if rec["unknown_types"] else ""
        print(f"{t:30} hoja='{rec['sheet']}'  cols={len(rec['columns'])}"
              f"  extra={flags}{uk}")

    cfgdir = ROOT / "etl" / "config"
    cfgdir.mkdir(parents=True, exist_ok=True)
    (cfgdir / f"{unit}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nEscrito: {cfgdir / f'{unit}.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

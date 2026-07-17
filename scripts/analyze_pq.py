"""Analiza las queries M extraidas para mapear cada tabla -> fuente(s).

Detecta el tipo de origen (Excel/CSV/Folder/SQL/Web/referencia interna),
los archivos referenciados y las hojas/items, sin interpretar la logica.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "docs" / "_raw"
PQ = json.loads((RAW / "power_query.json").read_text(encoding="utf-8"))

# patrones de origen
RE_FILE = re.compile(r'File\.Contents\(\s*"([^"]+)"', re.I)
RE_PATHLIT = re.compile(r'"([A-Za-z]:\\[^"]+?\.(?:xlsx|xlsm|xls|csv|txt))"', re.I)
RE_URL = re.compile(r'"(https?://[^"]+)"', re.I)
RE_ITEM = re.compile(r'(?:Item|Name)\s*=\s*"([^"]+)"')
RE_SHEETKIND = re.compile(r'Kind\s*=\s*"(Sheet|Table|DefinedName)"', re.I)

SOURCE_FUNCS = [
    "Excel.Workbook", "Excel.CurrentWorkbook", "Csv.Document",
    "Folder.Files", "Folder.Contents", "Sql.Database", "Web.Contents",
    "SharePoint.Files", "SharePoint.Contents", "Json.Document",
]

rows = []
internal_refs = defaultdict(list)
all_tables = {r["TableName"] for r in PQ}

for r in PQ:
    name = r["TableName"]
    expr = r.get("Expression") or ""
    funcs = [f for f in SOURCE_FUNCS if f in expr]
    files = sorted(set(RE_FILE.findall(expr)) | set(RE_PATHLIT.findall(expr)))
    urls = sorted(set(RE_URL.findall(expr)))
    items = sorted(set(RE_ITEM.findall(expr)))
    # referencias a otras tablas del modelo (p.ej. Source = #"Otra Tabla" o nombre directo)
    refs = []
    for other in all_tables:
        if other == name:
            continue
        # M referencia tablas como #"Nombre con espacios" o Nombre
        if re.search(r'#"' + re.escape(other) + r'"', expr) or \
           re.search(r'(?<![\w"])' + re.escape(other) + r'(?![\w"])', expr):
            refs.append(other)
    rows.append({
        "table": name,
        "source_funcs": funcs,
        "files": files,
        "urls": urls,
        "items_sheets": items,
        "internal_refs": sorted(set(refs)),
        "expr_len": len(expr),
    })

# salida resumida
print(f"{'TABLA':38} | ORIGEN | ARCHIVO / REF")
print("-" * 110)
for r in sorted(rows, key=lambda x: x["table"].lower()):
    origin = ",".join(f.replace("Excel.", "").replace("Csv.", "")
                       for f in r["source_funcs"]) or "—"
    detail = ""
    if r["files"]:
        detail = " ; ".join(Path(f).name for f in r["files"])
    elif r["urls"]:
        detail = r["urls"][0][:60]
    elif r["internal_refs"] and not r["source_funcs"]:
        detail = "ref-> " + ", ".join(r["internal_refs"][:4])
    elif "Excel.CurrentWorkbook" in r["source_funcs"]:
        detail = "(workbook actual del .pbix)"
    print(f"{r['table'][:38]:38} | {origin[:18]:18} | {detail[:60]}")

(RAW / "pq_sources.json").write_text(
    json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(f"\nEscrito: {RAW / 'pq_sources.json'}")

# Agrupar por archivo fuente
by_file = defaultdict(list)
for r in rows:
    if r["files"]:
        for f in r["files"]:
            by_file[Path(f).name].append(r["table"])
    elif not r["source_funcs"] and r["internal_refs"]:
        by_file["(tabla derivada / sin origen externo)"].append(r["table"])
    elif "Excel.CurrentWorkbook" in r["source_funcs"]:
        by_file["(Excel.CurrentWorkbook)"].append(r["table"])
    else:
        by_file["(origen no detectado)"].append(r["table"])

print("\n===== POR ARCHIVO FUENTE =====")
for f, tbls in sorted(by_file.items()):
    print(f"\n[{f}]  ({len(tbls)} tablas)")
    for t in sorted(tbls):
        print(f"    - {t}")

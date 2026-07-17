"""Genera un resumen compacto por tabla: archivo, hoja, pasos M, #cols, #filas."""
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "docs" / "_raw"
PQ = {r["TableName"]: r.get("Expression", "") for r in
      json.loads((RAW / "power_query.json").read_text(encoding="utf-8"))}
SRC = {r["table"]: r for r in json.loads((RAW / "pq_sources.json").read_text(encoding="utf-8"))}
ROWS = json.loads((RAW / "row_counts.json").read_text(encoding="utf-8"))
SUM = json.loads((RAW / "model_summary.json").read_text(encoding="utf-8"))
schema = SUM.get("schema") or []
ncols = defaultdict(int)
for s in schema:
    ncols[s.get("TableName")] += 1

# Mapa funcion M -> etiqueta corta
STEP_MAP = [
    ("Table.PromoteHeaders", "promote-headers"),
    ("Table.TransformColumnTypes", "cast-types"),
    ("Table.RenameColumns", "rename-cols"),
    ("Table.RemoveColumns", "drop-cols"),
    ("Table.SelectColumns", "select-cols"),
    ("Table.RemoveRowsWithErrors", "drop-error-rows"),
    ("Table.SelectRows", "filter-rows"),
    ("Table.AddColumn", "add-col"),
    ("Table.ReplaceValue", "replace-value"),
    ("Table.Group", "group-by"),
    ("Table.UnpivotOtherColumns", "unpivot"),
    ("Table.Pivot", "pivot"),
    ("Table.Join", "join"),
    ("Table.NestedJoin", "merge"),
    ("Table.Combine", "append"),
    ("Table.FillDown", "fill-down"),
    ("Table.FillUp", "fill-up"),
    ("Table.Distinct", "distinct"),
    ("Table.Sort", "sort"),
    ("Table.SplitColumn", "split-col"),
    ("Table.Skip", "skip-rows"),
    ("Table.FirstN", "take-first"),
    ("Table.ExpandTableColumn", "expand"),
    ("Table.AddIndexColumn", "add-index"),
    ("Csv.Document", "csv"),
    ("#\"Changed Type", "cast-types"),
]

records = []
for name, expr in sorted(PQ.items(), key=lambda x: x[0].lower()):
    steps = []
    for fn, label in STEP_MAP:
        c = expr.count(fn)
        if c:
            steps.append(f"{label}x{c}" if c > 1 else label)
    sheet = ""
    s = SRC.get(name, {})
    if s.get("items_sheets"):
        sheet = s["items_sheets"][0]
    files = s.get("files") or []
    fbase = Path(files[0]).name if files else (
        "SQL:SQLLAR" if "Sql.Database" in expr else "?")
    records.append({
        "table": name, "file": fbase, "sheet": sheet,
        "rows": ROWS.get(name), "cols": ncols.get(name, 0),
        "steps": steps,
    })

(RAW / "table_steps.json").write_text(
    json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

# distintos pasos usados en todo el modelo
allsteps = defaultdict(int)
for r in records:
    for s in r["steps"]:
        allsteps[re.sub(r'x\d+$', '', s)] += 1
print("Pasos M usados en el modelo (frecuencia de tablas):")
for s, c in sorted(allsteps.items(), key=lambda x: -x[1]):
    print(f"  {c:3}  {s}")
print(f"\nTotal tablas con M: {len(records)}")
print(f"Escrito: {RAW/'table_steps.json'}")

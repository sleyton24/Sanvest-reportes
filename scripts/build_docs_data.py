"""Prepara datos limpios para modelo.md / mapa_etl.md y guarda M por tabla."""
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "docs" / "_raw"
SUM = json.loads((RAW / "model_summary.json").read_text(encoding="utf-8"))
PQ = json.loads((RAW / "power_query.json").read_text(encoding="utf-8"))
ROWS = json.loads((RAW / "row_counts.json").read_text(encoding="utf-8"))

# Guardar cada query M en su propio archivo .m (legible)
QDIR = ROOT / "docs" / "queries_m"
QDIR.mkdir(parents=True, exist_ok=True)
for r in PQ:
    safe = re.sub(r'[^\w\-. ]', '_', r["TableName"]).strip()
    (QDIR / f"{safe}.m").write_text(r.get("Expression", ""), encoding="utf-8")
print(f"Guardadas {len(PQ)} queries M en {QDIR}")

# DAX measures
dax = SUM.get("dax_measures") or []
print(f"\n===== {len(dax)} MEDIDAS DAX =====")
for m in dax:
    tn = m.get("TableName", "?")
    nm = m.get("Name", "?")
    expr = (m.get("Expression") or "").replace("\n", " ")[:90]
    print(f"  [{tn}] {nm} :: {expr}")

# Schema agrupado por tabla (solo tablas con M, ignorar LocalDateTable)
schema = SUM.get("schema") or []
by_table = defaultdict(list)
for s in schema:
    by_table[s.get("TableName")].append((s.get("ColumnName"), s.get("PandasDataType") or s.get("DataType")))

real_tables = {r["TableName"] for r in PQ}
print(f"\n===== COLUMNAS por tabla real (con M) =====")
for t in sorted(real_tables, key=str.lower):
    cols = by_table.get(t, [])
    rc = ROWS.get(t)
    print(f"\n[{t}]  filas={rc}  columnas={len(cols)}")
    for cn, dt in cols:
        print(f"    - {cn} :: {dt}")

# Relationships
rels = SUM.get("relationships") or []
print(f"\n===== {len(rels)} RELACIONES =====")
for r in rels:
    f = f"{r.get('FromTableName')}[{r.get('FromColumnName')}]"
    t = f"{r.get('ToTableName')}[{r.get('ToColumnName')}]"
    active = r.get("IsActive")
    print(f"  {f}  ->  {t}   activa={active}")

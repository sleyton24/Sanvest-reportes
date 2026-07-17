"""Vuelca queries M completas seleccionadas + paths completos y conexiones SQL."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "docs" / "_raw"
PQ = {r["TableName"]: r.get("Expression", "") for r in
      json.loads((RAW / "power_query.json").read_text(encoding="utf-8"))}

# 1) Paths completos de File.Contents y conexiones Sql.Database en todo el modelo
print("===== PATHS / CONEXIONES (todas las queries) =====")
seen_paths = set()
for name, expr in PQ.items():
    for m in re.findall(r'File\.Contents\(\s*"([^"]+)"', expr):
        seen_paths.add(("FILE", m))
    for m in re.findall(r'Sql\.Database\(\s*"([^"]+)"\s*,\s*"([^"]+)"', expr):
        seen_paths.add(("SQL", f"server={m[0]}  db={m[1]}"))
    for m in re.findall(r'Sql\.Database\(\s*"([^"]+)"\s*\)', expr):
        seen_paths.add(("SQL", f"server={m}"))
for kind, p in sorted(seen_paths):
    print(f"  [{kind}] {p}")

# 2) Queries completas de muestra (SQL + 1 Excel representativa por archivo grande)
SAMPLES = ["Renovaciones LAR", "Resumen LAR", "RR Edificios LAR",
           "USA KPIS GESTION", "EERR CIVITAS", "DV Ventas"]
for name in SAMPLES:
    print("\n" + "=" * 90)
    print(f"QUERY: {name}")
    print("=" * 90)
    print(PQ.get(name, "<<no existe>>"))

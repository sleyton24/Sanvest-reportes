"""Diagnóstico fino de una tabla: alinea ETL vs modelo por clave y muestra diffs."""
import sys
from pathlib import Path

import pandas as pd
from pbixray import PBIXRay

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from etl.pipeline import load_config, default_source  # noqa: E402
from etl.loader import load_table  # noqa: E402

pd.set_option("display.max_columns", 40)
pd.set_option("display.width", 200)

ROOT = Path(__file__).resolve().parent.parent
PBIX = ROOT / "Sanvest BI 24.0122026.pbix"

unit = sys.argv[1] if len(sys.argv) > 1 else "DV"
target = sys.argv[2] if len(sys.argv) > 2 else "DV Indicadores Financieros"

cfg = load_config(unit)
tcfg = next(t for t in cfg["tables"] if t["table"] == target)
etl = load_table(default_source(unit), tcfg)
model = PBIXRay(str(PBIX)).get_table(target)

print(f"### {target}")
print(f"ETL   : {etl.shape}  cols={list(etl.columns)}")
print(f"MODELO: {model.shape}  cols={list(model.columns)}")
print("\n-- dtypes ETL --");  print(etl.dtypes)
print("\n-- dtypes MODELO --"); print(model.dtypes)

# columnas en común y exclusivas
ec, mc = list(etl.columns), list(model.columns)
print("\nSolo ETL :", [c for c in ec if c not in mc])
print("Solo MODELO:", [c for c in mc if c not in ec])

# muestra primeras filas crudas de ambos
print("\n-- ETL head(3) --");   print(etl.head(3).to_string())
print("\n-- MODELO head(3) --"); print(model.head(3).to_string())

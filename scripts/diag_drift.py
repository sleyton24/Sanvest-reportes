"""Verifica si la diferencia ETL vs modelo es DRIFT de datos (Excel != snapshot)
o un bug de ETL. Alinea por clave de negocio y compara columnas estables.

Las columnas-clave se eligen por POSICIÓN (índices) para no teclear acentos:
    python scripts/diag_drift.py "Tabla" 1,0,3,4
"""
import sys
from pathlib import Path

import pandas as pd
from pbixray import PBIXRay

# forzar UTF-8 en consola Windows (cp1252) para no romper con acentos
sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from etl.pipeline import load_config, default_source  # noqa: E402
from etl.loader import load_table  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PBIX = ROOT / "Sanvest BI 24.0122026.pbix"

unit, target = "DV", sys.argv[1] if len(sys.argv) > 1 else "DV Indicadores Financieros"
KEY_IDX = [int(x) for x in sys.argv[2].split(",")] if len(sys.argv) > 2 else [1, 0, 3, 4]

cfg = load_config(unit)
tcfg = next(t for t in cfg["tables"] if t["table"] == target)
etl = load_table(default_source(unit), tcfg)
model = PBIXRay(str(PBIX)).get_table(target)

# claves por posición sobre las columnas del ETL (deben existir en el modelo)
KEYS = [list(etl.columns)[i] for i in KEY_IDX]
print(f"### {target}  ETL={etl.shape} MODEL={model.shape}")
print(f"keys = {KEYS}")
print(f"model tiene esas cols: {[k in model.columns for k in KEYS]}")

def keyset(df):
    return set(tuple(str(r[k]).strip() for k in KEYS) for _, r in df.iterrows())

ke, km = keyset(etl), keyset(model)
print(f"\nClaves ETL: {len(ke)}  |  Claves MODELO: {len(km)}")
print(f"Claves en ambos      : {len(ke & km)}")
print(f"Claves solo en ETL   : {len(ke - km)}")
print(f"Claves solo en MODELO: {len(km - ke)}")

print("\nEjemplos clave SOLO en ETL (rows nuevas en Excel):")
for k in list(ke - km)[:6]:
    print("   +", k)
print("\nEjemplos clave SOLO en MODELO (rows que ya no están en Excel):")
for k in list(km - ke)[:6]:
    print("   -", k)

# Para claves comunes, comparar columnas estables (las casteadas a número)
stable = [c["col"] for c in tcfg["columns"]
          if c["pandas"] in ("float64", "Int64") and c["col"] in model.columns]
print(f"\nComparando {len(stable)} columnas numéricas estables en claves comunes...")
def idx(df):
    df = df.copy()
    df["_k"] = [tuple(str(r[k]).strip() for k in KEYS) for _, r in df.iterrows()]
    return df.drop_duplicates("_k").set_index("_k")
ei, mi = idx(etl), idx(model)
common_keys = list(ke & km)
mismatch_cols = {}
for c in stable:
    n = 0
    for k in common_keys:
        try:
            a = float(ei.at[k, c]); b = float(mi.at[k, c])
        except (KeyError, TypeError, ValueError):
            continue
        if pd.isna(a) and pd.isna(b):
            continue
        if abs((a or 0) - (b or 0)) > 1e-4:
            n += 1
    if n:
        mismatch_cols[c] = n
print("Columnas numéricas con diferencias en claves comunes:",
      mismatch_cols or "NINGUNA (las columnas estables cuadran)")

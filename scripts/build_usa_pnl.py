"""Homologa las 3 propiedades USA a un esquema P&L único: tabla `usa_pnl`.

Bemiston/Mila: sección = Nivel 3; St Grand: sección = Nivel 2 (excluye subtotales
en MAYÚSCULA). Columnas comunes: Activo, Seccion, Categoria, Linea, Real, Ppto,
YTD, YTD_Ppto, Anio, Mes, FechaID. También registra usa_pnl en el catálogo USA.
"""
import json
import sqlite3
import sys
from pathlib import Path

import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "db" / "sanvest_bi_dev.sqlite"
con = sqlite3.connect(DB)


def col(df, *names):
    for n in names:
        if n in df.columns:
            return df[n]
    return pd.Series([None] * len(df))


def norm(table, activo, sec_col):
    df = pd.read_sql_query(f'SELECT * FROM {table}', con)
    out = pd.DataFrame({
        "Activo": activo,
        "Seccion": col(df, sec_col).astype("string").str.strip().str.upper(),
        "Categoria": col(df, "Nivel 2", "Nivel 2 ").astype("string").str.strip(),
        "Linea": col(df, "Nivel 1").astype("string").str.strip(),
        "Real": pd.to_numeric(col(df, "Real"), errors="coerce"),
        "Ppto": pd.to_numeric(col(df, "Monto 2", "Monto AUX"), errors="coerce"),
        "YTD": pd.to_numeric(col(df, "YTD"), errors="coerce"),
        "YTD_Ppto": pd.to_numeric(col(df, "YTD PPTO"), errors="coerce"),
        "Anio": pd.to_numeric(col(df, "Año"), errors="coerce").astype("Int64"),
        "Mes": pd.to_numeric(col(df, "Mes"), errors="coerce").astype("Int64"),
        "FechaID": pd.to_numeric(col(df, "Fecha ID ", "Fecha ID"), errors="coerce").astype("Int64"),
    })
    return out


bem = norm("final_bemiston", "Bemiston", "Nivel 3")
mila = norm("mila_final", "Mila", "Nivel 3")
stg = norm("st_grand_final_2", "St Grand", "Nivel 2")
# St Grand: excluir subtotales (Linea en MAYÚSCULA) para no duplicar
stg = stg[stg["Linea"].notna() & (stg["Linea"] != stg["Linea"].str.upper())]

usa = pd.concat([bem, mila, stg], ignore_index=True)
# normalizar secciones a 3 estándar
usa = usa[usa["Seccion"].notna() & (usa["Seccion"] != "")]
usa["Seccion"] = usa["Seccion"].replace({"REVENUE ": "REVENUE"})
usa.to_sql("usa_pnl", con, if_exists="replace", index=False)
print(f"usa_pnl creada: {len(usa)} filas")
for a in usa["Activo"].unique():
    sub = usa[usa["Activo"] == a]
    print(f"  {a}: {len(sub)} filas | secciones={sorted(sub['Seccion'].dropna().unique())}")
con.close()

# registrar usa_pnl en el catálogo USA
cat_path = ROOT / "api" / "catalog" / "USA.json"
cat = json.loads(cat_path.read_text(encoding="utf-8"))
cols = [
    {"name": "Activo", "dtype": "string", "role": "dimension"},
    {"name": "Seccion", "dtype": "string", "role": "dimension"},
    {"name": "Categoria", "dtype": "string", "role": "dimension"},
    {"name": "Linea", "dtype": "string", "role": "dimension"},
    {"name": "Real", "dtype": "float64", "role": "measure"},
    {"name": "Ppto", "dtype": "float64", "role": "measure"},
    {"name": "YTD", "dtype": "float64", "role": "measure"},
    {"name": "YTD_Ppto", "dtype": "float64", "role": "measure"},
    {"name": "Anio", "dtype": "Int64", "role": "dimension"},
    {"name": "Mes", "dtype": "Int64", "role": "dimension"},
    {"name": "FechaID", "dtype": "Int64", "role": "dimension"},
]
cat["tables"] = [t for t in cat["tables"] if t["slug"] != "usa_pnl"]
cat["tables"].append({"model_name": "USA P&L (homologado)", "slug": "usa_pnl",
                      "rows": len(usa), "columns": cols,
                      "dimensions": [c["name"] for c in cols if c["role"] == "dimension"],
                      "measures": [c["name"] for c in cols if c["role"] == "measure"],
                      "dates": []})
cat_path.write_text(json.dumps(cat, ensure_ascii=False, indent=2), encoding="utf-8")
print("usa_pnl registrada en api/catalog/USA.json")

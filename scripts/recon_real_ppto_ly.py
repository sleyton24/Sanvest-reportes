"""Reconcilia assemble_real_ppto_ly (núcleo, columnas R/p del informe) vs panel."""
import sqlite3
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8")
from etl.informes_lar import extract_facts, assemble_real_ppto_ly, RPL_COLS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
INF = ROOT / "2026" / "1. ENERO 2026" / "LAR Group"
SRC = [(INF / "Informe de Gestión SOHO 2025_Diciembre (SV).xlsx", "SOHO"),
       (INF / "Informe de Gestión PARK 2025_diciembre (SV).xlsx", "PARK")]

facts = pd.concat([extract_facts(p, a) for p, a in SRC], ignore_index=True)
wide = assemble_real_ppto_ly(facts)

con = sqlite3.connect(ROOT / "db" / "sanvest_bi_dev.sqlite")
panel = pd.read_sql_query('SELECT * FROM real_ppto_ly', con)
con.close()
panel = panel[panel["Activo"].isin(["SOHO", "PARK"])]
pidx = {(r["Activo"], int(r["Fecha ID"])): r for _, r in panel.iterrows() if pd.notna(r["Fecha ID"])}

# columnas a reconciliar: las R y p mapeadas
check_cols = []
for m, (rc, pc) in RPL_COLS.items():
    check_cols += [rc, pc]

print(f"Filas ensambladas: {len(wide)}  | columnas reconciliadas: {len(check_cols)}")
print(f"{'Columna':40} {'match/comp':>12}")
print("-" * 56)
TOLABS = 0.5  # UF
for col in check_cols:
    ok = cmp = 0
    ex = None
    for _, r in wide.iterrows():
        k = (r["Activo"], int(r["Fecha ID"]))
        if k not in pidx or col not in panel.columns:
            continue
        mine, theirs = r.get(col), pidx[k][col]
        if mine is None or pd.isna(mine) or pd.isna(theirs):
            continue
        cmp += 1
        tol = TOLABS if "UF" in col and "/" not in col and "%" not in col else 0.01
        if abs(float(mine) - float(theirs)) <= tol:
            ok += 1
        elif ex is None:
            ex = f"{k} yo={float(mine):.3f} panel={float(theirs):.3f}"
    flag = "" if cmp and ok == cmp else "  <==" + (f" {ex}" if ex else " sin datos comparables")
    print(f"{col:40} {f'{ok}/{cmp}':>12}{flag}")

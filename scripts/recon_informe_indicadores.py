"""Reconciliа el transform Informe->Indicadores Financieros contra la tabla del panel."""
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8")
from etl.informes_lar import informe_to_indicadores  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
INF = ROOT / "2026" / "1. ENERO 2026" / "LAR Group"
SOURCES = [
    (INF / "Informe de Gestión SOHO 2025_Diciembre (SV).xlsx", "SOHO"),
    (INF / "Informe de Gestión PARK 2025_diciembre (SV).xlsx", "PARK"),
]

con = sqlite3.connect(ROOT / "db" / "sanvest_bi_dev.sqlite")
con.row_factory = sqlite3.Row
# tabla objetivo (Real/Ppto por activo,item,fechaID)
tgt = {}
for r in con.execute('SELECT "Nombre activo",Item,FechaID,"Versión_Real","Versión_Ppto" '
                      'FROM indicadores_financieros'):
    tgt[(r["Nombre activo"], r["Item"], r["FechaID"])] = (r["Versión_Real"], r["Versión_Ppto"])

TOL = 0.5  # UF
for path, activo in SOURCES:
    df = informe_to_indicadores(path, activo)
    print(f"\n### {activo}: {path.name}  -> {len(df)} filas (item x mes)")
    n_ok = n_cmp = n_nokey = 0
    ex = []
    for _, row in df.iterrows():
        k = (activo, row["Item"], int(row["FechaID"]))
        if k not in tgt:
            n_nokey += 1
            continue
        tr, tp = tgt[k]
        for label, mine, theirs in (("R", row.get("Versión_Real"), tr),
                                     ("P", row.get("Versión_Ppto"), tp)):
            if mine is None or theirs is None:
                continue
            n_cmp += 1
            if abs(float(mine) - float(theirs)) <= TOL:
                n_ok += 1
            elif len(ex) < 6:
                ex.append(f"{row['Item']} {int(row['FechaID'])} {label}: yo={float(mine):.2f} panel={float(theirs):.2f}")
    print(f"   comparaciones (Real+Ppto en meses comunes): {n_ok}/{n_cmp} dentro de ±{TOL} UF"
          f"  | claves del informe sin contraparte en panel: {n_nokey}")
    for e in ex:
        print("     ✗", e)
con.close()

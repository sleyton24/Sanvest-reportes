"""Prueba upsert con histórico: aplica informe Dic-2025 y verifica conservación."""
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8")
from etl.db import get_engine  # noqa: E402
from etl.connect_lar import apply_informes  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "db" / "sanvest_bi_dev.sqlite"
INF = ROOT / "2026" / "1. ENERO 2026" / "LAR Group"
SPECS = [(INF / "Informe de Gestión SOHO 2025_Diciembre (SV).xlsx", "SOHO"),
         (INF / "Informe de Gestión PARK 2025_diciembre (SV).xlsx", "PARK")]


def snap():
    c = sqlite3.connect(DB)
    q = c.execute
    hist_ind = q("SELECT COUNT(*) FROM indicadores_financieros WHERE FechaID<202501").fetchone()[0]
    tot_ind = q("SELECT COUNT(*) FROM indicadores_financieros").fetchone()[0]
    soho2020 = q("SELECT \"Versión_Real\" FROM indicadores_financieros WHERE \"Nombre activo\"='SOHO' AND Item='Ingresos totales UF' AND FechaID=202001").fetchone()
    soho2508 = q("SELECT \"Versión_Real\" FROM indicadores_financieros WHERE \"Nombre activo\"='SOHO' AND Item='Ingresos totales UF' AND FechaID=202508").fetchone()
    rpl_hist = q("SELECT COUNT(*) FROM real_ppto_ly WHERE \"Fecha ID\"<202501").fetchone()[0]
    c.close()
    return dict(hist_ind=hist_ind, tot_ind=tot_ind,
                soho2020=soho2020[0] if soho2020 else None,
                soho2508=soho2508[0] if soho2508 else None, rpl_hist=rpl_hist)


b = snap()
print("ANTES :", b)
res = apply_informes(get_engine(), SPECS)
print("\nResultado upsert:", res)
a = snap()
print("\nDESPUÉS:", a)

print("\n=== Verificaciones ===")
print(f"  Histórico Indicadores (FechaID<202501) intacto: {b['hist_ind']==a['hist_ind']} ({b['hist_ind']}->{a['hist_ind']})")
print(f"  SOHO 2020-01 Ingresos R sin cambio:              {b['soho2020']==a['soho2020']} ({b['soho2020']})")
print(f"  Histórico Real+PPTO+LY (Fecha ID<202501) intacto:{b['rpl_hist']==a['rpl_hist']} ({b['rpl_hist']}->{a['rpl_hist']})")
print(f"  SOHO 2025-08 Ingresos R actualizado a ~2077.13:  {abs((a['soho2508'] or 0)-2077.13)<0.5} (antes={b['soho2508']:.2f} -> ahora={a['soho2508']:.2f})")

"""Backfill EBITDA/CUOTA BANCO del hotel en hotel_real (ago-2026).

Contexto: la ETL del CCPP no calculaba el ratio (quedó en el Excel legado BD
HOTEL .xlsx) y la columna quedó NULL desde may-2026 pese a que los CCPP de
may/jun/jul están cargados. Además la semilla copió la columna LY de 2025 en
2026, dejando los ratios de 2024 como "año anterior" de 2026.

Este script (one-off, idempotente):
  1. Rellena "EBITDA/CUOTA BANCO" 202605-202607 SOLO donde está NULL, calculado
     desde hotel_pnl (refleja el último CCPP subido):
         ratio = EBITDA / -(Intereses Crédito + Amortización de Capital)
  2. Corrige "EBITDA/CUOTA BANCO LY" de 202601-202612 = ratio propio de 2025.

Desde la próxima carga de CCPP el cálculo lo hace la ETL (etl/hotel_ccpp.py).

Uso:
    python scripts/backfill_hotel_ratio.py            # aplica y verifica
    python scripts/backfill_hotel_ratio.py --dry-run  # solo muestra qué haría
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from etl.db import get_engine, load_dotenv  # noqa: E402

load_dotenv()


def main() -> None:
    ap = argparse.ArgumentParser(description="Backfill EBITDA/Cuota Banco hotel.")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    eng = get_engine()

    pnl = pd.read_sql_query(
        'SELECT "Nivel 2","FechaID","Versión_Real" FROM hotel_pnl '
        "WHERE \"FechaID\" BETWEEN 202605 AND 202607 AND \"Nivel 2\" IN "
        "('EBITDA','Intereses Crédito','Amortización de Capital')", eng)
    piv = pnl.pivot_table(index="FechaID", columns="Nivel 2",
                          values="Versión_Real", aggfunc="first")
    ratios = {}
    for fid, r in piv.iterrows():
        cuota = -(r["Intereses Crédito"] + r["Amortización de Capital"])
        if pd.notna(r["EBITDA"]) and cuota > 0:
            ratios[int(fid)] = float(r["EBITDA"] / cuota)
            print(f"  {fid}: EBITDA {r['EBITDA']:.2f} / cuota {cuota:.2f} "
                  f"= {ratios[int(fid)]:.4f}")

    h = pd.read_sql_query(
        'SELECT "FechaID","EBITDA/CUOTA BANCO" AS ratio FROM hotel_real '
        "WHERE \"FechaID\" BETWEEN 202501 AND 202512", eng)
    r2025 = dict(zip(h["FechaID"].astype(int), h["ratio"]))
    ly_fix = {fid: float(r2025[fid - 100]) for fid in range(202601, 202613)
              if pd.notna(r2025.get(fid - 100))}
    print("  LY 2026 <- ratio 2025:",
          {k: round(v, 4) for k, v in ly_fix.items()})
    if args.dry_run:
        print("(dry-run) no se escribió nada")
        return

    with eng.begin() as con:
        for fid, v in ratios.items():
            con.exec_driver_sql(
                'UPDATE hotel_real SET "EBITDA/CUOTA BANCO" = %s '
                'WHERE "FechaID" = %s AND "EBITDA/CUOTA BANCO" IS NULL', (v, fid))
        for fid, v in ly_fix.items():
            con.exec_driver_sql(
                'UPDATE hotel_real SET "EBITDA/CUOTA BANCO LY" = %s '
                'WHERE "FechaID" = %s', (v, fid))

    out = pd.read_sql_query(
        'SELECT "FechaID","EBITDA/CUOTA BANCO" AS ratio,'
        '"EBITDA/CUOTA BANCO LY" AS ly FROM hotel_real '
        "WHERE \"FechaID\" BETWEEN 202601 AND 202612 ORDER BY \"FechaID\"", eng)
    print(out.to_string(index=False))
    print("Listo. Recarga el dashboard del hotel para ver la serie completa.")


if __name__ == "__main__":
    main()

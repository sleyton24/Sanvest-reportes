"""Repara columnas LY (Real mes-12) congeladas en real_ppto_ly (RR).

"Gasto comun LY" y "Tarifa LY" no estaban en LY_COLS del ETL (fix de raíz en
etl/informes_lar.py), así que quedaron con la semilla histórica: SOHO tiene
"Gasto comun LY" en 0 desde feb-2025 aunque el Real del año anterior existe.
Rellena SOLO celdas 0/NULL con el Real del mismo activo en FechaID-100.

Uso:  python scripts/fix_rr_ly.py           (dry-run)
      python scripts/fix_rr_ly.py --apply   (escribe los UPDATE)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from sqlalchemy import text

from etl.db import get_engine

# LY <- columna Real mensual de la misma métrica
LY_FROM_REAL = {
    "Gasto comun LY": "Gastos Comunes (UF/M2) R",
    "Tarifa LY": "UF/M2_DEPARTAMENTOS R ",
}


def qi(col: str) -> str:
    return '"' + col.replace('"', '""') + '"'


def main(apply: bool) -> None:
    eng = get_engine()
    print(f"engine: {eng.url.render_as_string(hide_password=True)}")
    cols = ["Activo", "Fecha ID"] + list(LY_FROM_REAL) + list(LY_FROM_REAL.values())
    df = pd.read_sql_query(
        f'SELECT {", ".join(qi(c) for c in cols)} FROM "real_ppto_ly"', eng)

    real = {}  # (activo, fid, colReal) -> valor
    for _, r in df.iterrows():
        for rc in LY_FROM_REAL.values():
            v = r[rc]
            if pd.notna(v) and v != 0:
                real[(str(r["Activo"]), int(r["Fecha ID"]), rc)] = float(v)

    updates: dict[tuple, dict[str, float]] = {}
    for _, r in df.iterrows():
        act, fid = str(r["Activo"]), int(r["Fecha ID"])
        for ly, rc in LY_FROM_REAL.items():
            stored = r[ly]
            if pd.notna(stored) and stored != 0:
                continue
            prev = real.get((act, fid - 100, rc))
            if prev is not None:
                updates.setdefault((act, fid), {})[ly] = prev

    if not updates:
        print("Nada que reparar.")
        return
    print(f"{len(updates)} filas con celdas LY por rellenar:")
    for (act, fid), vals in sorted(updates.items()):
        print(f"  {act} {fid}: " + ", ".join(f"{c}={v:.4f}" for c, v in vals.items()))
    if not apply:
        print("\nDry-run (no se escribió nada). Ejecutar con --apply para aplicar.")
        return
    with eng.begin() as con:
        for (act, fid), vals in updates.items():
            sets = ", ".join(f"{qi(c)} = :v{j}" for j, c in enumerate(vals))
            params = {f"v{j}": v for j, v in enumerate(vals.values())}
            params.update({"act": act, "fid": fid})
            con.execute(text(
                f'UPDATE "real_ppto_ly" SET {sets} '
                f'WHERE "Activo" = :act AND "Fecha ID" = :fid'), params)
    print(f"\nOK: {len(updates)} filas actualizadas.")


if __name__ == "__main__":
    main(apply="--apply" in sys.argv)

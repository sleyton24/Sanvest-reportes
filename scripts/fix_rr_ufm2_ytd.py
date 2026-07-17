"""Repara los YTD de tarifas UF/m² en real_ppto_ly (RR).

La carga mensual dejaba en 0 los YTD del mes nuevo porque el ETL solo recalculaba
los YTD de flujo (fix de raíz: etl/connect_lar.upsert_real_ppto_ly). Este script
rellena SOLO las celdas 0/NULL con el promedio acumulado del año de los meses con
dato (misma fórmula del fix; 0 en el mensual = sin dato). No pisa valores ya
poblados del histórico.

Uso:  python scripts/fix_rr_ufm2_ytd.py           (dry-run: muestra qué cambiaría)
      python scripts/fix_rr_ufm2_ytd.py --apply   (escribe los UPDATE)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from sqlalchemy import text

from etl.db import get_engine
from etl.informes_lar import RPL_COLS, TARIFF_YTD_COLS


def qi(col: str) -> str:
    return '"' + col.replace('"', '""') + '"'


def main(apply: bool) -> None:
    eng = get_engine()
    print(f"engine: {eng.url.render_as_string(hide_password=True)}")
    cols = ["Activo", "Fecha ID", "Año"]
    for m, ycols in TARIFF_YTD_COLS.items():
        cols += list(RPL_COLS[m]) + list(ycols)
    df = pd.read_sql_query(
        f'SELECT {", ".join(qi(c) for c in cols)} FROM "real_ppto_ly"', eng)
    df = df.sort_values(["Activo", "Fecha ID"]).reset_index(drop=True)

    updates: dict[tuple, dict[str, float]] = {}
    for m, (ytd_r, ytd_p) in TARIFF_YTD_COLS.items():
        rc, pc = RPL_COLS[m]
        for src, ycol in ((rc, ytd_r), (pc, ytd_p)):
            s = pd.to_numeric(df[src], errors="coerce")
            s = s.mask(s == 0)
            calc = s.groupby([df["Activo"], df["Año"]]).transform(
                lambda g: g.expanding().mean())
            stored = pd.to_numeric(df[ycol], errors="coerce")
            fill = (stored.isna() | (stored == 0)) & calc.notna()
            for i in df.index[fill]:
                # tipos nativos: psycopg2 no adapta numpy.int64/float64
                key = (str(df.at[i, "Activo"]), int(df.at[i, "Fecha ID"]))
                updates.setdefault(key, {})[ycol] = float(calc[i])

    if not updates:
        print("Nada que reparar: no hay celdas YTD 0/NULL con meses de respaldo.")
        return
    print(f"{len(updates)} filas con celdas por rellenar:")
    for (act, fid), vals in sorted(updates.items(), key=lambda x: (x[0][0], x[0][1])):
        pretty = ", ".join(f"{c}={v:.4f}" for c, v in vals.items())
        print(f"  {act} {int(fid)}: {pretty}")

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

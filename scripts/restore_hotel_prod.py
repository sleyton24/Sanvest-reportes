# -*- coding: utf-8 -*-
"""Restaura las tablas de Hotel en PROD desde la BD dev (validada).

Contexto (jul-2026): una carga del CCPP "2026 Abr" parcial —con los años mal
rotulados como 2025 por dentro— pisó en prod el año 2025 completo de
hotel_full / hotel_real / hotel_ppto (ene-may con datos 2026, jun mezclado,
jul-dic en 0). Dev fue recargada con el archivo corregido y además tiene
mayo 2026, así que es la copia buena.

Pasos: 1) backup CSV de prod a db/backups/, 2) DELETE+append desde dev
(el usuario de prod no puede crear tablas; to_sql(replace) fallaría),
3) verificación.

Uso:  .venv/Scripts/python scripts/restore_hotel_prod.py [--dry-run]
"""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import sqlalchemy as sa

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from etl.db import get_engine  # noqa: E402

TABLES = ["hotel_full", "hotel_real", "hotel_ppto"]


def main(dry_run: bool) -> None:
    prod = get_engine()
    dev = sa.create_engine(f"sqlite:///{ROOT / 'db' / 'sanvest_bi_dev.sqlite'}")

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    bdir = ROOT / "db" / "backups" / f"prod_hotel_{stamp}"
    bdir.mkdir(parents=True, exist_ok=True)

    for t in TABLES:
        cur = pd.read_sql(f'SELECT * FROM {t}', prod)
        cur.to_csv(bdir / f"{t}.csv", index=False, encoding="utf-8-sig")
        new = pd.read_sql(f'SELECT * FROM {t}', dev)
        # mismas columnas y en el orden de prod (los nombres llevan acentos/%)
        missing = [c for c in cur.columns if c not in new.columns]
        if missing:
            raise SystemExit(f"{t}: faltan columnas en dev: {missing}")
        new = new[list(cur.columns)]
        print(f"{t}: prod {len(cur)} filas -> dev {len(new)} filas  (backup {bdir.name})")
        if dry_run:
            continue
        with prod.begin() as con:
            con.execute(sa.text(f'DELETE FROM {t}'))
            new.to_sql(t, con, if_exists="append", index=False)

    if dry_run:
        print("DRY RUN: no se escribió nada en prod.")
        return

    # Verificación: Real no-cero por mes en hotel_full 2025-2026
    q = sa.text(
        'SELECT anio, mes, SUM(CASE WHEN "Versión_Real" IS NOT NULL '
        'AND "Versión_Real"<>0 THEN 1 ELSE 0 END) AS real_nz '
        'FROM hotel_full WHERE anio IN (2025,2026) GROUP BY anio, mes ORDER BY anio, mes'
    )
    print(pd.read_sql(q, prod).to_string(index=False))


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)

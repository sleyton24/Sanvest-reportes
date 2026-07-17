"""Empuja a PRODUCCIÓN (Postgres 'sanvest' del VPS) las tablas ya corregidas y
validadas en la base local (SQLite dev). Úsalo cuando se confirmen correcciones
de datos que la app (que lee producción) debe reflejar.

Tablas que empuja (corregidas jun-2026):
  - real_ppto_ly   → UF/m² YTD Real (SOHO/PARK 202605, leído del Informe de Gestión)
  - dv_ventas      → ventas a la fecha SV155/SV99 (abr/may, desde Estadística de Ventas)
  - dv_escrituras  → idem ventas/escrituras SV155/SV99

Método: reemplaza cada tabla con la versión local (to_sql replace). Es seguro
porque dev es copia 1:1 de prod salvo estas correcciones. Verifica conteos.

Uso:
    python scripts/push_fixes_to_prod.py            # empuja y verifica
    python scripts/push_fixes_to_prod.py --dry-run  # solo muestra qué haría
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import text

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from sqlalchemy import create_engine  # noqa: E402
from etl.db import get_engine, load_dotenv, DEFAULT_SQLITE  # noqa: E402

load_dotenv()
TABLES = ["real_ppto_ly", "dv_ventas", "dv_escrituras"]


def main() -> None:
    ap = argparse.ArgumentParser(description="Empuja tablas corregidas a producción.")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = create_engine(f"sqlite:///{DEFAULT_SQLITE.as_posix()}")
    dst = get_engine()
    with dst.connect() as c:
        db = c.execute(text("SELECT current_database()")).scalar()
    print(f"Origen: SQLite dev  →  Destino: {db}")
    if args.dry_run:
        for t in TABLES:
            n = pd.read_sql_query(f'SELECT COUNT(*) c FROM "{t}"', src)["c"][0]
            print(f"  (dry-run) {t}: {n} filas se empujarían")
        return
    for t in TABLES:
        df = pd.read_sql_query(f'SELECT * FROM "{t}"', src)
        df.to_sql(t, dst, if_exists="replace", index=False)
        n = pd.read_sql_query(f'SELECT COUNT(*) c FROM "{t}"', dst)["c"][0]
        print(f"  {t}: {len(df)} → {n} {'OK' if n == len(df) else 'DIFF!'}")
    print("Listo. Recarga el dashboard para ver los cambios.")


if __name__ == "__main__":
    main()

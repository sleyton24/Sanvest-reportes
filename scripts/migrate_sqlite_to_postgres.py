"""Migra TODAS las tablas de la BD SQLite de desarrollo a un PostgreSQL destino.

El destino es la base `sanvest` del VPS de producción. La estructura del proyecto
es agnóstica de motor (SQLAlchemy), así que en producción basta con definir
`SANVEST_DB_URL` apuntando a Postgres y la API/ETL escriben ahí.

Uso (PowerShell):
    $env:SANVEST_DB_URL = "postgresql+psycopg2://USER:PWD@HOST:5432/sanvest"
    python scripts/migrate_sqlite_to_postgres.py            # migra
    python scripts/migrate_sqlite_to_postgres.py --dry-run  # solo lista, no escribe

La base `sanvest` debe existir antes (ver scripts/create_pg_database.py o crearla
con: CREATE DATABASE sanvest). Cada tabla se escribe con if_exists='replace'
preservando los nombres de columna (con espacios/acentos/%); se verifica el conteo
origen→destino al final.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, inspect, text

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from etl.db import load_dotenv, pg_url  # noqa: E402 — carga .env + arma URL Postgres

load_dotenv()
DEFAULT_SQLITE = ROOT / "db" / "sanvest_bi_dev.sqlite"


def main() -> None:
    ap = argparse.ArgumentParser(description="Migra SQLite -> PostgreSQL (base sanvest).")
    ap.add_argument("--source", default=str(DEFAULT_SQLITE), help="ruta al .sqlite origen")
    ap.add_argument("--target", default=None,
                    help="URL del Postgres destino (por defecto: SANVEST_DB_URL o las PG* → base 'sanvest')")
    ap.add_argument("--dry-run", action="store_true", help="solo lista tablas/filas, no escribe")
    args = ap.parse_args()
    target = args.target or os.environ.get("SANVEST_DB_URL") or pg_url("sanvest")

    src_path = Path(args.source)
    if not src_path.exists():
        sys.exit(f"No existe el origen: {src_path}")
    src = create_engine(f"sqlite:///{src_path.as_posix()}")
    tables = inspect(src).get_table_names()
    print(f"{len(tables)} tablas en origen ({src_path.name})")

    if args.dry_run:
        for t in tables:
            n = pd.read_sql_query(f'SELECT COUNT(*) AS c FROM "{t}"', src)["c"][0]
            print(f"  {t}: {n} filas")
        print("DRY-RUN: no se escribió nada.")
        return

    if not target:
        sys.exit("Falta el destino: define las PG* (PGHOST…) o SANVEST_DB_URL en .env")
    dst = create_engine(target, connect_args={"connect_timeout": 10})
    with dst.connect() as c:
        ver = c.execute(text("SELECT version()")).scalar()
    print("Conectado a:", str(ver).split(",")[0])

    total, problemas = 0, []
    for t in tables:
        df = pd.read_sql_query(f'SELECT * FROM "{t}"', src)
        df.to_sql(t, dst, if_exists="replace", index=False)
        n = pd.read_sql_query(f'SELECT COUNT(*) AS c FROM "{t}"', dst)["c"][0]
        ok = n == len(df)
        if not ok:
            problemas.append(t)
        print(f"  {t}: {len(df)} -> {n} {'OK' if ok else 'DIFF!'}")
        total += int(n)

    print(f"\nListo: {len(tables)} tablas, {total} filas en destino.")
    if problemas:
        sys.exit(f"ATENCIÓN: conteo distinto en {problemas}")


if __name__ == "__main__":
    main()

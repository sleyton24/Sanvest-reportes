"""Crea la base de datos 'sanvest' en el PostgreSQL del VPS si no existe.

Postgres exige conectarse a una base existente (la de mantenimiento, normalmente
'postgres') para poder crear otra; y CREATE DATABASE no corre dentro de una
transacción, por eso se usa AUTOCOMMIT.

Conexión: usa las variables PG* del `.env` (PGHOST/PGPORT/PGUSER/PGPASSWORD), o
PG_ADMIN_URL si está definida. Siempre se conecta a la base de mantenimiento
('postgres') para crear la nueva.

Uso:
    python scripts/create_pg_database.py            # crea 'sanvest'
    python scripts/create_pg_database.py --name otra
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from etl.db import load_dotenv, pg_url  # noqa: E402

load_dotenv()


def main() -> None:
    ap = argparse.ArgumentParser(description="Crea la base 'sanvest' en el Postgres del VPS.")
    ap.add_argument("--name", default="sanvest", help="nombre de la base a crear")
    args = ap.parse_args()

    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", args.name):
        sys.exit(f"Nombre de base inválido: {args.name!r}")

    admin = os.environ.get("PG_ADMIN_URL") or pg_url("postgres")
    if not admin:
        sys.exit("Falta conexión: define PG* (PGHOST…) o PG_ADMIN_URL en .env")

    eng = create_engine(admin, isolation_level="AUTOCOMMIT", connect_args={"connect_timeout": 10})
    with eng.connect() as c:
        exists = c.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"),
                           {"n": args.name}).scalar()
        if exists:
            print(f"La base '{args.name}' ya existe — nada que hacer.")
            return
        c.execute(text(f'CREATE DATABASE "{args.name}"'))
        print(f"Base '{args.name}' creada (UTF-8).")


if __name__ == "__main__":
    main()

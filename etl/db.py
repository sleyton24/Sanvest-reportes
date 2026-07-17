"""Conexión a la base de datos (agnóstica de motor vía SQLAlchemy).

Dev: SQLite local (db/sanvest_bi_dev.sqlite).
Prod: PostgreSQL del VPS (base 'sanvest') — cambiar solo SANVEST_DB_URL, el código
no cambia. Ver .env.example y scripts/migrate_sqlite_to_postgres.py.
"""
from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import URL, create_engine
from sqlalchemy.engine import Engine

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SQLITE = ROOT / "db" / "sanvest_bi_dev.sqlite"


def load_dotenv(root: Path = ROOT) -> None:
    """Carga `root/.env` en os.environ (sin pisar variables ya definidas). Loader
    mínimo sin dependencias: KEY=VALUE por línea, ignora comentarios y vacías. Útil
    para inyectar SANVEST_DB_URL sin exponer credenciales en la línea de comandos."""
    f = root / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())


load_dotenv()  # toma .env al importar (no-op si no existe)


def pg_url(database: str | None = None) -> URL | None:
    """Construye la URL de PostgreSQL desde las variables PG* del entorno usando
    URL.create (escapa de forma segura `@`, `$`, etc. en usuario/clave). Devuelve
    None si no hay PGHOST. `database` permite forzar la base (p. ej. 'postgres' para
    tareas de mantenimiento) sin tocar PGDATABASE."""
    host = os.environ.get("PGHOST")
    if not host:
        return None
    query = {}
    if os.environ.get("PGSSLMODE"):
        query["sslmode"] = os.environ["PGSSLMODE"]
    return URL.create(
        "postgresql+psycopg2",
        username=os.environ.get("PGUSER"),
        password=os.environ.get("PGPASSWORD"),
        host=host,
        port=int(os.environ.get("PGPORT", "5432")),
        database=database or os.environ.get("PGDATABASE") or "postgres",
        query=query,
    )


def get_engine(url: str | URL | None = None) -> Engine:
    """Devuelve un Engine. Prioridad: arg `url` > SANVEST_DB_URL > variables PG*
    (PostgreSQL del VPS) > SQLite dev.

    En producción basta con definir las variables PG* en `.env` (o SANVEST_DB_URL);
    el resto del código no cambia.
    """
    url = url or os.environ.get("SANVEST_DB_URL") or pg_url()
    if not url:
        DEFAULT_SQLITE.parent.mkdir(parents=True, exist_ok=True)
        url = f"sqlite:///{DEFAULT_SQLITE.as_posix()}"
    # pool_pre_ping/pool_recycle: el Postgres del VPS es remoto y las conexiones
    # ociosas del pool las corta la red; sin esto, el primer request tras un rato
    # inactivo falla con 500 (p. ej. el login parece "clave incorrecta").
    return create_engine(url, future=True, pool_pre_ping=True, pool_recycle=1800)

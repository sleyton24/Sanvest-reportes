"""Acceso a datos para la API. Reusa el engine del ETL (SQLite dev / SQL Server
prod). Construye SQL portable con identificadores entre corchetes (válido en
SQLite y SQL Server) y valores siempre parametrizados (anti-inyección).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import text

from etl.db import get_engine

engine = get_engine()


def qi(name: str) -> str:
    """Cita un identificador (tabla/columna) con comillas dobles estándar (SQL).

    Válido en PostgreSQL, SQLite y SQL Server (con QUOTED_IDENTIFIER ON, que es el
    valor por defecto). Antes se usaban corchetes `[col]`, que Postgres no acepta.
    """
    return '"' + name.replace('"', '""') + '"'


def fetch(sql: str, params: dict[str, Any] | None = None) -> list[dict]:
    with engine.connect() as con:
        res = con.execute(text(sql), params or {})
        return [dict(r) for r in res.mappings().all()]


def scalar(sql: str, params: dict[str, Any] | None = None) -> Any:
    with engine.connect() as con:
        return con.execute(text(sql), params or {}).scalar()


def build_where(filters: dict[str, Any]) -> tuple[str, dict]:
    """WHERE [col] = :pN AND ... a partir de {columna: valor}. Las columnas ya
    deben estar validadas contra el catálogo por quien llama."""
    if not filters:
        return "", {}
    clauses, params = [], {}
    for i, (col, val) in enumerate(filters.items()):
        p = f"p{i}"
        clauses.append(f"{qi(col)} = :{p}")
        params[p] = val
    return "WHERE " + " AND ".join(clauses), params

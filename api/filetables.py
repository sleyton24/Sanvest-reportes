"""Tablas servidas desde un archivo JSON empaquetado (fallback), para datos que
no viven en la BD.

Caso `deuda_activos`: el cronograma de amortización (Deuda.xlsx) es estático y el
usuario de prod NO puede crear tablas (`has_schema_privilege(public,CREATE)=False`).
En vez de una tabla en Postgres, la API lo sirve desde `api/data/deuda_activos.json`.
Si algún día la tabla existe en la BD, esa gana (ver `table_rows` en main.py).

Regenerar el JSON tras actualizar el Excel:
    .venv/Scripts/python -c "import json; from etl.connect_deuda import deuda_to_df; \
        json.dump(json.loads(deuda_to_df('Formatos para reportes PBI/Deuda.xlsx').to_json(orient='records')), \
        open('api/data/deuda_activos.json','w',encoding='utf-8'), ensure_ascii=False, indent=0)"
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent / "data"

# slug -> archivo JSON (lista de dicts). Solo tablas realmente estáticas.
FILE_TABLES: dict[str, str] = {
    "deuda_activos": "deuda_activos.json",
}


def has(slug: str) -> bool:
    return slug in FILE_TABLES


@lru_cache(maxsize=8)
def _load(slug: str) -> list[dict]:
    path = DATA_DIR / FILE_TABLES[slug]
    return json.loads(path.read_text(encoding="utf-8"))


def query(slug: str, filters: dict[str, Any], order_by: str | None,
          order_dir: str, limit: int, offset: int) -> dict:
    """Replica en memoria lo que hace `table_rows` contra la BD: filtro de
    igualdad, orden, y limit/offset. Devuelve el mismo shape del endpoint."""
    rows = _load(slug)
    if filters:
        def _match(r: dict) -> bool:
            return all(str(r.get(k)) == str(v) for k, v in filters.items())
        rows = [r for r in rows if _match(r)]
    if order_by:
        rows = sorted(
            rows,
            key=lambda r: (r.get(order_by) is None, r.get(order_by)),
            reverse=(order_dir.lower() == "desc"),
        )
    total = len(rows)
    page = rows[offset:offset + limit]
    return {"total": total, "rows": page}

"""Carga y consulta el catálogo (api/catalog/<unidad>.json)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

CAT_DIR = Path(__file__).resolve().parent / "catalog"


@lru_cache(maxsize=1)
def all_units() -> dict[str, dict]:
    units = {}
    for f in sorted(CAT_DIR.glob("*.json")):
        cat = json.loads(f.read_text(encoding="utf-8"))
        units[cat["unit"]] = cat
    return units


def get_unit(unit: str) -> dict | None:
    return all_units().get(unit)


def get_table(unit: str, slug: str) -> dict | None:
    cat = get_unit(unit)
    if not cat:
        return None
    for t in cat["tables"]:
        if t["slug"] == slug:
            return t
    return None


def table_columns(unit: str, slug: str) -> set[str]:
    t = get_table(unit, slug)
    return {c["name"] for c in t["columns"]} if t else set()

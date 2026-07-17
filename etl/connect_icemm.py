"""Conexión ICEMM: aplica el Informe ICEMM crudo a `icemm_mensual`, preservando
histórico. Reemplaza las filas de los (Nivel 1, Nivel 2, FechID) presentes en el
crudo (que trae los años completos con YTD/FY/YTG recalculados) y conserva el resto.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from sqlalchemy.engine import Engine

from .connect_lar import _read, _write
from .icemm_crudo import crudo_to_icemm_mensual, crudo_to_flujo, _flu_norm

MEASURES = ["Real", "PPTO", "Proy", "YTD Real", "YTD PPTO", "YTD Proy",
            "FY Proy", "FY PPTO", "YTG Proy", "YTG PPTO"]


def _key(df: pd.DataFrame) -> pd.Series:
    return (df["Nivel 1"].astype(str).str.strip() + "|"
            + df["Nivel 2"].astype(str).str.strip() + "|"
            + df["FechID"].astype("Int64").astype(str))


def _upsert_icemm_mensual(engine: Engine, path) -> dict:
    new = crudo_to_icemm_mensual(path)
    cur = _read(engine, "icemm_mensual")
    cur["Nivel 1"] = cur["Nivel 1"].astype(str).str.strip()   # normaliza espacios finales
    for c in MEASURES:
        if c in cur.columns:
            cur[c] = pd.to_numeric(cur[c], errors="coerce").astype("float64")
    new_keys, cur_keys = set(_key(new)), set(_key(cur))
    keep = cur[~_key(cur).isin(new_keys)]
    merged = pd.concat([keep, new[list(cur.columns)]], ignore_index=True)
    _write(engine, "icemm_mensual", merged)
    return {"tabla": "icemm_mensual", "filas_resultantes": int(len(merged)),
            "filas_actualizadas": int(len(new_keys & cur_keys)),
            "filas_insertadas": int(len(new_keys - cur_keys))}


def _upsert_flujo(engine: Engine, path) -> dict:
    cur = _read(engine, "flujo")
    # catálogo de nombres canónicos desde la tabla plana
    catalog = {}
    for _, r in cur[["Orden", "Categoría 1", "Categoría 2"]].drop_duplicates().iterrows():
        catalog[_flu_norm(r["Categoría 2"])] = (r["Categoría 1"], r["Categoría 2"], r["Orden"])
    new = crudo_to_flujo(path, catalog)
    if new.empty:
        return {"tabla": "flujo", "filas_resultantes": int(len(cur)),
                "filas_actualizadas": 0, "filas_insertadas": 0}
    cur["Monto"] = pd.to_numeric(cur["Monto"], errors="coerce").astype("float64")
    k = lambda d: (d["Categoría 2"].astype(str) + "|" + d["Fecha"].astype(str).str.slice(0, 7))
    new_keys, cur_keys = set(k(new)), set(k(cur))
    keep = cur[~k(cur).isin(new_keys)]
    merged = pd.concat([keep, new[list(cur.columns)]], ignore_index=True)
    _write(engine, "flujo", merged)
    return {"tabla": "flujo", "filas_resultantes": int(len(merged)),
            "filas_actualizadas": int(len(new_keys & cur_keys)),
            "filas_insertadas": int(len(new_keys - cur_keys))}


def apply_icemm(engine: Engine, path: str | Path) -> dict:
    """Carga el Informe ICEMM crudo: icemm_mensual (P&L/combos) + flujo (pivot)."""
    men = _upsert_icemm_mensual(engine, path)
    flu = _upsert_flujo(engine, path)
    return {"icemm_mensual": men, "flujo": flu}

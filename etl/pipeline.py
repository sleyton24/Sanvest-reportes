"""Pipeline ETL por unidad de negocio.

`load_unit` carga todas las tablas de una unidad desde UN Excel (el mismo que
sube el usuario en Fase 4) y, opcionalmente, las escribe a la base de datos.
Reutilizable tal cual en Fase 4 (carga directa).
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import pandas as pd
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from .loader import load_table

ROOT = Path(__file__).resolve().parent.parent
CFG_DIR = ROOT / "etl" / "config"

# Excel fuente por unidad (la carpeta local es copia de la fuente del .pbix).
# En Fase 4 este path lo reemplaza el archivo que sube el usuario.
UNIT_SOURCE = {
    "DV": "Formatos para reportes PBI/Desarrollo para la venta.xlsx",
    "Hotel": "Formatos para reportes PBI/BD HOTEL .xlsx",
    "RR": "Formatos para reportes PBI/Renta Residencial .xlsx",
    "USA": "Formatos para reportes PBI/BD Gestion USA .xlsx",  # fallback; usa file por-tabla
    "ICEMM": "Formatos para reportes PBI/ICEMM.xlsx",
    "Atempora": "Formatos para reportes PBI/CIVITAS.xlsx",
    "Grupo": "Formatos para reportes PBI/Base balance.xlsx",
}


def slug(name: str) -> str:
    """Nombre de tabla SQL seguro: sin acentos, snake_case, ascii."""
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    n = re.sub(r"[^\w]+", "_", n.strip().lower()).strip("_")
    return re.sub(r"_+", "_", n)


def load_config(unit: str) -> dict:
    return json.loads((CFG_DIR / f"{unit}.json").read_text(encoding="utf-8"))


def default_source(unit: str) -> Path:
    return ROOT / UNIT_SOURCE[unit]


def load_unit(
    unit: str,
    excel_path: str | Path | None = None,
    engine: Engine | None = None,
    *,
    if_exists: str = "replace",
) -> dict[str, pd.DataFrame]:
    """Carga todas las tablas de `unit`. Devuelve {nombre_modelo: DataFrame}.

    Si `engine` se entrega, escribe cada tabla a la BD con nombre `slug(tabla)`.
    `excel_path` por defecto = fuente local de la unidad; en Fase 4 se pasa el
    archivo subido por el usuario.
    """
    cfg = load_config(unit)
    forced = Path(excel_path) if excel_path else None  # Fase 4: 1 archivo subido
    fmt_dir = ROOT / "Formatos para reportes PBI"

    out: dict[str, pd.DataFrame] = {}
    for tcfg in cfg["tables"]:
        # fuente por tabla: archivo subido > archivo del config > fuente default
        if forced is not None:
            src = forced
        elif tcfg.get("file"):
            src = fmt_dir / tcfg["file"]
        else:
            src = default_source(unit)
        if not src.exists():
            raise FileNotFoundError(f"No existe el Excel fuente: {src}")
        df = load_table(src, tcfg)
        out[tcfg["table"]] = df
        if engine is not None:
            t = slug(tcfg["table"])
            # Reemplazo sin DDL cuando la tabla ya existe (el usuario de la app no
            # tiene CREATE en 'public' en Postgres): DELETE + INSERT transaccional.
            if if_exists == "replace" and inspect(engine).has_table(t):
                with engine.begin() as con:
                    con.exec_driver_sql(f'DELETE FROM "{t}"')
                    df.to_sql(t, con, if_exists="append", index=False)
            else:
                df.to_sql(t, engine, if_exists=if_exists, index=False)
    return out

"""Loader: replica fiel de un paso Power Query M.

El M típico del modelo es:
    Excel.Workbook(File.Contents(f))[Item=hoja, Kind="Sheet"]   # leer hoja
    -> Table.PromoteHeaders                                      # encabezados
    -> Table.TransformColumnTypes                                # castear tipos
con, a veces, un filtro / rename / drop de columnas o filas con error.

`load_sheet` reproduce eso para UNA tabla, parametrizado por su config.
No inventa nada: la config sale de parsear el M (scripts/parse_m_types.py).
"""
from __future__ import annotations

import datetime as _dt
from pathlib import Path
from typing import Any

import pandas as pd


def _is_datetimey(s: pd.Series) -> bool:
    """True si la serie es de fechas (dtype datetime u objetos date/datetime)."""
    if pd.api.types.is_datetime64_any_dtype(s):
        return True
    if s.dtype == object:
        nn = s.dropna()
        if len(nn) and nn.map(lambda v: isinstance(v, (_dt.date, _dt.datetime))).mean() > 0.5:
            return True
    return False


def _cast_column(s: pd.Series, m_type: str) -> pd.Series:
    """Castea una serie al tipo M indicado, replicando TransformColumnTypes."""
    t = m_type.strip()
    if t in ("type text", "type any"):
        # Power Query 'type text': representación textual; NaN -> <NA>
        out = s.astype("object").where(s.notna(), pd.NA)
        return out.map(lambda v: v if v is pd.NA else _to_text(v)).astype("string")
    if t in ("type number", "Currency.Type", "Percentage.Type"):
        return pd.to_numeric(s, errors="coerce").astype("float64")
    if t in ("Int64.Type", "Int8.Type"):
        # Power Query: una FECHA convertida a Int64 da el número de serie de Excel
        # (días desde 1899-12-30), NO nanosegundos. Hay que replicarlo.
        if _is_datetimey(s):
            dt = pd.to_datetime(s, errors="coerce")
            serial = (dt - pd.Timestamp("1899-12-30")) // pd.Timedelta(days=1)
            return serial.astype("Int64")
        return pd.to_numeric(s, errors="coerce").round().astype("Int64")
    if t in ("type date", "type datetime", "type datetimezone"):
        out = pd.to_datetime(s, errors="coerce")
        if t == "type date":
            out = out.dt.normalize()  # M 'type date' descarta la hora
        return out
    if t == "type logical":
        return s.astype("boolean")
    # desconocido: dejar tal cual
    return s


def _to_text(v: Any) -> str:
    """Texto al estilo Power Query: enteros sin '.0', resto str()."""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def load_sheet(
    excel_path: str | Path,
    sheet: str,
    columns: list[dict] | None = None,
    *,
    promote_headers: bool = True,
) -> pd.DataFrame:
    """Lee una hoja y aplica promote-headers + casteo de tipos (replica M).

    Conserva TODAS las columnas de la hoja; solo castea las que estén en
    `columns` (lista de dicts {col, m_type, ...}). Las demás quedan como las
    lee pandas (igual que las columnas no incluidas en TransformColumnTypes).
    """
    header = 0 if promote_headers else None
    df = pd.read_excel(excel_path, sheet_name=sheet, header=header, engine="openpyxl")
    if not promote_headers:
        df.columns = [f"Column{i+1}" for i in range(df.shape[1])]
        return df

    df.columns = [str(c) for c in df.columns]
    if columns:
        for spec in columns:
            col, m_type = spec["col"], spec["m_type"]
            if col in df.columns:
                df[col] = _cast_column(df[col], m_type)
            # si la columna no existe se reporta luego en la reconciliación
    return df


def load_table(excel_path: str | Path, table_cfg: dict) -> pd.DataFrame:
    """Carga una tabla a partir de su config (incluye pasos extra simples)."""
    df = load_sheet(
        excel_path,
        table_cfg["sheet"],
        table_cfg.get("columns"),
        promote_headers=table_cfg.get("extra_steps", {}).get("promote_headers", True),
    )
    # Pasos extra que el M aplica en algunas tablas (filtro/drops) se modelan
    # como overrides explícitos en config['post'] cuando se requieran. Las
    # tablas DV no tienen pasos extra, así que aquí no se aplica nada.
    return df

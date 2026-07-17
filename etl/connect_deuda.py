"""Transform: Deuda.xlsx (hoja 'Deuda') -> tabla plana `deuda_activos`.

Cronograma de amortización por activo y mes: Cuota, saldo 'por pagar', 'Deuda total'.
Activos del origen: Soho, Park (Renta Residencial) y, para el hotel OLÁ, 'Hotel Ola'
(deuda total 510k UF) — la deuda OFICIAL del hotel según el usuario (09-jul-2026). El
otro crédito del archivo, 'Ola' (404k), NO se mapea y por eso queda fuera de los tableros.
Se agrega 'Unidad' (RR/Hotel) y 'ActivoNorm' (SOHO/PARK/Hotel) para enganchar con los
dashboards; 'Activo' se conserva como etiqueta del crédito. Los activos sin mapeo se
descartan (ver dropna en deuda_to_df).
"""
from __future__ import annotations

import pandas as pd
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

SHEET = "Deuda"
TABLE = "deuda_activos"

# Activo del origen -> (Unidad, ActivoNorm). 'Ola' se omite a propósito: la deuda oficial
# del hotel es 'Hotel Ola' (510k UF). Los activos ausentes de este mapa se descartan.
ACT_MAP = {
    "soho": ("RR", "SOHO"),
    "park": ("RR", "PARK"),
    "hotel ola": ("Hotel", "Hotel"),
}


def deuda_to_df(path) -> pd.DataFrame:
    raw = pd.read_excel(path, sheet_name=SHEET)
    raw.columns = [str(c).strip() for c in raw.columns]
    df = pd.DataFrame({
        "Activo": raw["Activo"].astype(str).str.strip(),
        "Cuota": pd.to_numeric(raw["Cuota"], errors="coerce"),
        "por pagar": pd.to_numeric(raw["por pagar"], errors="coerce"),
        "Deuda total": pd.to_numeric(raw["Deuda total"], errors="coerce"),
        "Fecha": pd.to_datetime(raw["Fecha"], errors="coerce").dt.strftime("%Y-%m-%d"),
        "Año": pd.to_numeric(raw["Año"], errors="coerce").astype("Int64"),
        "Mes": pd.to_numeric(raw["Mes"], errors="coerce").astype("Int64"),
        "FechaId": pd.to_numeric(raw["FechaId"], errors="coerce").astype("Int64"),
    })
    df = df[df["Activo"].str.len() > 0].copy()
    m = df["Activo"].str.lower().map(ACT_MAP)
    df["Unidad"] = m.map(lambda x: x[0] if isinstance(x, tuple) else None)
    df["ActivoNorm"] = m.map(lambda x: x[1] if isinstance(x, tuple) else None)
    # Descarta activos sin mapeo (p.ej. 'Ola') y filas sin fecha.
    return (df.dropna(subset=["FechaId", "Unidad"])
              .sort_values(["Activo", "FechaId"]).reset_index(drop=True))


def apply_deuda(engine: Engine, path) -> dict:
    df = deuda_to_df(path)
    if inspect(engine).has_table(TABLE):
        with engine.begin() as con:
            con.exec_driver_sql(f'DELETE FROM "{TABLE}"')
            df.to_sql(TABLE, con, if_exists="append", index=False)
    else:
        df.to_sql(TABLE, engine, if_exists="replace", index=False)
    return {TABLE: len(df), "activos": sorted(df["Activo"].unique().tolist())}

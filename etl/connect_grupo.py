"""Conexión Grupo (Estados Financieros): sube los reportes CRUDOS del Grupo
—Balance y E°R° (EERR)— y arma solo las tablas planas del dashboard.

Reemplaza el paso manual anterior (`load_unit` copiaba hojas ya limpiadas de
`Base balance.xlsx`). Ahora:
  1. clasifica cada archivo por su nombre (Balance vs E°R°/EERR);
  2. corre el executor declarativo (`statement_extractor`, guiado por
     `etl/specs/Grupo.{balance,eerr}.json`);
  3. valida cuadre DURO (`validators`) — no escribe nada si falla;
  4. deriva la Cascada del EERR;
  5. DELETE+INSERT **por Trimestre** (preserva el histórico de otros trimestres;
     el usuario de prod no tiene DDL → solo DELETE/INSERT, no CREATE).

Balance y EERR pueden traer trimestres DISTINTOS (p. ej. el "E°R° 2026_03" es
internamente el cierre anual Q4-2025): el trimestre se toma del DATO de cada
tabla, nunca del nombre del archivo.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from . import validators as V
from .loader import _cast_column
from .pipeline import slug
from .statement_extractor import (derive_cascada, extract_balance,
                                   extract_eerr, load_spec)

ROOT = Path(__file__).resolve().parent.parent
CFG_PATH = ROOT / "etl" / "config" / "Grupo.json"

# Nombres EXACTOS de las tablas destino (→ slug) y su columna de trimestre.
BALANCE_TABLE = "Balance"
EERR_TABLE = "EERR Grupo"
CASCADA_TABLE = "Cascada"
PERIOD_COL = {
    "balance": "Trimestre",
    "eerr_grupo": "Trimestre",
    "cascada": "Fecha Trimestre",
}


EERR_TOKENS = ("e°r°", "eºrº", "eerr", "e r°", "estado de resultado",
               "estados de resultado", "e.r.", "resultado")


def classify_grupo_file(filename: str) -> str | None:
    """'balance' | 'eerr' | None, según el nombre del archivo. El Balance y el
    E°R° comparten hoja ("Grupo Sanvest") → hay que distinguirlos por el nombre.

    Es AMBIGUO (→ None) si el nombre trae señales de ambos (p. ej. "Estado de
    Resultado y Balance…"): mejor rechazar que clasificar mal por el orden de los
    chequeos. El que llama debe tratar None como 'no reconocido/ambiguo'."""
    low = (filename or "").lower()
    has_balance = "balance" in low
    has_eerr = any(m in low for m in EERR_TOKENS)
    if has_balance and has_eerr:
        return None                       # ambiguo → no adivinar
    if has_balance:
        return "balance"
    if has_eerr:
        return "eerr"
    return None


def _cast_to_config(df: pd.DataFrame, table_name: str) -> pd.DataFrame:
    """Castea las columnas presentes al dtype del config Grupo.json (Notas→Int64,
    Indice→float, valores→float, texto→string), replicando lo que hace `load_unit`
    para que el INSERT sea compatible con Postgres (BIGINT/FLOAT). Deja intactas
    las columnas que el config no declara (p. ej. 'Nota' de texto del Balance)."""
    cfg = json.loads(CFG_PATH.read_text(encoding="utf-8"))
    tcfg = next((t for t in cfg["tables"] if t["table"] == table_name), None)
    if not tcfg:
        return df
    df = df.copy()
    for spec in tcfg.get("columns", []):
        col, m_type = spec["col"], spec["m_type"]
        if col in df.columns:
            df[col] = _cast_column(df[col], m_type)
    return df


def _align_to_table(con, table: str, df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Deja el df con EXACTAMENTE las columnas de la tabla (rellena ausentes con NA,
    descarta extras) para que el append no rompa. Devuelve (df, columnas_descartadas)
    para que la carga NO oculte un drift de esquema (nombres con espacios finales
    como 'Monto ' son frágiles); el que llama registra las descartadas en el resultado."""
    cols = [c["name"] for c in inspect(con).get_columns(table)]
    extras = [c for c in df.columns if c not in cols]
    if extras:  # inesperado: el extractor emite el esquema exacto. Se descartan y se reportan.
        df = df.drop(columns=extras)
    return df.reindex(columns=cols), extras


def _offset_index_cols(con, table: str, df: pd.DataFrame,
                       period_col: str, periods: list, index_cols: list[str]) -> pd.DataFrame:
    """Reasigna las columnas de índice (1..N por archivo) para que continúen tras el
    máximo de los trimestres QUE SE CONSERVAN → el Indice queda GLOBAL-único en la
    tabla (como el dato manual histórico). El front no ordena por Indice (filtra por
    Trimestre), pero se preserva el contrato para reconciliación/consumidores.

    El MAX incluye filas con período NULL (`IS NULL OR NOT IN …`): esas filas NUNCA
    se borran (el DELETE es por trimestre exacto), así que deben contar en la base o
    su Indice podría colisionar."""
    cols = [c for c in index_cols if c in df.columns]
    if not cols:
        return df
    df = df.copy()
    ph = ",".join(f":p{i}" for i in range(len(periods)))
    params = {f"p{i}": str(p) for i, p in enumerate(periods)}
    for col in cols:
        m = con.execute(
            text(f'SELECT MAX("{col}") FROM "{table}" '
                 f'WHERE "{period_col}" IS NULL OR "{period_col}" NOT IN ({ph})'),
            params).scalar()
        base = int(m) if m is not None else 0
        df[col] = list(range(base + 1, base + 1 + len(df)))
    return df


def _replace_by_period(con, table: str, df: pd.DataFrame,
                       period_col: str, index_cols: list[str] | None = None) -> dict:
    """DELETE+INSERT por período sobre la Connection `con` (la transacción la maneja
    el que llama → varias tablas commitean/rollbackean JUNTAS). Por cada Trimestre
    presente en `df`, borra ese trimestre e inserta las filas nuevas; preserva los
    demás. Devuelve {filas_insertadas, filas_actualizadas, trimestres[, ...]}."""
    exists = inspect(con).has_table(table)
    extras: list[str] = []
    if exists:
        df, extras = _align_to_table(con, table, df)
    if period_col not in df.columns:
        raise V.ValidationError(
            f"la tabla destino '{table}' no tiene la columna de período '{period_col}'")
    periods = [p for p in df[period_col].dropna().unique()]
    if not periods:
        raise V.ValidationError(f"'{table}': ninguna fila trae {period_col}")

    if not exists:
        df.to_sql(table, con, if_exists="replace", index=False)  # dev / instalación nueva
        return {"filas_insertadas": int(len(df)), "filas_actualizadas": 0,
                "trimestres": periods, "creada": True}

    if index_cols:
        df = _offset_index_cols(con, table, df, period_col, periods, index_cols)

    deleted = 0
    for p in periods:
        res = con.execute(
            text(f'DELETE FROM "{table}" WHERE "{period_col}" = :p'), {"p": str(p)})
        deleted += int(res.rowcount or 0)
    df.to_sql(table, con, if_exists="append", index=False)
    out = {"filas_insertadas": int(len(df)), "filas_actualizadas": deleted,
           "trimestres": periods}
    if extras:
        out["columnas_descartadas"] = extras
    return out


def build_grupo(paths: dict, specs: dict | None = None) -> dict:
    """Corre extractores + validadores SIN tocar la BD (dry-run reutilizable por el
    agente F4). `paths`: {'balance': Path|None, 'eerr': Path|None}. `specs` opcional:
    {'balance': <dict>, 'eerr': <dict>} para dry-run con un spec PROPUESTO (staging);
    si falta, usa el spec vivo (`load_spec`). Devuelve {'balance': (df, validación),
    'eerr': (df, val), 'cascada': (df, val)}."""
    specs = specs or {}
    out: dict = {}
    if paths.get("balance"):
        bspec = specs.get("balance") or load_spec("Grupo", "balance")
        bdf = extract_balance(paths["balance"], bspec)
        out["balance"] = (bdf, V.validate_balance(bdf))
    if paths.get("eerr"):
        espec = specs.get("eerr") or load_spec("Grupo", "eerr")
        edf = extract_eerr(paths["eerr"], espec)
        cdf = derive_cascada(edf, espec)
        out["eerr"] = (edf, V.validate_eerr(edf))
        out["cascada"] = (cdf, V.validate_cascada(cdf, edf, espec))
    return out


def apply_grupo(engine: Engine, paths: dict) -> dict:
    """Sube el/los crudo(s) de Grupo. Valida DURO antes de escribir: si algún
    cuadre falla, NO escribe nada y lanza `ValidationError` (→ 422 en la API).

    `paths`: {'balance': Path|None, 'eerr': Path|None} (al menos uno)."""
    if not paths.get("balance") and not paths.get("eerr"):
        raise V.ValidationError("no se reconoció ningún archivo (Balance ni E°R°)")

    built = build_grupo(paths)

    # 1) validar TODO antes de escribir NADA (atómico a nivel de carga).
    if "balance" in built:
        V.raise_if_bad(built["balance"][1], context="Balance")
    if "eerr" in built:
        V.raise_if_bad(built["eerr"][1], context="EERR")
        V.raise_if_bad(built["cascada"][1], context="Cascada")

    # 2) preparar las escrituras (cast a dtypes destino) — sin tocar la BD todavía.
    writes: list[tuple] = []  # (tabla, df, period_col, index_cols)
    if "balance" in built:
        bspec = load_spec("Grupo", "balance")
        t = slug(BALANCE_TABLE)
        writes.append((t, _cast_to_config(built["balance"][0], BALANCE_TABLE),
                       PERIOD_COL[t], bspec.get("index_out")))
    if "eerr" in built:
        espec = load_spec("Grupo", "eerr")
        te, tc = slug(EERR_TABLE), slug(CASCADA_TABLE)
        writes.append((te, _cast_to_config(built["eerr"][0], EERR_TABLE),
                       PERIOD_COL[te], espec.get("index_out")))
        writes.append((tc, _cast_to_config(built["cascada"][0], CASCADA_TABLE),
                       PERIOD_COL[tc], None))

    # 3) escribir las tablas en UNA sola transacción: EERR y Cascada son un par
    #    derivado que debe cuadrar entre sí; cualquier fallo revierte TODO (no deja
    #    trimestres desincronizados si un INSERT falla en Postgres).
    result: dict = {}
    with engine.begin() as con:
        for table, df, pcol, icols in writes:
            result[table] = _replace_by_period(con, table, df, pcol, index_cols=icols)
    return result

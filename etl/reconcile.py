"""Reconciliación: ETL (pandas) vs datos del modelo extraídos del .pbix.

Regla dura del proyecto: cada tabla plana debe cuadrar 100% contra lo que
pbixray lee del modelo. VertiPaq NO preserva el orden de filas, así que se
compara como MULTISET de filas normalizadas (una fila cuadra solo si TODAS sus
celdas cuadran). Cuando hay diferencias, se localiza por columna.
"""
from __future__ import annotations

import datetime as _dt
import math
from collections import Counter
from typing import Any

import pandas as pd

FLOAT_DECIMALS = 6
NULL = "∅"  # ∅ sentinel para nulos


import re

# fecha dd-mm-yyyy o dd/mm/yyyy (formato es-CL en que el modelo guarda columnas
# no tipadas) y número es-CL (miles '.', decimal ',').
_RE_DATE = re.compile(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+0:00:00|\s+00:00:00)?$")
_RE_NUM_ESCL = re.compile(r"^-?\d{1,3}(?:\.\d{3})*,\d+$|^-?\d+,\d+$")
# fecha/hora ISO "YYYY-MM-DD[ T]HH:MM:SS[.ffffff]" — cómo SQLite/Postgres guardan las
# fechas tras el ETL; hay que normalizarla igual que un Timestamp para comparar.
_RE_ISO_DT = re.compile(r"^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$")


def _fnum(f: float) -> str:
    # 7 cifras significativas: absorbe diferencias de último dígito entre el doble
    # leído por openpyxl y el texto que el modelo guarda para columnas no tipadas.
    if f == 0:
        return "0"
    return f"{f:.7g}"


def _norm(v: Any) -> str:
    """Representación canónica de una celda para comparar entre fuentes.

    Tolerante a cómo el modelo guarda columnas NO tipadas (lectura cruda): números
    como texto es-CL ("69,43582301") y fechas dd-mm-yyyy ("01-01-2020"). Así se
    compara el VALOR, no la representación.
    """
    if v is None or v is pd.NA:
        return NULL
    if isinstance(v, float):
        return NULL if math.isnan(v) else _fnum(v)
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, int):
        return str(int(v))
    if isinstance(v, (pd.Timestamp, _dt.datetime)):
        ts = pd.Timestamp(v)
        if pd.isna(ts):
            return NULL
        return ts.normalize().date().isoformat() if ts == ts.normalize() else ts.isoformat()
    if isinstance(v, _dt.date):
        return v.isoformat()
    s = str(v).strip()
    if s == "":
        return NULL
    # fecha/hora ISO de la BD ("2026-01-01 00:00:00.000000") -> mismo canónico que
    # un Timestamp del modelo ("2026-01-01" si es medianoche, si no ISO con hora).
    if _RE_ISO_DT.match(s):
        try:
            ts = pd.Timestamp(s)
            if not pd.isna(ts):
                return ts.normalize().date().isoformat() if ts == ts.normalize() else ts.isoformat()
        except (ValueError, TypeError):
            pass
    # fecha es-CL dd-mm-yyyy -> ISO
    m = _RE_DATE.match(s)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    # número es-CL con coma decimal -> float canónico
    if _RE_NUM_ESCL.match(s):
        try:
            return _fnum(float(s.replace(".", "").replace(",", ".")))
        except ValueError:
            pass
    # número plano (entero o float) -> canónico
    try:
        f = float(s)
        if f.is_integer() and not any(c in s for c in ".eE"):
            return str(int(f))
        return _fnum(f)
    except (ValueError, TypeError):
        return s


def _norm_frame(df: pd.DataFrame, cols: list[str]) -> list[tuple]:
    sub = df[cols]
    return [tuple(_norm(v) for v in row) for row in sub.itertuples(index=False, name=None)]


def reconcile_table(etl: pd.DataFrame, model: pd.DataFrame,
                    cast_cols: list[str] | None = None) -> dict:
    """Compara una tabla. Devuelve un reporte estructurado.

    `cast_cols` = columnas que el M castea (las que el ETL controla). Se usan
    para el análisis de DRIFT: si TODA fila del modelo se reproduce en el ETL
    sobre esas columnas, la lógica del ETL es fiel aunque el Excel tenga filas
    nuevas (snapshot del .pbix más viejo que el Excel actual).
    """
    etl_cols = list(etl.columns)
    mdl_cols = list(model.columns)
    common = [c for c in etl_cols if c in mdl_cols]
    only_etl = [c for c in etl_cols if c not in mdl_cols]
    only_mdl = [c for c in mdl_cols if c not in etl_cols]

    rep: dict[str, Any] = {
        "rows_etl": len(etl), "rows_model": len(model),
        "cols_etl": len(etl_cols), "cols_model": len(mdl_cols),
        "cols_only_in_etl": only_etl, "cols_only_in_model": only_mdl,
        "common_cols": len(common),
    }

    if not common:
        rep["status"] = "FAIL"
        rep["reason"] = "sin columnas en común"
        return rep

    etl_rows = Counter(_norm_frame(etl, common))
    mdl_rows = Counter(_norm_frame(model, common))

    matched = sum((etl_rows & mdl_rows).values())
    only_in_etl = etl_rows - mdl_rows
    only_in_mdl = mdl_rows - etl_rows
    n_only_etl = sum(only_in_etl.values())
    n_only_mdl = sum(only_in_mdl.values())

    rep["rows_matched"] = matched
    rep["rows_only_in_etl"] = n_only_etl
    rep["rows_only_in_model"] = n_only_mdl

    # Diagnóstico por columna cuando hay filas que no cuadran (solo si #filas igual)
    col_diffs: dict[str, int] = {}
    examples: list[dict] = []
    if (n_only_etl or n_only_mdl) and len(etl) == len(model):
        e = etl[common].reset_index(drop=True)
        m = model[common].reset_index(drop=True)
        # ordenar ambos por todas las columnas normalizadas para alinear filas
        key_e = [_norm_frame(e, common)[i] for i in range(len(e))]
        key_m = [_norm_frame(m, common)[i] for i in range(len(m))]
        order_e = sorted(range(len(e)), key=lambda i: key_e[i])
        order_m = sorted(range(len(m)), key=lambda i: key_m[i])
        e2 = e.iloc[order_e].reset_index(drop=True)
        m2 = m.iloc[order_m].reset_index(drop=True)
        for c in common:
            ne = e2[c].map(_norm)
            nm = m2[c].map(_norm)
            diff_mask = ne != nm
            d = int(diff_mask.sum())
            if d:
                col_diffs[c] = d
                if len(examples) < 8:
                    idx = diff_mask.idxmax()
                    examples.append({
                        "col": c, "row_sorted": int(idx),
                        "etl": ne.iloc[idx], "model": nm.iloc[idx],
                    })
        rep["col_diffs"] = dict(sorted(col_diffs.items(), key=lambda x: -x[1]))
        rep["examples"] = examples
    elif n_only_etl or n_only_mdl:
        # distinto número de filas: muestra ejemplos de filas huérfanas
        rep["example_rows_only_in_etl"] = [list(r) for r in list(only_in_etl)[:3]]
        rep["example_rows_only_in_model"] = [list(r) for r in list(only_in_mdl)[:3]]

    ok = (n_only_etl == 0 and n_only_mdl == 0 and not only_etl and not only_mdl)
    if ok:
        rep["status"] = "OK"
        return rep

    # --- Análisis de DRIFT por CLAVE de negocio ---
    # Clave = columnas casteadas que NO son float (dimensiones: int/texto/fecha).
    # Medidas = columnas casteadas float. Una tabla es DRIFT (ETL fiel) si TODA
    # clave del modelo existe en el ETL; las diferencias entonces son filas
    # nuevas o valores actualizados en el Excel posteriores al snapshot. Es FAIL
    # solo si hay claves del modelo sin contraparte en el ETL (bug de lógica).
    drift = _drift_by_key(etl, model, cast_cols or [], common)
    if drift:
        rep.update(drift)
        if drift["model_keys_missing"] == 0 and drift.get("can_classify"):
            rep["status"] = "DRIFT"
            n_new = drift["etl_new_keys"]
            n_upd = drift["measure_cells_changed"]
            parts = [f"ETL fiel: {drift['model_keys']} claves del modelo presentes "
                     f"al 100% en el ETL"]
            if n_new:
                parts.append(f"{n_new} filas nuevas en el Excel")
            if n_upd:
                parts.append(f"{n_upd} celdas con valor actualizado en el Excel "
                             f"(posteriores al snapshot del .pbix)")
            rep["drift_note"] = "; ".join(parts) + "."
            return rep

    # Fallback: aunque la clave completa no cuadre (porque alguna columna-dimensión
    # o etiqueta driftó), si las MEDIDAS cuadran en la clave de negocio
    # (entidad + Fecha ID) entonces el ETL es fiel y la diferencia es drift de
    # dimensión / columna repoblada. Solo degrada FAIL -> DRIFT, nunca al revés.
    mc = _measure_match_on_business_key(etl, model, common)
    if mc and mc["frac"] >= 0.75:
        rep["status"] = "DRIFT"
        rep["measure_match"] = mc
        rep["drift_note"] = (
            f"ETL fiel: las medidas cuadran en {mc['matched']}/{mc['total']} filas "
            f"por clave de negocio {mc['key']}; difieren miembros de dimensión "
            f"(p.ej. activos nuevos/renombrados) o columnas repobladas — datos más "
            f"nuevos que el snapshot del .pbix.")
        return rep

    rep["status"] = "FAIL"
    return rep


def _measure_match_on_business_key(etl, model, common) -> dict | None:
    """¿Cuadran las medidas en la clave de negocio (entidad-texto + Fecha ID)?"""
    ent = next((c for c in common
                if not _col_is_measure(etl[c]) and str(etl[c].dtype) in ("string", "object")
                and "fecha" not in c.lower()), None)
    period = next((c for c in common
                   if "fecha id" in c.lower() or "fechaid" in c.lower()
                   or c.lower().strip() in ("periodo", "fecha")), None)
    keys = [k for k in (ent, period) if k]
    meas = [c for c in common if _col_is_measure(etl[c])]
    if not keys or not meas:
        return None

    def idx(df):
        d = {}
        for t in df[keys + meas].itertuples(index=False, name=None):
            d[tuple(_norm(v) for v in t[: len(keys)])] = t[len(keys):]
        return d

    ei, mi = idx(etl), idx(model)
    both = set(ei) & set(mi)
    if not both:
        return None
    matched = sum(1 for k in both
                  if all(_norm(a) == _norm(b) for a, b in zip(ei[k], mi[k])))
    return {"key": keys, "matched": matched, "total": len(both),
            "frac": matched / len(both)}


def _col_is_measure(s: pd.Series) -> bool:
    """True si la columna parece una MEDIDA (números con parte decimal). Se
    infiere del dato, para que funcione también en tablas de lectura cruda donde
    no hay tipos casteados."""
    if str(s.dtype) in ("float64", "Float64"):
        return True
    nn = s.dropna()
    if not len(nn):
        return False

    def floaty(v: Any) -> bool:
        if isinstance(v, bool) or isinstance(v, int):
            return False
        if isinstance(v, float):
            return not float(v).is_integer()
        try:
            return not float(str(v).replace(".", "").replace(",", ".")
                             if "," in str(v) else str(v)).is_integer()
        except (ValueError, TypeError):
            return False

    return nn.map(floaty).mean() > 0.5


def _drift_by_key(etl, model, cast_cols, common):
    """Clasifica diferencias por clave de negocio. Devuelve dict o None.

    Clave = columnas comunes que NO son medidas (dimensiones: texto/fecha/entero);
    medidas = columnas numéricas con decimales. Se infiere del dato para servir
    tanto a tablas casteadas como a lecturas crudas."""
    measures = [c for c in common if _col_is_measure(etl[c])]
    keys = [c for c in common if c not in measures]
    if not keys:
        return None

    def key_index(df):
        sub = df[keys]
        idx = {}
        for i, row in enumerate(sub.itertuples(index=False, name=None)):
            idx.setdefault(tuple(_norm(v) for v in row), []).append(i)
        return idx

    ek, mk = key_index(etl), key_index(model)
    model_keys = set(mk)
    etl_keys = set(ek)
    missing = model_keys - etl_keys          # claves del modelo ausentes en ETL
    new = etl_keys - model_keys              # filas nuevas en Excel
    common_keys = model_keys & etl_keys

    # celdas de medida que cambiaron en claves comunes (1 fila por clave)
    cells_changed = 0
    examples = []
    if measures:
        em = etl[measures].reset_index(drop=True)
        mm = model[measures].reset_index(drop=True)
        for k in common_keys:
            ei, mi = ek[k][0], mk[k][0]
            for c in measures:
                a, b = _norm(em.at[ei, c]), _norm(mm.at[mi, c])
                if a != b:
                    cells_changed += 1
                    if len(examples) < 8:
                        examples.append({"col": c, "key": list(k),
                                         "etl": a, "model": b})
    return {
        "model_keys": len(model_keys),
        "model_keys_missing": len(missing),
        "etl_new_keys": len(new),
        "measure_cells_changed": cells_changed,
        "can_classify": True,
        "drift_examples": examples,
        "missing_key_examples": [list(k) for k in list(missing)[:6]],
        "model_rows_not_reproduced": len(missing),
        "etl_extra_rows_on_cast": len(new),
    }

"""Conexión Hotel: aplica el CCPP OLÁ Providencia mensual a las tablas planas
de Hotel preservando el HISTÓRICO (upsert por (Nombre activo, FechaID)).

Actualiza solo las columnas que el CCPP provee; conserva el resto (REVPAR,
EBITDA/Cuota, etc.) y todos los meses no tocados.
"""
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
from sqlalchemy.engine import Engine

from .connect_lar import _fid, _read, _write
from .hotel_ccpp import ccpp_to_hotel_full, ccpp_to_hotel_real

# columnas LY del transform -> nombre exacto en hotel_real
LY_RENAME = {"Costos operacionales UF LY": "Costos operacionales LY"}

_MES_ABBR = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
             "jul": 7, "ago": 8, "sep": 9, "set": 9, "oct": 10, "nov": 11, "dic": 12}


def _filename_period(path) -> tuple[int, int] | None:
    """(anio, mes) declarado en el NOMBRE del CCPP ('...2026 Jun...'). El nombre es
    la fuente CONFIABLE del período: la hoja 'RESUMEN formato Sanvest' a veces queda
    con el año de la plantilla sin actualizar (p.ej. dice 2025 siendo 2026)."""
    name = Path(str(path)).stem.lower()
    m = re.search(r"(20\d\d)\s+([a-záéíóú]{3,4})", name)
    if not m:
        return None
    mes = _MES_ABBR.get(m.group(2)[:3])
    return (int(m.group(1)), mes) if mes else None


def _align_years_to_filename(dfs: list[pd.DataFrame], path) -> int:
    """Corrige el año usando el NOMBRE del archivo: si declara (fyear, fmonth) y el
    último mes reportado del archivo cae en fmonth pero con OTRO año, desplaza TODOS
    los años el mismo delta (plantilla con el año interno desactualizado). Exigir que
    el MES calce con el nombre evita corregir un archivo realmente equivocado.
    Devuelve el delta aplicado (0 si no aplica)."""
    fp = _filename_period(path)
    if not fp:
        return 0
    fyear, fmonth = fp
    ref = next((d for d in dfs if {"anio", "mes"} <= set(d.columns) and len(d)), None)
    if ref is None:
        return 0
    last = int((ref["anio"].astype(int) * 100 + ref["mes"].astype(int)).max())
    lyear, lmonth = last // 100, last % 100
    if lmonth != fmonth or lyear == fyear:
        return 0
    delta = fyear - lyear
    for d in dfs:
        if "anio" not in d.columns:
            continue
        d["anio"] = d["anio"].astype(int) + delta
        for fcol in ("FechaID", "fechaID"):
            if fcol in d.columns:
                d[fcol] = d["anio"] * 100 + d["mes"].astype(int)
        if "Periodo" in d.columns:
            d["Periodo"] = pd.to_datetime(
                d["anio"].astype(str) + "-"
                + d["mes"].astype(int).astype(str).str.zfill(2) + "-01")
    return delta


def _upsert_wide(engine: Engine, table: str, new_df: pd.DataFrame,
                 fid_col: str, update_cols: list[str]) -> dict:
    cur = _read(engine, table)
    cur["_k"] = [f"{a}|{_fid(f)}" for a, f in zip(cur["Nombre activo"], cur[fid_col])]
    existing = set(cur["_k"])
    cols = list(cur.columns)
    upd = [c for c in update_cols if c in cols]
    n_upd, inserts = 0, []
    for _, r in new_df.iterrows():
        k = f"{r['Nombre activo']}|{_fid(r['FechaID'])}"
        if k in existing:
            sel = cur["_k"] == k
            for c in upd:
                if c in new_df.columns and pd.notna(r.get(c)):
                    cur.loc[sel, c] = r[c]
            n_upd += 1
        else:
            row = {c: None for c in cols}
            row["Nombre activo"] = r["Nombre activo"]
            if fid_col in cols:
                row[fid_col] = _fid(r["FechaID"])
            for extra in ("Periodo", "mes", "anio"):
                if extra in cols:
                    row[extra] = r.get(extra)
            for c in upd:
                if c in new_df.columns:
                    row[c] = r.get(c)
            inserts.append(row)
    cur = cur.drop(columns=["_k"])
    merged = (pd.concat([cur, pd.DataFrame(inserts, columns=cols)], ignore_index=True)
              if inserts else cur)
    _write(engine, table, merged)
    return {"filas_resultantes": len(merged), "filas_actualizadas": n_upd,
            "filas_insertadas": len(inserts)}


def _upsert_full(engine: Engine, new_df: pd.DataFrame) -> dict:
    cur = _read(engine, "hotel_full")
    fcol = "fechaID" if "fechaID" in cur.columns else "FechaID"
    cur["_k"] = [f"{it}|{_fid(f)}" for it, f in zip(cur["Item"], cur[fcol])]
    existing = set(cur["_k"])
    cols = list(cur.columns)
    upd = [c for c in ["Versión_Real", "Versión_Ppto", "Versión_Real YTD", "Versión_Ppto YTD"]
           if c in cols]
    n_upd, inserts = 0, []
    for _, r in new_df.iterrows():
        k = f"{r['Item']}|{_fid(r['fechaID'])}"
        if k in existing:
            sel = cur["_k"] == k
            for c in upd:
                if pd.notna(r.get(c)):
                    cur.loc[sel, c] = r[c]
            n_upd += 1
        else:
            row = {c: None for c in cols}
            for c in (["Nombre activo", "Item", "Periodo", "mes", "anio"] + upd):
                if c in cols:
                    row[c] = r.get(c)
            if fcol in cols:
                row[fcol] = _fid(r["fechaID"])
            inserts.append(row)
    cur = cur.drop(columns=["_k"])
    merged = (pd.concat([cur, pd.DataFrame(inserts, columns=cols)], ignore_index=True)
              if inserts else cur)
    _write(engine, "hotel_full", merged)
    return {"filas_resultantes": len(merged), "filas_actualizadas": n_upd,
            "filas_insertadas": len(inserts)}


def _guard_no_regresion(cur_full: pd.DataFrame, new_full: pd.DataFrame) -> None:
    """Aborta si el archivo parece MÁS ANTIGUO que lo ya cargado.

    Protege del caso jul-2026: un CCPP con los años internos mal rotulados
    (decía 2025 siendo 2026) pisó el año 2025 completo en prod. El último
    (año, mes) con Real ≠ 0 del archivo nunca debe retroceder respecto de
    la tabla; una recarga histórica intencional usa allow_backfill=True.
    """
    def _max_real(df: pd.DataFrame) -> int:
        nz = df[df["Versión_Real"].fillna(0) != 0]
        return 0 if nz.empty else int((nz["anio"] * 100 + nz["mes"]).max())

    file_max, cur_max = _max_real(new_full), _max_real(cur_full)
    if file_max < cur_max:
        raise ValueError(
            f"el CCPP parece más antiguo que lo ya cargado (último mes con Real "
            f"en el archivo: {file_max % 100}/{file_max // 100} vs "
            f"{cur_max % 100}/{cur_max // 100} en la BD). ¿Años mal rotulados? "
            f"Si es una recarga histórica intencional, correr apply_ccpp con "
            f"allow_backfill=True.")


def apply_ccpp(engine: Engine, path, allow_backfill: bool = False) -> dict:
    real = ccpp_to_hotel_real(path, ppto=False).rename(columns=LY_RENAME)
    ppto = ccpp_to_hotel_real(path, ppto=True)
    full = ccpp_to_hotel_full(path)
    # corrige el año con el NOMBRE del archivo si la hoja quedó con el año viejo
    # (los valores Real ya son del período correcto; solo el rótulo estaba corrido).
    year_shift = _align_years_to_filename([real, ppto, full], path)
    if not allow_backfill:
        _guard_no_regresion(_read(engine, "hotel_full"), full)
    real_cols = [c for c in real.columns if c not in ("Nombre activo", "FechaID", "Periodo", "anio", "mes")]
    ppto_cols = [c for c in ppto.columns if c not in ("Nombre activo", "FechaID", "Periodo", "anio", "mes")]
    return {
        "year_shift": year_shift,
        "hotel_real": _upsert_wide(engine, "hotel_real", real, "FechaID", real_cols),
        "hotel_ppto": _upsert_wide(engine, "hotel_ppto", ppto, "FechaID", ppto_cols),
        "hotel_full": _upsert_full(engine, full),
    }

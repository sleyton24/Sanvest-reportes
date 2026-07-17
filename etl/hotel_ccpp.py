"""Transform: CCPP OLÁ Providencia (hoja 'RESUMEN formato Sanvest') -> tablas
planas de Hotel. Definición de Seba: EBITDA = GOP, Flujo = Total Flujo Caja
Consolidado, Costos = Gastos Operacionales, Ingresos = Ventas Totales.

Layout: por mes [Real, Ppto, Diff, Real LY, Diff LY]; métricas en filas (col B/0).
Real=marcador 'Real' en fila 7; fecha en fila 6; LY = Real+3 (mismo mes año ant.).
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

import openpyxl
import pandas as pd

SHEET = "RESUMEN formato Sanvest"
ACTIVO = "OLA HOTEL"

# métrica destino -> (fila, signo)  [fila por etiqueta para robustez]
ROW_LABELS = {
    "Ingresos totales": ("Ventas Totales", 1),
    "Costos operacionales UF": ("Gastos Operacionales", -1),   # viene negativo
    "EBITDA UF": ("GOP", 1),                                   # Seba: EBITDA=GOP
    "Flujo (Resultado) UF": ("Total Flujo Caja Consolidado", 1),
    "ADR Room (CLP)": ("Tarif. promedio ($)", 1),
    "ADR Room (USD)": ("(US$)", 1),
    "Ocupación pago 2024 (%)": ("% Ocupación", 1),
}


def _load(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(wb[SHEET].iter_rows(values_only=True))
    wb.close()
    return rows


def _find_row(rows, label):
    lab = label.strip().lower()
    for ri, r in enumerate(rows):
        for c in r[:7]:
            if isinstance(c, str) and c.strip().lower() == lab:
                return ri
    for ri, r in enumerate(rows):  # 'contiene'
        for c in r[:7]:
            if isinstance(c, str) and lab in c.strip().lower():
                return ri
    return None


def _last_reported_month(rows):
    """Fecha del último mes con operación reportada (Ocupación > 0). Evita cargar
    meses 'placeholder'/futuros que traen la marca 'Real' pero sin dato genuino
    (p.ej. junio con ingresos parciales pero ocupación 0). Devuelve None si no se
    encuentra la fila de ocupación (en cuyo caso no se filtra)."""
    occ = _find_row(rows, "% Ocupación")
    if occ is None:
        return None
    drow, mrow = rows[6], rows[7]
    best = None
    for ci, v in enumerate(mrow):
        if v == "Real" and ci < len(drow) and isinstance(drow[ci], dt.datetime):
            o = rows[occ][ci] if ci < len(rows[occ]) else None
            if isinstance(o, (int, float)) and o > 0 and (best is None or drow[ci] > best):
                best = drow[ci]
    return best


def _real_month_cols(rows):
    """[(date, real_col)] de los meses reportados (excluye YTD: su fecha no es
    datetime; y meses sin operación real según _last_reported_month)."""
    drow, mrow = rows[6], rows[7]
    cutoff = _last_reported_month(rows)
    return [(drow[ci], ci) for ci, v in enumerate(mrow)
            if v == "Real" and ci < len(drow) and isinstance(drow[ci], dt.datetime)
            and (cutoff is None or drow[ci] <= cutoff)]


# Item en hotel_full -> (etiqueta de fila en CCPP, signo)
FULL_ITEMS = {
    "Ingresos totales": ("Ventas Totales", 1),
    "Costos operacionales UF": ("Gastos Operacionales", -1),
    "EBITDA UF": ("GOP", 1),
    " Flujo Caja Consolidado": ("Total Flujo Caja Consolidado", 1),
}

# --- Hoja "Informe gestión <año>": fuente de REVPAR, YTD y del Flujo (en la hoja
# RESUMEN el Flujo viene con #REF! y no hay REVPAR ni YTD). Layout por mes:
# [Real, Ppto, Diff, Real LY, Diff LY]; además un bloque "YTD <año>" (Real, Ppto…).
INFORME_SHEET = "Informe gestión"   # se resuelve por prefijo (año variable)
IG_FLUJO = "Total Flujo Caja Consolidado (UF)"
IG_REVPAR_CLP = "TRevPAR (CLP)"
IG_REVPAR_USD = "TRevPAR (US$)"
IG_ADR_CLP = "ADR ($) Room"
IG_ADR_USD = "ADR (US$) Room"


def _informe_gestion(path):
    """De la hoja 'Informe gestión' devuelve (rows, months, ytd_col):
      months = {(anio, mes): col_Real}  ·  ytd_col = col Real del bloque 'YTD <año>'.
    """
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = next((s for s in wb.sheetnames
                  if s.strip().lower().startswith(INFORME_SHEET.lower())), None)
    if sheet is None:
        wb.close()
        raise ValueError(f"no encuentro la hoja '{INFORME_SHEET} <año>' en el CCPP")
    rows = list(wb[sheet].iter_rows(values_only=True))
    wb.close()
    drow = rows[6]                      # fechas / encabezados de bloque
    mrow = rows[8]                      # marcadores Real/Ppto/…
    months = {(drow[ci].year, drow[ci].month): ci
              for ci, v in enumerate(mrow)
              if v == "Real" and ci < len(drow) and isinstance(drow[ci], dt.datetime)}
    year = max((y for y, _ in months), default=None)
    ytd_col = None
    for ci, v in enumerate(mrow):
        h = drow[ci] if ci < len(drow) else None
        if v == "Real" and isinstance(h, str) and "YTD" in h and year and str(year) in h:
            ytd_col = ci
            break
    return rows, months, ytd_col


def _ig_val(rows, ri, ci):
    if ri is None or ci is None or ci >= len(rows[ri]):
        return None
    v = rows[ri][ci]
    return float(v) if isinstance(v, (int, float)) else None


def ccpp_to_hotel_full(path) -> pd.DataFrame:
    """Formato largo (Item x Versión_Real/Ppto + YTD) para hotel_full."""
    rows = _load(path)
    months = _real_month_cols(rows)
    ridx = {it: _find_row(rows, lbl) for it, (lbl, _) in FULL_ITEMS.items()}

    def val(ri, ci):
        if ri is None or ci >= len(rows[ri]):
            return None
        v = rows[ri][ci]
        return float(v) if isinstance(v, (int, float)) else None

    recs = []
    for d, rc in months:
        for it, (lbl, sign) in FULL_ITEMS.items():
            vr, vp = val(ridx[it], rc), val(ridx[it], rc + 1)
            recs.append({"Nombre activo": ACTIVO, "Item": it, "Periodo": d,
                         "anio": d.year, "mes": d.month, "fechaID": d.year * 100 + d.month,
                         "Versión_Real": sign * vr if vr is not None else None,
                         "Versión_Ppto": sign * vp if vp is not None else None})
    df = pd.DataFrame(recs).sort_values(["Item", "fechaID"])

    # El Flujo viene con #REF! en la hoja RESUMEN → tomarlo de 'Informe gestión'.
    ig_rows, ig_months, _ = _informe_gestion(path)
    r_flujo = _find_row(ig_rows, IG_FLUJO)
    for i, r in df.iterrows():
        if str(r["Item"]).strip() != "Flujo Caja Consolidado":
            continue
        ci = ig_months.get((int(r["anio"]), int(r["mes"])))
        vr, vp = _ig_val(ig_rows, r_flujo, ci), _ig_val(ig_rows, r_flujo, ci + 1 if ci is not None else None)
        if vr is not None:
            df.at[i, "Versión_Real"] = vr
        if vp is not None:
            df.at[i, "Versión_Ppto"] = vp

    g = df.groupby(["Item", "anio"])
    df["Versión_Real YTD"] = g["Versión_Real"].cumsum()
    df["Versión_Ppto YTD"] = g["Versión_Ppto"].cumsum()
    return df


def ccpp_to_hotel_real(path, ppto=False) -> pd.DataFrame:
    """Devuelve filas mensuales (Real o Ppto) con las columnas clave de hotel_real,
    + columnas LY (…'LY')."""
    rows = _load(path)
    drow, mrow = rows[6], rows[7]
    # columnas Real mensuales reportadas (excluye YTD y meses sin operación real)
    cutoff = _last_reported_month(rows)
    real_cols = [ci for ci, v in enumerate(mrow)
                 if v == "Real" and ci < len(drow) and isinstance(drow[ci], dt.datetime)
                 and (cutoff is None or drow[ci] <= cutoff)]
    ridx = {m: _find_row(rows, lbl) for m, (lbl, _) in ROW_LABELS.items()}

    def val(ri, ci):
        if ri is None or ci is None or ci >= len(rows[ri]):
            return None
        v = rows[ri][ci]
        return float(v) if isinstance(v, (int, float)) else None

    out = []
    for rc in real_cols:
        d = drow[rc]
        col = rc + 1 if ppto else rc          # Real=rc, Ppto=rc+1
        ly = rc + 3                            # Real LY (mismo mes año anterior)
        row = {"Nombre activo": ACTIVO, "Periodo": d, "anio": d.year, "mes": d.month,
               "FechaID": d.year * 100 + d.month}
        for m, (lbl, sign) in ROW_LABELS.items():
            v = val(ridx[m], col)
            row[m] = sign * v if v is not None else None
            if not ppto:  # LY solo para Real
                vly = val(ridx[m], ly)
                row[m + " LY"] = sign * vly if vly is not None else None
        out.append(row)
    df = pd.DataFrame(out)

    # Enriquecer desde 'Informe gestión': Flujo (arregla #REF!), REVPAR mensual+LY,
    # y las columnas YTD (ADR/REVPAR CLP/USD). La hoja RESUMEN no las trae.
    ig_rows, ig_months, ig_ytd = _informe_gestion(path)
    r = {k: _find_row(ig_rows, k) for k in
         (IG_FLUJO, IG_REVPAR_CLP, IG_REVPAR_USD, IG_ADR_CLP, IG_ADR_USD)}
    off = 1 if ppto else 0
    for c in ("REVPAR (CLP)", "REVPAR USD", "REVPAR USD LY",
              "ADR Room (CLP) YTD", "ADR Room (USD) YTD",
              "REVPAR (CLP) YTD", "REVPAR (USD) YTD"):
        if c not in df.columns:
            df[c] = pd.NA
    latest = max(((int(a) * 100 + int(m)) for a, m in zip(df["anio"], df["mes"])),
                 default=None)
    for i, rw in df.iterrows():
        key = (int(rw["anio"]), int(rw["mes"]))
        ci = ig_months.get(key)
        if ci is not None:
            col = ci + off
            fv = _ig_val(ig_rows, r[IG_FLUJO], col)
            if fv is not None:
                df.at[i, "Flujo (Resultado) UF"] = fv
            rc, ru = _ig_val(ig_rows, r[IG_REVPAR_CLP], col), _ig_val(ig_rows, r[IG_REVPAR_USD], col)
            if rc is not None:
                df.at[i, "REVPAR (CLP)"] = rc
            if ru is not None:
                df.at[i, "REVPAR USD"] = ru
            if not ppto:  # LY (Real LY = col+3)
                fly = _ig_val(ig_rows, r[IG_FLUJO], ci + 3)
                if fly is not None:
                    df.at[i, "Flujo (Resultado) UF LY"] = fly
                uly = _ig_val(ig_rows, r[IG_REVPAR_USD], ci + 3)
                if uly is not None:
                    df.at[i, "REVPAR USD LY"] = uly
        # YTD solo para el último mes reportado (el bloque 'YTD' es único, al corte)
        if ig_ytd is not None and int(rw["anio"]) * 100 + int(rw["mes"]) == latest:
            yc = ig_ytd + off
            for dst, src in (("ADR Room (CLP) YTD", IG_ADR_CLP), ("ADR Room (USD) YTD", IG_ADR_USD),
                             ("REVPAR (CLP) YTD", IG_REVPAR_CLP), ("REVPAR (USD) YTD", IG_REVPAR_USD)):
                yv = _ig_val(ig_rows, r[src], yc)
                if yv is not None:
                    df.at[i, dst] = yv
    return df

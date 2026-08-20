"""Transform: Budget_Comparison_Accrual (Bemiston/MILA/St Grand) -> P&L largo.

Cada archivo = un mes (MTD = mes actual; PTD = YTD). Líneas de cuenta en col1,
MTD Actual(col2)/MTD Budget(col3), PTD Actual(col6)/PTD Budget(col7).
Mapeo: cuenta -> Nivel 1; Real=MTD Actual, Monto=MTD Budget, YTD=PTD Actual.
"""
from __future__ import annotations

import re
from pathlib import Path

import openpyxl
import pandas as pd

MONTHS = {m: i + 1 for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}


def _period_end(rows) -> tuple[int, int] | None:
    """Lee 'Period = Jan 2025-Dec 2025' -> (anio, mes) del fin (mes MTD)."""
    for r in rows[:6]:
        for v in r:
            if isinstance(v, str) and "period" in v.lower():
                m = re.findall(r"([A-Za-z]{3})\s+(\d{4})", v)
                if m:
                    mon, yr = m[-1]
                    return int(yr), MONTHS.get(mon.lower(), 0)
    return None


def _resolve_layout(rows) -> tuple[int, int | None, int | None, int | None]:
    """Localiza la fila de encabezado y devuelve los índices de columna por rol
    (real_mensual, ppto_mensual, ytd_real, ytd_ppto); None donde el informe no lo trae.
    Se distingue por el rótulo de la 3ª columna de datos (índice 3):

    - **Budget Comparison** (…Actual | …Budget | Var | %Var | …Actual | …Budget):
      la col 3 es "…Budget" -> mensual en col 2/3, YTD en col 6/7.
    - **Income Statement / Financials** (Period to Date | % | Year to Date | %
      [| PTD Budget | YTD Budget | Annual Budget]): la col 3 es "%". Real=col 2,
      YTD real = col "Year to Date". El presupuesto SOLO existe en la variante "con
      presupuesto" (se adjuntan "PTD Budget"/"YTD Budget" a la derecha); si no están,
      ppto/ytd_ppto = None para NO pisar el presupuesto ya cargado.
    """
    for r in rows[:8]:
        hdr = [str(v).strip().lower() if isinstance(v, str) else "" for v in r]
        joined = " ".join(hdr)
        if "actual" not in joined and "period to date" not in joined:
            continue
        find = lambda kw: next((i for i, c in enumerate(hdr) if kw in c), None)
        if len(hdr) > 3 and "budget" in hdr[3]:      # Budget Comparison
            return 2, 3, 6, 7
        ytd = find("year to date")                   # Income Statement (con/sin ppto)
        return 2, find("ptd budget"), (ytd if ytd is not None else 4), find("ytd budget")
    return 2, 3, 6, 7                                 # por defecto: Budget Comparison


def budget_comparison_to_pnl(path) -> pd.DataFrame:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    pe = _period_end(rows)
    if not pe:
        raise RuntimeError(f"No pude leer el período en {Path(path).name}")
    anio, mes = pe
    fid = anio * 100 + mes
    c_real, c_ppto, c_ytd, c_ytdp = _resolve_layout(rows)

    def _val(r, i):  # celda numérica en la columna i, si existe
        return r[i] if i is not None and len(r) > i and isinstance(r[i], (int, float)) else None

    recs = []
    for r in rows:
        name = r[1] if len(r) > 1 else None
        real = _val(r, c_real)
        if not (isinstance(name, str) and name.strip()):
            continue
        if real is None:
            continue
        if name.strip().lower().startswith("total"):  # subtotal -> omitir
            continue
        recs.append({
            "Nivel 1": name.strip(),
            "Real": real,
            "Monto": _val(r, c_ppto),        # None en Income Statement -> preserva ppto
            "YTD": _val(r, c_ytd),
            "YTD PPTO": _val(r, c_ytdp),     # None en Income Statement -> preserva ppto YTD
            "Año": anio, "Mes": mes, "FechaID": fid,
        })
    return pd.DataFrame(recs)


def _cols_por_encabezado(rows, archivo: str) -> tuple[int, int, int, int]:
    """Índices de (PTD Actual, PTD Budget, YTD Actual, YTD Budget) leídos del ENCABEZADO.

    Antes estaban fijos (2,3,7,8) porque el informe de St Grand trae una columna extra
    ('PTD Change Comments') que corre el bloque YTD. Cuando Yardi cambia las columnas
    de un mes a otro, las posiciones fijas leen la celda equivocada EN SILENCIO: el
    informe de jul-2026 dejó el YTD de presupuesto en 9.963 (vs ~6,1 M) porque cayó
    sobre la columna de varianza. Buscar por nombre aguanta el cambio; si no aparecen
    las cuatro, se levanta error en vez de cargar basura."""
    for r in rows[:12]:
        hdr = [str(v).strip().lower() if isinstance(v, str) else "" for v in r]
        if not any("ytd actual" in c for c in hdr):
            continue
        def buscar(*claves):
            for i, c in enumerate(hdr):
                if all(k in c for k in claves):
                    return i
            return None
        real, ppto = buscar("ptd", "actual"), buscar("ptd", "budget")
        ytd, ytdp = buscar("ytd", "actual"), buscar("ytd", "budget")
        faltan = [n for n, v in (("PTD Actual", real), ("PTD Budget", ppto),
                                 ("YTD Actual", ytd), ("YTD Budget", ytdp)) if v is None]
        if faltan:
            raise RuntimeError(f"St Grand ({archivo}): la fila de encabezados no trae "
                               f"{faltan}. Columnas vistas: {[c for c in hdr if c]}")
        return real, ppto, ytd, ytdp
    raise RuntimeError(f"St Grand ({archivo}): no encontré la fila de encabezados "
                       f"(se busca una con 'YTD Actual')")


def st_grand_to_pnl(path) -> pd.DataFrame:
    """St Grand llega en 'Consolidated Reports' (Cover Sheet vacía + hoja 'Budget
    Comp'/'Budget Comp Comm' = P&L consolidado res+comm). Diferencias con Bemiston/MILA:
    - columna extra ('PTD Change Comments') que corre el bloque YTD: las columnas se
      ubican por ENCABEZADO (_cols_por_encabezado), no por posición;
    - se carga SOLO lo OPERACIONAL, hasta NET OPERATING INCOME (fuera balance, cash flow
      y subtotales); la sección sale del código de cuenta: 3xxx=REVENUE, 4xxx/5xxx=
      OPERATING EXPENSES. Verificado: Σ ingresos 853.670 − Σ gastos 419.468 = NOI 434.202.
    Devuelve además la columna 'Seccion' para el upsert (signo REVENUE +, gastos −)."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = None
    for s in wb.sheetnames:                 # hoja consolidada: 'Budget Comp'* que NO sea 'Resy'
        sl = s.strip().lower()
        if sl.startswith("budget comp") and "resy" not in sl:
            sheet = s
            break
    if sheet is None:
        wb.close()
        raise RuntimeError(f"St Grand: no encontré la hoja 'Budget Comp' en {Path(path).name}")
    rows = list(wb[sheet].iter_rows(values_only=True))
    wb.close()
    pe = _period_end(rows)
    if not pe:
        raise RuntimeError(f"St Grand: no pude leer el período en la hoja '{sheet}'")
    anio, mes = pe
    fid = anio * 100 + mes
    c_real, c_ppto, c_ytd, c_ytdp = _cols_por_encabezado(rows, Path(path).name)
    val = lambda r, i: r[i] if len(r) > i and isinstance(r[i], (int, float)) else None
    recs = []
    for r in rows:
        code = str(r[0]).strip() if len(r) > 0 and r[0] is not None else ""
        name = r[1] if len(r) > 1 else None
        real = val(r, c_real)
        if isinstance(name, str) and "net operating income" in name.strip().lower():
            break                                   # solo operacional: cortar en NOI
        if not (isinstance(name, str) and name.strip()):
            continue
        if not isinstance(real, (int, float)):        # saltar encabezados de sección (sin valor)
            continue
        if name.strip().lower().startswith("total"):  # saltar subtotales
            continue
        if code[:1] not in ("3", "4", "5"):           # 3=ingresos, 4/5=gastos op; evita balance
            continue
        recs.append({
            "Nivel 1": name.strip(),
            "Seccion": "REVENUE" if code[:1] == "3" else "OPERATING EXPENSES",
            "Real": real,
            "Monto": val(r, c_ppto),
            "YTD": val(r, c_ytd),
            "YTD PPTO": val(r, c_ytdp),
            "Año": anio, "Mes": mes, "FechaID": fid,
        })
    df = pd.DataFrame(recs)
    # Chequeo del acumulado: el YTD nunca puede ser MENOR que el mes (es su suma).
    # Es la firma exacta del informe de jul-2026, que dejó el YTD de presupuesto en
    # 9.963 contra 863.815 del mes; avisa en vez de cargar la cifra en silencio.
    if mes > 1 and len(df):
        for col_mes, col_ytd, etiqueta in (("Monto", "YTD PPTO", "presupuesto"),
                                           ("Real", "YTD", "real")):
            m, y = df[col_mes].sum(), df[col_ytd].sum()
            if m and y and abs(y) < abs(m) * 0.9:
                print(f"[usa] OJO St Grand {anio}-{mes:02d}: el YTD de {etiqueta} "
                      f"({y:,.0f}) es menor que el mes ({m:,.0f}). ¿Cambiaron las "
                      f"columnas del informe? Revisar antes de confiar en el YTD.")
    return df

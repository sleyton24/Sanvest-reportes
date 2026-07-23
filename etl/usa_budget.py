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
    (real_mensual, ppto_mensual, ytd_real, ytd_ppto). Soporta dos informes:

    - **Budget Comparison** (…Actual | …Budget | Var | %Var | …Actual | …Budget):
      mensual en col 2/3, YTD en col 6/7.
    - **Income Statement / Financials** (Period to Date | % | Year to Date | %):
      solo trae REALES —sin presupuesto—; mensual en col 2, YTD en col 4, y
      ppto/ytd_ppto = None para NO pisar el presupuesto ya cargado.
    """
    for r in rows[:8]:
        hdr = [str(v).strip().lower() if isinstance(v, str) else "" for v in r]
        joined = " ".join(hdr)
        if "actual" in joined or "period to date" in joined:
            if any("budget" in c for c in hdr):
                return 2, 3, 6, 7            # Budget Comparison
            return 2, None, 4, None          # Income Statement (sin presupuesto)
    return 2, 3, 6, 7                         # por defecto: Budget Comparison


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


def st_grand_to_pnl(path) -> pd.DataFrame:
    """St Grand llega en 'Consolidated Reports' (Cover Sheet vacía + hoja 'Budget
    Comp'/'Budget Comp Comm' = P&L consolidado res+comm). Diferencias con Bemiston/MILA:
    - columna extra ('PTD Change Comments') que corre el YTD a las columnas H/I (7/8);
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
    recs = []
    for r in rows:
        code = str(r[0]).strip() if len(r) > 0 and r[0] is not None else ""
        name = r[1] if len(r) > 1 else None
        real = r[2] if len(r) > 2 else None
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
            "Monto": r[3] if len(r) > 3 and isinstance(r[3], (int, float)) else None,
            "YTD": r[7] if len(r) > 7 and isinstance(r[7], (int, float)) else None,
            "YTD PPTO": r[8] if len(r) > 8 and isinstance(r[8], (int, float)) else None,
            "Año": anio, "Mes": mes, "FechaID": fid,
        })
    return pd.DataFrame(recs)

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

    recs = []
    for r in rows:
        name = r[1] if len(r) > 1 else None
        mtd_a = r[2] if len(r) > 2 else None
        if not (isinstance(name, str) and name.strip()):
            continue
        if not isinstance(mtd_a, (int, float)):
            continue
        if name.strip().lower().startswith("total"):  # subtotal -> omitir
            continue
        recs.append({
            "Nivel 1": name.strip(),
            "Real": mtd_a,
            "Monto": r[3] if isinstance(r[3], (int, float)) else None,
            "YTD": r[6] if len(r) > 6 and isinstance(r[6], (int, float)) else None,
            "YTD PPTO": r[7] if len(r) > 7 and isinstance(r[7], (int, float)) else None,
            "Año": anio, "Mes": mes, "FechaID": fid,
        })
    return pd.DataFrame(recs)

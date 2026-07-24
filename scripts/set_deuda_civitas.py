"""Reemplaza `deuda_civitas` con el cronograma de amortización vigente de Civitas.

El dashboard muestra el CAPITAL vigente (saldo) al mes: toma la col "Capital" de la
última fila ≤ mes elegido. Aquí guardamos, por cuota mensual, el capital amortizado
("Amortización") y el saldo pendiente ("Capital" = inicial − amortizado acumulado).

Editar CUOTAS / PRIMERA_CUOTA y correr:
    .venv/Scripts/python.exe scripts/set_deuda_civitas.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from etl.db import get_engine
from etl.connect_lar import _read, _write

TABLE = "deuda_civitas"
PROYECTO = "Civitas"
PRIMERA = (2024, 5)          # 1ª cuota: 24-may-2024
N_CUOTAS = 30                # hasta 24-oct-2026
# capital amortizado por número de cuota (las no listadas = 0)
AMORT = {12: 11568.1849, 24: 10078.5359, 30: 336146.6555}
INICIAL = round(sum(AMORT.values()), 4)   # 357.793,3763


def _fids():
    y, m = PRIMERA
    for _ in range(N_CUOTAS):
        yield y * 100 + m
        m += 1
        if m > 12:
            m = 1; y += 1


def build(cur_cols) -> pd.DataFrame:
    rows = []
    saldo = INICIAL
    for n, fid in enumerate(_fids(), start=1):
        amort = AMORT.get(n, 0.0)
        saldo = round(saldo - amort, 4)      # saldo tras pagar la cuota n
        anio, mes = fid // 100, fid % 100
        rec = {
            "Proyecto": PROYECTO, "Amortización": amort, "Capital": saldo,
            "Año": anio, "mes": mes, "Fecha": f"{anio}-{mes:02d}-24",
            "FechaID": fid, "aux": n,
        }
        rows.append({c: rec.get(c) for c in cur_cols})
    return pd.DataFrame(rows, columns=list(cur_cols))


def main() -> None:
    eng = get_engine()
    cur = _read(eng, TABLE)
    df = build(cur.columns)
    _write(eng, TABLE, df)
    print(f"{TABLE}: {len(df)} cuotas · inicial {INICIAL:,.0f} · saldo final {df['Capital'].iloc[-1]:,.0f}")


if __name__ == "__main__":
    main()

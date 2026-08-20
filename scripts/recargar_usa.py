# -*- coding: utf-8 -*-
"""Recarga informes USA (Yardi) en `usa_pnl` con el ETL corregido.

Se usa cuando el ETL cambió y hay que rehacer meses ya cargados. Antes de escribir
deja un respaldo CSV de la tabla completa, e imprime el antes/después por activo y
mes contra los totales del propio informe.

    python scripts/recargar_usa.py "Ejemplos para subir/USA/*.xlsx"        # ensayo
    python scripts/recargar_usa.py "Ejemplos para subir/USA/*.xlsx" --si   # escribe

Sin --si no toca la base: solo muestra lo que quedaría.
"""
from __future__ import annotations

import glob
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from etl.connect_usa import _fid, _read, _write, apply_yardi        # noqa: E402
from etl.db import get_engine, load_dotenv                          # noqa: E402

RESP = Path(__file__).resolve().parents[1] / "data" / "respaldos"


def totales(df: pd.DataFrame) -> dict:
    d = df.copy()
    d["Real"] = pd.to_numeric(d["Real"], errors="coerce")
    d["_fid"] = d["FechaID"].map(_fid)
    sec = d["Seccion"].astype(str).str.upper()
    out = {}
    for (act, fid), g in d.groupby(["Activo", "_fid"]):
        s = sec.loc[g.index]
        out[(act, int(fid))] = (g.loc[s == "REVENUE", "Real"].sum(),
                                g.loc[s == "OPERATING EXPENSES", "Real"].sum())
    return out


def main(argv: list[str]) -> int:
    escribir = "--si" in argv
    patrones = [a for a in argv[1:] if not a.startswith("--")]
    archivos = sorted({p for pat in patrones for p in glob.glob(pat)})
    archivos = [a for a in archivos
                if a.lower().endswith((".xlsx", ".xlsm")) and "kpis" not in Path(a).name.lower()
                and not Path(a).name.startswith("~$")]
    if not archivos:
        print("No hay informes que coincidan.")
        return 1

    load_dotenv()
    engine = get_engine()
    antes_df = _read(engine, "usa_pnl")
    antes = totales(antes_df)

    if escribir:
        RESP.mkdir(parents=True, exist_ok=True)
        # el nombre lo fija el mes máximo cargado, no la hora: repetir el respaldo
        # el mismo día sobrescribe en vez de llenar la carpeta de copias.
        dest = RESP / f"usa_pnl_antes_de_recargar_{int(max(k[1] for k in antes))}.csv"
        antes_df.to_csv(dest, index=False, encoding="utf-8")
        print(f"respaldo: {dest}  ({len(antes_df)} filas)\n")
    else:
        print("ENSAYO (sin --si no escribe nada)\n")
        estado = {"usa_pnl": antes_df.copy()}
        import etl.connect_usa as cu
        cu._read = lambda engine, t: estado[t].copy()
        cu._write = lambda engine, t, df: estado.__setitem__(t, df.copy())

    for a in archivos:
        try:
            r = apply_yardi(engine, a)
        except Exception as e:                                        # noqa: BLE001
            print(f"  {Path(a).name[:48]:50s} ERROR: {type(e).__name__}: {e}")
            continue
        print(f"  {Path(a).name[:48]:50s} act={r['filas_actualizadas']:4d} ins={r['filas_insertadas']:4d} "
              f"borr={r.get('filas_borradas', 0):4d} dup={r.get('filas_duplicadas_eliminadas', 0):3d}")

    import etl.connect_usa as cu
    despues = totales(cu._read(engine, "usa_pnl"))
    print(f"\n{'activo':10s}{'mes':>8}{'ingresos antes':>16}{'ingresos ahora':>16}"
          f"{'gastos antes':>15}{'gastos ahora':>15}")
    for k in sorted(despues):
        ra, ga = antes.get(k, (0.0, 0.0))
        rd, gd = despues[k]
        if abs(rd - ra) < 0.01 and abs(gd - ga) < 0.01:
            continue
        print(f"{k[0]:10s}{k[1]:>8}{ra:>16,.2f}{rd:>16,.2f}{ga:>15,.2f}{gd:>15,.2f}")
    print("\nescrito en la base" if escribir else "\nnada escrito (agrega --si)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

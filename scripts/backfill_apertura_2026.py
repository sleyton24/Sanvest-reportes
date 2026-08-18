"""Carga histórica de la APERTURA POR CUENTA (SOHO / PARK / Hotel) sin re-subir
por la app: corre los extractores nuevos sobre los archivos locales y hace upsert
SOLO en las tablas de apertura (indicadores_financieros_lar y hotel_pnl) — no
toca indicadores_financieros, real_ppto_ly ni hotel_real/ppto/full.

Cada informe mensual trae las columnas del AÑO COMPLETO (Real de los meses
cerrados + Ppto ene–dic), así que basta el informe MÁS RECIENTE de cada uno
para reconstruir todo el 2026. Las cargas futuras por la app ya incluyen la
apertura (apply_informes / apply_ccpp la upsertean solas).

Uso:
    python scripts/backfill_apertura_2026.py             # BD del .env (dev SQLite o prod PG*)
    python scripts/backfill_apertura_2026.py --dry-run   # solo muestra qué haría
    python scripts/backfill_apertura_2026.py --soho R --park R --ccpp R  # otras rutas
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from etl.db import get_engine, load_dotenv  # noqa: E402
from etl.informes_lar import informe_to_apertura  # noqa: E402
from etl.connect_lar import upsert_indicadores_lar  # noqa: E402
from etl.hotel_ccpp import ccpp_to_hotel_pnl  # noqa: E402
from etl.connect_hotel import _align_pnl_to_filename, upsert_hotel_pnl  # noqa: E402

EJ = ROOT / "Ejemplos para subir"
DEFAULTS = {
    "soho": EJ / "LAR GROUP" / "Informe de Gestión Soho 2026_Mayo (SV).xlsx",
    "park": EJ / "LAR GROUP" / "Informe de Gestion PARK 2026_Mayo (SV).xlsx",
    "ccpp": EJ / "CCPP OLÁ Providencia 2026 May.xlsx",
}


def main() -> None:
    ap = argparse.ArgumentParser(description="Backfill apertura por cuenta 2026.")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--prod", action="store_true",
                    help="confirma escribir en una BD Postgres (producción)")
    for k in DEFAULTS:
        ap.add_argument(f"--{k}", default=str(DEFAULTS[k]))
    args = ap.parse_args()

    load_dotenv()
    engine = get_engine()
    print(f"BD destino: {engine.url}")
    # el .env local apunta a PROD (PG*): exigir confirmación explícita para escribir
    # ahí — la apertura solo debe cargarse DESPUÉS de desplegar el front que filtra
    # por 'Nombre activo' (si no, la vista LAR Group mezcla holding con SOHO/PARK).
    if engine.url.get_backend_name().startswith("postgres") and not (args.prod or args.dry_run):
        sys.exit("La BD destino es Postgres (¿producción?). Re-ejecuta con --prod para "
                 "confirmar (y solo tras desplegar el front nuevo), o usa --dry-run.")

    dfs = []
    for activo, key in (("SOHO", "soho"), ("PARK", "park")):
        p = Path(getattr(args, key))
        if not p.exists():
            print(f"  [{activo}] NO ENCONTRADO: {p} — se omite")
            continue
        df = informe_to_apertura(p, activo)
        con_real = df[df["Versión_Real"].notna()]["FechaID"]
        print(f"  [{activo}] {p.name}: {len(df)} filas, Real hasta "
              f"{int(con_real.max()) if len(con_real) else '—'}")
        dfs.append(df)

    ccpp = Path(args.ccpp)
    pnl = None
    if ccpp.exists():
        pnl = ccpp_to_hotel_pnl(ccpp)
        shift = _align_pnl_to_filename(pnl, ccpp)
        con_real = pnl[pnl["Versión_Real"].notna()]["FechaID"]
        print(f"  [Hotel] {ccpp.name}: {len(pnl)} filas, Real hasta "
              f"{int(con_real.max()) if len(con_real) else '—'}"
              + (f" (año corregido {shift:+d})" if shift else ""))
    else:
        print(f"  [Hotel] NO ENCONTRADO: {ccpp} — se omite")

    if args.dry_run:
        print("(dry-run) nada escrito.")
        return
    if dfs:
        res = upsert_indicadores_lar(engine, pd.concat(dfs, ignore_index=True))
        print(f"  indicadores_financieros_lar: {res}")
    if pnl is not None:
        res = upsert_hotel_pnl(engine, pnl)
        print(f"  hotel_pnl: {res}")
    print("Listo. Recarga el dashboard para ver la apertura.")


if __name__ == "__main__":
    main()

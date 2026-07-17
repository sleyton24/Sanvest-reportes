"""Reconcilia los datos en producción (PostgreSQL 'sanvest') contra las "fotos"
del BI = los datos que el propio .pbix tiene guardados (vía pbixray), por unidad.

Regla del proyecto: cada tabla debe cuadrar contra el modelo del .pbix.
- OK    = 100% de filas/columnas iguales.
- DRIFT = el .pbix (snapshot viejo) se reproduce 100% en las columnas casteadas,
          pero Postgres tiene filas/meses más nuevos. ETL fiel; el dato es posterior.
- FAIL  = hay filas del modelo que NO están en Postgres (posible bug de lógica)
          O divergencia que no se explica por datos nuevos.

Uso:
    python scripts/reconcile_pg_vs_pbix.py            # todas las unidades
    python scripts/reconcile_pg_vs_pbix.py DV USA     # solo algunas
Salida: docs/_raw/reconcile_pg/<unidad>.json + resumen por consola.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
from pbixray import PBIXRay

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from sqlalchemy import create_engine  # noqa: E402
from etl.db import DEFAULT_SQLITE, get_engine, load_dotenv  # noqa: E402
from etl.reconcile import reconcile_table  # noqa: E402

load_dotenv()
PBIX = ROOT / "Sanvest BI 24.0122026.pbix"
CATALOG = ROOT / "api" / "catalog"
OUT = ROOT / "docs" / "_raw" / "reconcile_pg"
UNITS = ["DV", "USA", "Hotel", "RR", "ICEMM", "Atempora", "Grupo"]


def pg_tables(engine) -> set[str]:
    from sqlalchemy import inspect
    return set(inspect(engine).get_table_names())


def main() -> int:
    argv = [a for a in sys.argv[1:] if a != "--sqlite"]
    use_sqlite = "--sqlite" in sys.argv
    units = argv or UNITS
    OUT.mkdir(parents=True, exist_ok=True)
    # Postgres es copia 1:1 del SQLite (migración verificada); --sqlite lee el local
    # (rápido, sin latencia al VPS) para el mismo resultado de cuadre.
    engine = create_engine(f"sqlite:///{DEFAULT_SQLITE.as_posix()}") if use_sqlite else get_engine()
    print(f"Origen: {engine.url.render_as_string(hide_password=True)}")
    present = pg_tables(engine)
    print(f"Abriendo modelo {PBIX.name} ({PBIX.stat().st_size/1e6:.0f} MB)…")
    model = PBIXRay(str(PBIX))
    model_tables = set(model.tables)

    grand = {}
    print(f"\n{'UNIDAD/TABLA':40} {'EST':6} {'PG':>6} {'BI':>6} {'OK':>6}")
    print("-" * 72)
    for unit in units:
        cat_path = CATALOG / f"{unit}.json"
        if not cat_path.exists():
            print(f"[{unit}] sin catálogo — omito")
            continue
        cat = json.loads(cat_path.read_text(encoding="utf-8"))
        reports = {}
        for t in cat.get("tables", []):
            slug, mname = t.get("slug"), t.get("model_name")
            cast = [c["name"] for c in t.get("columns", [])]
            if slug not in present:
                reports[mname] = {"status": "NO_PG", "reason": f"tabla '{slug}' no está en Postgres"}
            elif mname not in model_tables:
                reports[mname] = {"status": "NO_BI", "reason": f"'{mname}' no está en el .pbix"}
            else:
                try:
                    pg = pd.read_sql_query(f'SELECT * FROM "{slug}"', engine)
                    mdf = model.get_table(mname)
                    reports[mname] = reconcile_table(pg, mdf, cast_cols=cast)
                except Exception as e:  # noqa: BLE001
                    reports[mname] = {"status": "ERROR", "reason": f"{type(e).__name__}: {e}"}
            r = reports[mname]
            print(f"{(unit+' / '+str(mname))[:40]:40} {r.get('status','?'):6} "
                  f"{r.get('rows_etl','-'):>6} {r.get('rows_model','-'):>6} {r.get('rows_matched','-'):>6}")
        (OUT / f"{unit}.json").write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
        grand[unit] = {k: v.get("status") for k, v in reports.items()}

    print("\n===== RESUMEN POR UNIDAD =====")
    for unit, st in grand.items():
        from collections import Counter
        c = Counter(st.values())
        print(f"  {unit:10} {dict(c)}")
    print(f"\nDetalle por unidad en: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

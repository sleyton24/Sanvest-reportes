"""Construye el catálogo de la API para una unidad: metadatos de cada tabla
(nombre modelo, slug SQL, columnas con rol dimensión/medida/fecha, # filas).

El front y la API leen este JSON; así la API no depende de Excel ni pbixray en
runtime. Uso: .venv\\Scripts\\python scripts/build_catalog.py DV
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from etl.pipeline import load_config, load_unit, slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def col_role(dtype: str, in_cfg_type: str | None) -> str:
    d = str(dtype)
    if d.startswith("datetime64") or (in_cfg_type or "").strip() in (
        "type date", "type datetime", "type datetimezone"):
        return "date"
    if d in ("float64", "Float64"):
        return "measure"
    return "dimension"


def main() -> int:
    unit = sys.argv[1] if len(sys.argv) > 1 else "DV"
    cfg = load_config(unit)
    cfg_types = {(t["table"], c["col"]): c["m_type"]
                 for t in cfg["tables"] for c in t["columns"]}
    dfs = load_unit(unit)  # en memoria

    tables = []
    for tname, df in dfs.items():
        cols = []
        for c in df.columns:
            cols.append({
                "name": c,
                "dtype": str(df[c].dtype),
                "role": col_role(df[c].dtype, cfg_types.get((tname, c))),
            })
        tables.append({
            "model_name": tname,
            "slug": slug(tname),
            "rows": int(len(df)),
            "columns": cols,
            "dimensions": [c["name"] for c in cols if c["role"] == "dimension"],
            "measures": [c["name"] for c in cols if c["role"] == "measure"],
            "dates": [c["name"] for c in cols if c["role"] == "date"],
        })

    catalog = {"unit": unit, "tables": tables}
    out_dir = ROOT / "api" / "catalog"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{unit}.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Escrito: {out_dir / f'{unit}.json'}  ({len(tables)} tablas)")
    for t in tables:
        print(f"  {t['slug']:28} dims={len(t['dimensions'])} "
              f"med={len(t['measures'])} fechas={len(t['dates'])} filas={t['rows']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

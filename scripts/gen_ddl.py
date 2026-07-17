"""Genera el DDL de las tablas planas para SQL Server (producción / VPS).

Toma las columnas reales de cada tabla cargada por el ETL (incluye columnas no
casteadas), usando el tipo SQL del config cuando existe y, si no, infiriéndolo
del dtype de pandas. Nombres de tabla = slug ascii; columnas = nombre original
entre corchetes (SQL Server admite espacios/acentos así).

Uso: .venv\\Scripts\\python scripts/gen_ddl.py DV
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from etl.pipeline import load_config, load_unit, slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def sql_type_from_dtype(dtype: str) -> str:
    d = str(dtype)
    if d in ("Int64", "int64"):
        return "BIGINT"
    if d in ("float64", "Float64"):
        return "FLOAT"
    if d.startswith("datetime64"):
        return "DATETIME2"
    if d in ("boolean", "bool"):
        return "BIT"
    return "NVARCHAR(255)"


def main() -> int:
    unit = sys.argv[1] if len(sys.argv) > 1 else "DV"
    cfg = load_config(unit)
    # tipo SQL por (tabla, columna) desde el config (derivado del M)
    cfg_sql = {(t["table"], c["col"]): c["sql"]
               for t in cfg["tables"] for c in t["columns"]}

    dfs = load_unit(unit)  # sin engine: solo carga en memoria
    out = [
        f"-- DDL tablas planas — unidad {unit} — SQL Server (producción VPS)",
        f"-- Generado de la réplica del ETL. Tipos: del M (TransformColumnTypes)",
        f"-- cuando existen; inferidos del dato en columnas no casteadas.",
        "-- Ejecutar en la base destino. Dev usa SQLite vía SQLAlchemy (to_sql).",
        "",
    ]
    for tname, df in dfs.items():
        tbl = slug(tname)
        out.append(f"IF OBJECT_ID('dbo.{tbl}', 'U') IS NOT NULL DROP TABLE dbo.{tbl};")
        out.append(f"CREATE TABLE dbo.{tbl} (  -- modelo: \"{tname}\"")
        cols_sql = []
        for col in df.columns:
            t = cfg_sql.get((tname, col)) or sql_type_from_dtype(df[col].dtype)
            cols_sql.append(f"    [{col}] {t} NULL")
        out.append(",\n".join(cols_sql))
        out.append(");")
        out.append("")

    ddl_dir = ROOT / "db"
    ddl_dir.mkdir(parents=True, exist_ok=True)
    path = ddl_dir / f"ddl_sqlserver_{unit}.sql"
    path.write_text("\n".join(out), encoding="utf-8")
    print(f"Escrito: {path}  ({len(dfs)} tablas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

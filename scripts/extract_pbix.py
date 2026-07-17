"""Fase 0 — Reverse engineering del .pbix con pbixray.

Extrae esquema, tablas, queries M (Power Query), medidas DAX y relaciones
del archivo .pbix y los vuelca a docs/_raw/ para construir luego modelo.md
y mapa_etl.md. No interpreta nada: solo extrae programaticamente.

Uso:
    .venv\\Scripts\\python scripts\\extract_pbix.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from pbixray import PBIXRay

ROOT = Path(__file__).resolve().parent.parent
PBIX = ROOT / "Sanvest BI 24.0122026.pbix"
OUT = ROOT / "docs" / "_raw"
OUT.mkdir(parents=True, exist_ok=True)


def safe(label: str, fn):
    """Ejecuta fn() capturando errores, para no abortar toda la extraccion."""
    try:
        val = fn()
        print(f"[OK]  {label}")
        return val
    except Exception as e:  # noqa: BLE001
        print(f"[ERR] {label}: {type(e).__name__}: {e}")
        return None


def to_records(df):
    """Convierte un DataFrame (o estructura) a lista de dicts serializable."""
    if df is None:
        return None
    try:
        return json.loads(df.to_json(orient="records", date_format="iso"))
    except Exception:
        try:
            return df.to_dict(orient="records")
        except Exception:
            return str(df)


def main() -> int:
    if not PBIX.exists():
        print(f"NO existe el .pbix: {PBIX}", file=sys.stderr)
        return 1

    print(f"Abriendo: {PBIX.name}  ({PBIX.stat().st_size/1e6:.1f} MB)")
    model = PBIXRay(str(PBIX))

    tables = safe("tables", lambda: list(model.tables))
    schema = safe("schema", lambda: model.schema)
    power_query = safe("power_query", lambda: model.power_query)
    dax_measures = safe("dax_measures", lambda: model.dax_measures)
    dax_columns = safe("dax_columns", lambda: model.dax_columns)
    dax_tables = safe("dax_tables", lambda: model.dax_tables)
    relationships = safe("relationships", lambda: model.relationships)
    metadata = safe("metadata", lambda: model.metadata)
    statistics = safe("statistics", lambda: model.statistics)
    size = safe("size", lambda: model.size)

    summary = {
        "pbix": PBIX.name,
        "tables": tables,
        "schema": to_records(schema),
        "relationships": to_records(relationships),
        "dax_measures": to_records(dax_measures),
        "dax_columns": to_records(dax_columns),
        "dax_tables": to_records(dax_tables),
        "metadata": to_records(metadata),
        "statistics": to_records(statistics),
        "size_bytes": int(size) if isinstance(size, (int, float)) else size,
    }

    (OUT / "model_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nEscrito: {OUT / 'model_summary.json'}")

    # power_query suele ser un DataFrame con columnas TableName / Expression
    if power_query is not None:
        pq = to_records(power_query)
        (OUT / "power_query.json").write_text(
            json.dumps(pq, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"Escrito: {OUT / 'power_query.json'}  ({len(pq) if hasattr(pq,'__len__') else '?'} queries)")

    # Conteo de filas por tabla (sin volcar datos completos todavia)
    row_counts = {}
    if tables:
        for t in tables:
            def _get(t=t):
                df = model.get_table(t)
                return None if df is None else len(df)
            row_counts[t] = safe(f"rows[{t}]", _get)
    (OUT / "row_counts.json").write_text(
        json.dumps(row_counts, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Escrito: {OUT / 'row_counts.json'}")

    print("\n===== RESUMEN =====")
    print(f"Tablas ({len(tables) if tables else 0}): {tables}")
    if relationships is not None:
        try:
            print(f"Relaciones: {len(relationships)}")
        except Exception:
            pass
    if dax_measures is not None:
        try:
            print(f"Medidas DAX: {len(dax_measures)}")
        except Exception:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

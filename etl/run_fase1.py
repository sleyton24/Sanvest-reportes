"""Fase 1 end-to-end para una unidad: ETL -> SQLite + reconciliación vs .pbix.

Uso:
    .venv\\Scripts\\python -m etl.run_fase1 DV
"""
from __future__ import annotations

import sys
from pathlib import Path

from pbixray import PBIXRay

from .db import get_engine
from .pipeline import load_config, load_unit, default_source, slug
from .reconcile import reconcile_table

ROOT = Path(__file__).resolve().parent.parent
PBIX = ROOT / "Sanvest BI 24.0122026.pbix"


def main() -> int:
    unit = sys.argv[1] if len(sys.argv) > 1 else "DV"
    cfg = load_config(unit)
    print(f"== Fase 1 :: unidad {unit} ==")
    print(f"Excel fuente: {default_source(unit).name}")

    # 1) ETL + carga a SQLite
    engine = get_engine()
    print(f"BD destino:   {engine.url}")
    etl_dfs = load_unit(unit, engine=engine)
    print(f"Tablas cargadas a BD: {len(etl_dfs)}\n")

    # 2) Reconciliación vs modelo del .pbix
    print(f"Abriendo modelo {PBIX.name} para reconciliar...")
    model = PBIXRay(str(PBIX))

    reports = {}
    for tcfg in cfg["tables"]:
        name = tcfg["table"]
        etl = etl_dfs[name]
        try:
            mdf = model.get_table(name)
        except Exception as e:  # noqa: BLE001
            reports[name] = {"status": "ERROR", "reason": f"get_table: {e}"}
            continue
        cast_cols = [c["col"] for c in tcfg.get("columns", [])]
        reports[name] = reconcile_table(etl, mdf, cast_cols=cast_cols)

    # 3) Reporte
    md = _render_report(unit, reports)
    out = ROOT / "docs" / f"reconciliacion_{unit}.md"
    out.write_text(md, encoding="utf-8")

    # consola
    print("\n" + "=" * 70)
    print(f"{'TABLA':32} {'EST':5} {'ETL':>6} {'MODELO':>7} {'MATCH':>7}")
    print("-" * 70)
    n_ok = 0
    for name, r in reports.items():
        st = r.get("status", "?")
        n_ok += st == "OK"
        print(f"{name[:32]:32} {st:5} {r.get('rows_etl','-'):>6} "
              f"{r.get('rows_model','-'):>7} {r.get('rows_matched','-'):>7}")
    n_drift = sum(r.get("status") == "DRIFT" for r in reports.values())
    n_faithful = n_ok + n_drift
    print("-" * 70)
    print(f"OK exacto: {n_ok}/{len(reports)}  |  DRIFT (ETL fiel + datos nuevos): "
          f"{n_drift}  |  ETL fiel total: {n_faithful}/{len(reports)}")
    print(f"\nReporte: {out}")
    return 0 if n_faithful == len(reports) else 2


def _render_report(unit: str, reports: dict) -> str:
    n_ok = sum(r.get("status") == "OK" for r in reports.values())
    n_drift = sum(r.get("status") == "DRIFT" for r in reports.values())
    n_faithful = n_ok + n_drift
    lines = [
        f"# Reconciliación Fase 1 — unidad {unit}",
        "",
        f"ETL (pandas, réplica del M) vs datos del modelo del `.pbix` (pbixray). "
        f"Una fila cuadra solo si **todas** sus celdas cuadran (comparación como "
        f"multiset, tolerante al orden de filas de VertiPaq).",
        "",
        f"**Resultado: {n_ok}/{len(reports)} cuadran exacto + {n_drift} DRIFT "
        f"= {n_faithful}/{len(reports)} con ETL fiel.**",
        "",
        "- **OK** = coincide 100% (filas y todas las columnas).",
        "- **DRIFT** = el ETL reproduce el 100% de las filas del snapshot del "
        ".pbix en las columnas casteadas, pero el Excel actual tiene filas/columnas "
        "más nuevas que el snapshot. La lógica del ETL es correcta; difiere el dato.",
        "- **FAIL** = hay filas del modelo que el ETL no reproduce (bug de lógica).",
        "",
        "| Tabla | Estado | Filas ETL | Filas modelo | Filas OK | Modelo no reproducido | Filas nuevas (Excel) |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]
    for name, r in reports.items():
        lines.append(
            f"| {name} | **{r.get('status','?')}** | {r.get('rows_etl','-')} | "
            f"{r.get('rows_model','-')} | {r.get('rows_matched','-')} | "
            f"{r.get('model_rows_not_reproduced','—')} | "
            f"{r.get('etl_extra_rows_on_cast','—')} |"
        )
    # detalle de problemas
    lines += ["", "## Detalle de desviaciones", ""]
    any_issue = False
    for name, r in reports.items():
        if r.get("status") == "OK":
            continue
        any_issue = True
        lines.append(f"### {name} — {r.get('status')}")
        if r.get("drift_note"):
            lines.append(f"- {r['drift_note']}")
        if r.get("reason"):
            lines.append(f"- {r['reason']}")
        if r.get("cols_only_in_etl"):
            lines.append(f"- Columnas solo en ETL: {r['cols_only_in_etl']}")
        if r.get("cols_only_in_model"):
            lines.append(f"- Columnas solo en modelo: {r['cols_only_in_model']}")
        for ex in r.get("drift_examples", []):
            lines.append(
                f"- valor actualizado en `{ex['col']}` (clave {ex['key']}): "
                f"Excel/ETL=`{ex['etl']}` vs snapshot=`{ex['model']}`")
        for k in r.get("missing_key_examples", []):
            lines.append(f"- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `{k}`")
        for ex in r.get("examples", []):
            lines.append(
                f"- `{ex['col']}` fila {ex['row_sorted']}: ETL=`{ex['etl']}` ≠ modelo=`{ex['model']}`")
        lines.append("")
    if not any_issue:
        lines.append("Sin desviaciones. ✅")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    raise SystemExit(main())

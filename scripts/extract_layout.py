"""Fase 3 — Extrae la definición de visuales del .pbix (Report/Layout).

Reverse engineering del layout interno (JSON UTF-16), NO mirar el render. Vuelca
todas las páginas a docs/_raw/report_layout.json y un detalle de las páginas DV
a docs/visuales_DV.md (tipo de visual, título, posición y campos por rol).
"""
from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PBIX = ROOT / "Sanvest BI 24.0122026.pbix"
OUT = ROOT / "docs" / "_raw"

# páginas por unidad (displayName exacto del .pbix)
UNIT_PAGES = {
    "DV": {"Menu Desarrollo Para Venta", "Millalongo", " Sta Victoria 155",
           "Sta Victoria 99"},
    "Hotel": {"OLÁ Hotel"},
    "USA": {"USA Bemiston KPIS", "Bemiston Gestión", "USA St Grand KPIS", "ST grand ",
            "USA MILA KPIS", "MILA"},
    "RR": {"LAR Group", "SOHO", "PARK"},
    "ICEMM": {"ICEMM", "Menu Construccion", "MILA Construccion",
              "USA Bemiston Construcción", "Menu USA CONSTRUCCION"},
}

AGG_FN = {0: "Sum", 1: "Avg", 2: "Count", 3: "Min", 4: "Max",
          5: "CountNonNull", 6: "Median", 7: "StdDev", 8: "Var"}


def read_report_layout() -> dict:
    with zipfile.ZipFile(PBIX) as z:
        raw = z.read("Report/Layout")
    for enc in ("utf-16-le", "utf-16", "utf-8-sig", "utf-8"):
        try:
            return json.loads(raw.decode(enc))
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
    raise RuntimeError("No se pudo decodificar Report/Layout")


def _field_name(node: dict, kind: str, alias2ent: dict) -> str:
    if kind == "Aggregation":
        col = node.get("Expression", {}).get("Column", {})
        prop = col.get("Property")
        src = col.get("Expression", {}).get("SourceRef", {}).get("Source")
        fn = AGG_FN.get(node.get("Function"), node.get("Function"))
        ent = alias2ent.get(src, src)
        return f"{ent}.{prop} [{fn}]"
    prop = node.get("Property")
    src = node.get("Expression", {}).get("SourceRef", {}).get("Source")
    ent = alias2ent.get(src, src)
    tag = ":m" if kind == "Measure" else ""
    return f"{ent}.{prop}{tag}"


def parse_visual(vc: dict) -> dict:
    cfg = json.loads(vc.get("config", "{}"))
    sv = cfg.get("singleVisual", {})
    pq = sv.get("prototypeQuery", {}) or {}
    alias2ent = {f.get("Name"): f.get("Entity") for f in pq.get("From", [])}
    # selects -> nombre legible, indexado por queryRef para mapear proyecciones
    selects = []
    for s in pq.get("Select", []):
        for kind in ("Aggregation", "Column", "Measure"):
            if kind in s:
                selects.append({"ref": s.get("Name"),
                                "field": _field_name(s[kind], kind, alias2ent)})
                break
    ref2field = {s["ref"]: s["field"] for s in selects}
    # proyecciones: rol -> [campos]
    roles = {}
    for role, items in (sv.get("projections", {}) or {}).items():
        roles[role] = [ref2field.get(it.get("queryRef"), it.get("queryRef"))
                       for it in items]
    # título
    title = ""
    t = sv.get("vcObjects", {}).get("title", [{}])
    if t:
        title = (t[0].get("properties", {}).get("text", {})
                 .get("expr", {}).get("Literal", {}).get("Value", "") or "")
    pos = (sv.get("layouts", [{}]) or [{}])
    return {
        "type": sv.get("visualType", "?"),
        "title": title.strip("'"),
        "entities": sorted(set(alias2ent.values())),
        "roles": roles,
        "all_fields": [s["field"] for s in selects],
        "x": round(vc.get("x", 0)), "y": round(vc.get("y", 0)),
        "w": round(vc.get("width", 0)), "h": round(vc.get("height", 0)),
    }


def main() -> int:
    unit = sys.argv[1] if len(sys.argv) > 1 else "DV"
    pages_wanted = UNIT_PAGES[unit]
    layout = read_report_layout()
    sections = layout.get("sections", [])
    pages = []
    for sec in sections:
        visuals = []
        for vc in sec.get("visualContainers", []):
            try:
                visuals.append(parse_visual(vc))
            except Exception as e:  # noqa: BLE001
                visuals.append({"type": "ERROR", "error": str(e)})
        ents = sorted({e for v in visuals for e in v.get("entities", []) if e})
        pages.append({"name": sec.get("name"), "displayName": sec.get("displayName"),
                      "ordinal": sec.get("ordinal"), "entities_used": ents,
                      "visuals": visuals})

    (OUT / "report_layout.json").write_text(
        json.dumps({"pages": pages}, ensure_ascii=False, indent=2), encoding="utf-8")

    # markdown de páginas de la unidad
    md = [f"# Inventario de visuales — unidad {unit}", "",
          "Extraído de `Report/Layout` del .pbix (no del render). Posición en px "
          "(x,y,w,h). Campos por rol del visual.", ""]
    for p in pages:
        if p["displayName"] not in pages_wanted:
            continue
        md.append(f"## Página: {p['displayName']!r}  ({len(p['visuals'])} visuales)")
        md.append(f"Tablas: {p['entities_used']}\n")
        md.append("| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |")
        md.append("|---|---|---|---|---|")
        for i, v in enumerate(sorted(p["visuals"], key=lambda v: (v.get("y", 0), v.get("x", 0)))):
            roles = "; ".join(f"**{r}**: {', '.join(f)}" for r, f in v.get("roles", {}).items()) or "—"
            md.append(f"| {i} | `{v.get('type')}` | {v.get('title','')} | "
                      f"{v.get('x')},{v.get('y')},{v.get('w')},{v.get('h')} | {roles} |")
        md.append("")
    (ROOT / "docs" / f"visuales_{unit}.md").write_text("\n".join(md), encoding="utf-8")

    print(f"Páginas totales: {len(pages)}")
    for p in pages:
        if p["displayName"] in pages_wanted:
            vt = {}
            for v in p["visuals"]:
                vt[v.get("type")] = vt.get(v.get("type"), 0) + 1
            print(f"  DV '{p['displayName']}': {dict(sorted(vt.items()))}")
    print(f"\nEscrito: docs/_raw/report_layout.json y docs/visuales_{unit}.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

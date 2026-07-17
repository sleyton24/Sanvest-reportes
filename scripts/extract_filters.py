"""Extrae los VALORES concretos de los filtros (página y visual) de las páginas
DV del .pbix. Clave para replicar el contexto de filtro (Versión, proyecto, etc.)
y producir los mismos números que el informe."""
import json
import re
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
z = zipfile.ZipFile(ROOT / "Sanvest BI 24.0122026.pbix")
d = json.loads(z.read("Report/Layout").decode("utf-16-le"))

UNIT_PAGES = {
    "DV": {"Millalongo", " Sta Victoria 155", "Sta Victoria 99"},
    "Hotel": {"OLÁ Hotel"},
}
DV_PAGES = UNIT_PAGES[sys.argv[1]] if len(sys.argv) > 1 else UNIT_PAGES["DV"]


def literals(node):
    """Recolecta literales de un Condition (In/Comparison/Between)."""
    out = []
    def walk(n):
        if isinstance(n, dict):
            if "Literal" in n and isinstance(n["Literal"], dict):
                out.append(n["Literal"].get("Value"))
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)
    walk(node)
    return out


def parse_filters(fstr):
    try:
        fl = json.loads(fstr) if isinstance(fstr, str) else (fstr or [])
    except Exception:
        return []
    res = []
    for f in fl:
        exp = f.get("expression", {}) or {}
        col = exp.get("Column", {}) or exp.get("Measure", {}) or {}
        prop = col.get("Property")
        ent = col.get("Expression", {}).get("SourceRef", {}).get("Entity")
        if not prop:
            continue
        cond = f.get("filter", {}) or {}
        vals = [v for v in literals(cond.get("Where", cond)) if v is not None]
        # limpiar comillas simples de los literales de texto
        vals = [re.sub(r"^'|'$", "", str(v)) for v in vals]
        res.append({"field": f"{ent}.{prop}", "type": f.get("type"), "values": vals})
    return res


for sec in d["sections"]:
    if sec.get("displayName") not in DV_PAGES:
        continue
    print(f"\n===== PÁGINA: {sec.get('displayName')!r} =====")
    print("-- Filtros de PÁGINA --")
    seen = set()
    for fl in parse_filters(sec.get("filters", "[]")):
        k = (fl["field"], tuple(fl["values"]))
        if k in seen:
            continue
        seen.add(k)
        print(f"   {fl['field']:45} {fl['type']:12} = {fl['values']}")
    # filtros de visual (solo los que aportan Versión/fecha)
    print("-- Filtros de VISUAL (Versión / fecha) --")
    for vc in sec.get("visualContainers", []):
        cfg = json.loads(vc.get("config", "{}"))
        sv = cfg.get("singleVisual", {})
        vt = sv.get("visualType")
        if vt not in ("cardVisual", "gauge", "columnChart", "clusteredColumnChart",
                      "lineStackedColumnComboChart", "pivotTable"):
            continue
        title = (sv.get("vcObjects", {}).get("title", [{}])[0].get("properties", {})
                 .get("text", {}).get("expr", {}).get("Literal", {}).get("Value", "") or "").strip("'")
        fls = [f for f in parse_filters(vc.get("filters", "[]"))
               if "Versión" in f["field"] or "Periodo" in f["field"] or "Fecha" in f["field"]]
        if fls:
            print(f"   [{vt}] {title}")
            for fl in fls:
                print(f"       {fl['field']:42} {fl['type']:12} = {fl['values'][:6]}")

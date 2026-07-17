"""Valida la API en proceso (TestClient) y cruza una medida contra la BD."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient  # noqa: E402
from api.main import app  # noqa: E402
from api.db import scalar, qi  # noqa: E402

c = TestClient(app)


def check(name, resp, cond=True):
    ok = resp.status_code == 200 and cond
    print(f"  [{'OK' if ok else 'FAIL'}] {name}  ({resp.status_code})")
    if not ok:
        print("        ", str(resp.text)[:200])
    return ok


print("== Endpoints meta ==")
check("GET /", c.get("/"))
r = c.get("/units"); check("GET /units", r, any(u["unit"] == "DV" for u in r.json()))
r = c.get("/units/DV"); check("GET /units/DV", r, len(r.json()["tables"]) == 10)

print("\n== Datos ==")
r = c.get("/units/DV/tables/dv_ventas", params={"limit": 3})
check("dv_ventas limit=3", r, len(r.json()["rows"]) == 3 and r.json()["total"] == 261)
print("        total dv_ventas:", r.json()["total"])

r = c.get("/units/DV/tables/dv_ventas", params={"Nombre proyecto": "Millalongo", "limit": 5})
check("filtro Nombre proyecto=Millalongo", r,
      all(row["Nombre proyecto"] == "Millalongo" for row in r.json()["rows"]))
print("        filas Millalongo:", r.json()["total"])

r = c.get("/units/DV/tables/dv_ventas/distinct/Nombre proyecto")
check("distinct Nombre proyecto", r, len(r.json()["values"]) > 0)
print("        proyectos:", r.json()["values"][:6], "...")

r = c.get("/units/DV/tables/dv_ventas/aggregate",
          params={"measure": "VENTAS_ACUMULADAS", "agg": "sum", "by": "Nombre proyecto"})
check("aggregate sum by proyecto", r, len(r.json()["data"]) > 0)

print("\n== Validación de columna desconocida (debe dar 400) ==")
r = c.get("/units/DV/tables/dv_ventas", params={"columna_inexistente": "x"})
print(f"  [{'OK' if r.status_code == 400 else 'FAIL'}] rechaza col desconocida "
      f"con 400  ({r.status_code})")

print("\n== Medidas DAX ==")
r = c.get("/units/DV/measures"); check("list measures", r, len(r.json()) == 2)
for m in r.json():
    print(f"        - {m['id']}: {m['dax']}")

# medida sin filtro (contexto total)
r = c.get("/units/DV/measures/ventas_proyeccion_menos_acumuladas")
api_val = r.json()["value"]
db_val = scalar(f"SELECT MAX({qi('PROYECCIÓN_VENTA_TOTAL(UF)')}) - "
                f"MAX({qi('VENTAS_ACUMULADAS')}) FROM {qi('dv_ventas')}")
check("medida proy-acum (sin filtro) == BD", r, abs((api_val or 0) - (db_val or 0)) < 1e-6)
print(f"        API={api_val}  BD={db_val}")

# medida con filtro de proyecto
r = c.get("/units/DV/measures/ventas_proyeccion_menos_acumuladas",
          params={"Nombre proyecto": "Millalongo"})
fv = r.json()["value"]
dbf = scalar(f"SELECT MAX({qi('PROYECCIÓN_VENTA_TOTAL(UF)')}) - MAX({qi('VENTAS_ACUMULADAS')}) "
             f"FROM {qi('dv_ventas')} WHERE {qi('Nombre proyecto')} = :p", {"p": "Millalongo"})
check("medida con filtro == BD", r, abs((fv or 0) - (dbf or 0)) < 1e-6)
print(f"        Millalongo: API={fv}  BD={dbf}")

print("\nOpenAPI paths:", list(c.get('/openapi.json').json()['paths'].keys()))

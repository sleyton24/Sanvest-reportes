"""Prueba Fase 4: sube el Excel de DV por el endpoint y verifica carga + cuadre."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient  # noqa: E402
from api.main import app  # noqa: E402

c = TestClient(app)
ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "Formatos para reportes PBI" / "Desarrollo para la venta.xlsx"

print("== expected-structure ==")
r = c.get("/units/DV/expected-structure")
print(f"  [{r.status_code}] {len(r.json()['tables'])} tablas esperadas")

print("\n== upload Excel real de DV ==")
with XLSX.open("rb") as f:
    r = c.post("/units/DV/upload",
               files={"file": (XLSX.name,
                               f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
print(f"  [{r.status_code}] ok={r.json().get('ok')}")
body = r.json()
print(f"  total filas cargadas: {body.get('total_rows')}")
for slug, n in (body.get("loaded") or {}).items():
    print(f"     {slug:28} {n}")

print("\n== verificar que el dashboard puede leer tras la carga ==")
r = c.get("/units/DV/tables/dv_ventas",
          params={"Nombre proyecto": "Millalongo", "Versión": "REAL", "limit": 1})
print(f"  [{r.status_code}] dv_ventas Millalongo/REAL total={r.json().get('total')}")

print("\n== upload de archivo inválido (xlsx sin las hojas) ==")
import io, zipfile  # noqa: E402
# crear un xlsx mínimo válido pero con hoja equivocada usando openpyxl
import openpyxl  # noqa: E402
bad = io.BytesIO()
wb = openpyxl.Workbook()
wb.active.title = "HojaEquivocada"
wb.active["A1"] = "x"
wb.save(bad)
bad.seek(0)
r = c.post("/units/DV/upload", files={"file": ("malo.xlsx", bad,
           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
print(f"  [{r.status_code}] (se espera 422) ok-rechazado={r.status_code == 422}")
if r.status_code == 422:
    det = r.json()["detail"]["validation"]["tables"]
    miss = [t["table"] for t in det if not t["sheet_found"]][:5]
    print(f"     hojas faltantes detectadas (muestra): {miss}")

print("\n== extensión no permitida ==")
r = c.post("/units/DV/upload", files={"file": ("x.txt", io.BytesIO(b"hola"), "text/plain")})
print(f"  [{r.status_code}] (se espera 400)")

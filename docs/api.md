# API FastAPI — Fase 2

Backend que sirve las tablas planas y medidas del modelo migrado. Catálogo-driven:
agregar unidades nuevas NO requiere tocar código de la API, solo regenerar el
catálogo (`scripts/build_catalog.py <UNIDAD>`).

## Arrancar

```powershell
.venv\Scripts\python -m uvicorn api.main:app --reload --port 8077
```
- Swagger / OpenAPI: http://localhost:8077/docs
- ⚠️ Se usa **8077**: en esta máquina `:8000` (y `:5173`) los ocupa otro proyecto
  (LAR Revenue Intelligence). El front apunta a 8077 por defecto (`VITE_API_TARGET`).
- BD: la misma que el ETL (`etl/db.py`) — SQLite en dev, SQL Server VPS en prod
  (variable `SANVEST_DB_URL`).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Salud + unidades disponibles |
| GET | `/units` | Lista de unidades y nº de tablas |
| GET | `/units/{unit}` | Catálogo completo de la unidad (tablas, columnas, roles) |
| GET | `/units/{unit}/tables/{slug}` | Filas de una tabla plana (ver filtros abajo) |
| GET | `/units/{unit}/tables/{slug}/distinct/{column}` | Valores distintos (slicers) |
| GET | `/units/{unit}/tables/{slug}/aggregate` | Agregación group-by (visuales) |
| GET | `/units/{unit}/measures` | Medidas DAX de la unidad (con su expresión) |
| GET | `/units/{unit}/measures/{measure_id}` | Calcula la medida con filtros |
| GET | `/units/{unit}/expected-structure` | Hojas y columnas que debe traer el Excel |
| POST | `/units/{unit}/upload` | **Fase 4**: sube el Excel crudo → valida → corre el ETL → reescribe tablas |

### Carga directa (Fase 4)
`POST /units/DV/upload` (multipart, campo `file`): guarda el Excel en temporal,
**valida** estructura (`etl.validate.validate_unit_file`: hojas + columnas
casteadas) y, si pasa, corre la **misma** función ETL de Fase 1
(`etl.load_unit`) reescribiendo las tablas planas. Respuestas:
- `200` → `{ok, loaded:{tabla:filas}, total_rows, validation}`
- `422` → estructura inválida (no carga nada; detalle de hojas/columnas faltantes)
- `400` → extensión no `.xlsx/.xlsm`
Verificado: subir `Desarrollo para la venta.xlsx` carga 2.709 filas en 10 tablas;
archivo con hojas equivocadas se rechaza con 422. El dashboard se refresca al cargar.

### Filtros y paginación (tabla)
- Params reservados: `limit` (≤50000), `offset`, `order_by`, `order_dir` (asc/desc).
- Cualquier otro query param = filtro `columna=valor`. Las columnas se **validan
  contra el catálogo** (columna desconocida → 400). Los valores van siempre
  parametrizados (anti-inyección).
- Ejemplo: `/units/DV/tables/dv_ventas?Nombre proyecto=Millalongo&limit=50`

### Agregación
`/units/DV/tables/dv_ventas/aggregate?measure=VENTAS_ACUMULADAS&agg=sum&by=Nombre proyecto`
- `agg`: sum | avg | min | max | count · `by`: columnas separadas por coma · admite filtros.

### Medidas DAX (DV)
Son medidas de **contexto de filtro** (agregados); se calculan **al vuelo** con
los filtros del visual (no se precalculan — ver [decisiones.md](decisiones.md) D0.4):
- `ventas_proyeccion_menos_acumuladas` = `MAX('DV Ventas'[PROYECCIÓN_VENTA_TOTAL(UF)]) - MAX('DV Ventas'[VENTAS_ACUMULADAS])`
- `uso_y_fondo_doble_max_monto` = `MAX('DV Uso y Fondo'[Monto]) + MAX('DV Uso y Fondo'[Monto])`

> `Amortizacion[Real Ajustado]` aparece en la lista DAX pero opera sobre
> `EERR Grupo` (unidad Grupo), no sobre datos DV; se implementará al migrar Grupo.

## Validación
`scripts/validate_api.py` (TestClient en proceso) verifica endpoints y cruza el
valor de las medidas contra la BD. Resultado: medidas API == BD (p.ej. proy−acum
total = 424.0; Millalongo = 208932.231). Las 10 tablas DV se sirven con sus
conteos correctos (dv_ventas=261, etc.).

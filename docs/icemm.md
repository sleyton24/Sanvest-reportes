# ICEMM (Construcción) — Fase 0

Quinta unidad de negocio (manual de marca: **Construcción / ICEMM**, color rojo `#D83252`).
Extracción de la lógica del `.pbix` (no se mira el render).

## Páginas del .pbix
| Página | Contenido | Tabla(s) |
|---|---|---|
| **ICEMM** (principal, Chile) | 3 tablas P&L (FY / YTD / YTG) por Nivel 1/Nivel 2; pivot de Flujo de caja; 8 combos (Ingreso, Gastos Operaciones, Resultado Operacional, EBITDA — mensual + YTD) | `ICEMM Mensual`, `Flujo` |
| **MILA Construccion** (USA) | Uses & Sources (Nivel 3/2/1, Total Budget/REAL/YTD/YTG); gauge avance (YTD/Total Budget); cards Total/Construction/Debt; combo evolución | `Base mila CC` |
| **USA Bemiston Construcción** | card + 2 cardVisuals + línea de costos | `USA Bemiston (2)`, `USA EV costos Bemiston` |

## Orígenes (Power Query M) — patrón Excel.Workbook → hoja → PromoteHeaders → tipar
| Tabla | Archivo | Hoja |
|---|---|---|
| `ICEMM Mensual` (16 cols) | `Formatos para reportes PBI/ICEMM.xlsx` | `ICEMM Mensual` |
| `ICEMM YTD` (7 cols) | idem | `ICEMM YTD` |
| `Flujo` (5 cols) | idem | `Flujo` |
| `Base mila CC` (12 cols) | `Uso Y fondos mila diciembre .xlsx` | `Base mila CC` |
| `USA Bemiston (2)` / `USA EV costos Bemiston` | `USA.xlsx` | `USA Bemiston`, `USA EV costos Bemiston` |

`Formatos para reportes PBI/ICEMM.xlsx` existe localmente (copia en el proyecto). El crudo
mensual real es `Informe ICEMM <mes> - <año>.xlsx` (Control Gestión/03 - EMM/Reporte de Gestión)
— análogo a los Informes de Gestión LAR.

## Columnas clave
- **ICEMM Mensual**: `Nivel 1`, `Nivel 2`, `Real`, `PPTO`, `Proy`, `Fecha`, `FechID`, `Año`, `Mes`,
  `YTD Real`, `YTD PPTO`, `YTD Proy`, `FY Proy`, `FY PPTO`, `YTG Proy`, `YTG PPTO`. (600 filas snapshot)
  - Nivel 1 ∈ {Ingresos, Gastos Operacionales, Gastos Oficina Central, Otros no operacionales}.
- **Flujo**: `Orden`, `Categoría 1`, `Categoría 2`, `Fecha`, `Monto` (matriz flujo de caja).
- **Base mila CC**: `Nivel 1/2/3`, `Total Budget`, `REAL`, `YTD`, `YTG`, `AVANCE`, `Date` (uses & sources).

## Visuales originales (página ICEMM)
- Slicer **Mes** (ICEMM Mensual.Fecha).
- **Indicadores Financieros FY**: FY Proy vs FY PPTO, por Nivel 1/Nivel 2.
- **Indicadores Financieros YTD**: YTD Real vs YTD PPTO.
- **Indicadores Financieros YTG**: YTG Proy vs YTG PPTO.
- **Pivot Flujo**: Categoría 1/Categoría 2 (filas) × Fecha (columnas) → Monto.
- **8 combos** (barra Real + líneas Proy/PPTO), filtrando ICEMM Mensual por Nivel 1:
  Ingreso, Gastos Operaciones, Resultado Operacional, EBITDA — cada uno mensual + YTD.

## Plan Fase 1 (ETL + tabla plana + reconciliación)
1. Añadir `ICEMM` a `parse_m_types` (genera config de las 3 tablas: ICEMM Mensual, ICEMM YTD, Flujo).
2. `load_unit("ICEMM")` con `etl.loader` (mismo patrón) → tablas planas en dev DB.
3. Reconciliar 1:1 contra el snapshot del .pbix (`pbixray.get_table`).
4. Registrar en `api/catalog/ICEMM.json`.

## Fase 3 (dashboard)
Página ICEMM con color rojo `#D83252`: 3 tablas P&L (HoldingPnL FY/YTD/YTG), pivot Flujo,
8 combos por Nivel 1, slicer Mes.

## Fase 4 (carga) — implementada
`etl/icemm_crudo.py` + `etl/connect_icemm.py` + endpoint `/units/ICEMM/upload-informes`
+ botón "⬆ Cargar Informe ICEMM". Sube el crudo `ICEMM <mes> - <año>.xlsx`.

**Transform** (`crudo_to_icemm_mensual`): despivota la hoja `INFORME GESTIÓN <año>`
(matriz mes-en-columnas, 4 cols/mes Real/Ppto/Proy/Diff; detección dinámica de la fila
de marcadores y de fechas porque las hojas por año vienen desplazadas). Mapeo verificado
por value-match contra el snapshot (202603):
 - Nivel 1: 'INGRESOS OPERACIONALES'→Ingresos; 'Costos de Obra'→Gastos Operacionales
   (Nivel 2 = el PROYECTO; su fila-encabezado trae el total, no las líneas de detalle);
   'Gastos de Oficina Central'→Gastos Oficina Central; Ingresos/Costos Financieros (tras
   EBITDA)→Otros no operacionales.
 - Alias Nivel 2: 'Agua del Palo' (crudo) → 'Puerto Camoens' (panel).
 - YTD=cumsum del año, FY=suma 12 meses (constante), YTG=FY−YTD (derivados, no del crudo).
 - Solo se carga el ejercicio del **año más reciente** del archivo; los años cerrados quedan
   como histórico reconciliado y se preservan.

**Upsert** (`apply_icemm`): reemplaza filas por (Nivel 1, Nivel 2, FechID) y conserva el resto.
Probado: 312 filas 2026 actualizadas, 2025 (288) intacto, idempotente, drift capturado
(Ingresos Financieros 202603 0→7,85).

**Pendiente (fast-follow):** carga del **Flujo de Caja** (hoja `Flujo de Caja` del crudo →
tabla `flujo`): requiere despivotar + normalizar nombres con prefijo/orden (Categoría 1/2,
saltar sub-filas por proyecto y totales, alias 'Agua del Palo'/'Agua de Palo'). El pivot del
dashboard sigue mostrando el 2026 reconciliado hasta conectarlo.

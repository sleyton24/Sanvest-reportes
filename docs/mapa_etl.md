# Mapa ETL — tabla plana ⇐ Excel/hoja ⇐ pasos M

> Fase 0. Por cada tabla del modelo: de qué **archivo** y **hoja** sale, cuántas
> filas/columnas tiene y qué **pasos M** se le aplican. Salvo que se indique, el
> patrón es `PromoteHeaders + TransformColumnTypes` (leer hoja → ascender
> encabezados → castear tipos). Las queries M completas están en
> [`docs/queries_m/`](queries_m/). Generado por
> [`scripts/table_steps.py`](../scripts/table_steps.py).

**Leyenda de pasos extra** (solo donde difiere del patrón base):
`+filtro` = `Table.SelectRows` · `+rename` = `RenameColumns` ·
`+drop-cols` = `RemoveColumns` · `+drop-errores` = `RemoveRowsWithErrors` ·
`(2x tipos)` = doble `TransformColumnTypes`.

---

## 1. USA / Bemiston / St Grand  — `BD Gestion USA .xlsx` + `USA.xlsx`

| Tabla | Archivo | Hoja | Filas | Cols | Pasos extra |
|---|---|---|---:|---:|---|
| Bemiston GP and LP Information | BD Gestion USA | `Bemiston GP and LP Information` | 13 | 11 | — |
| Bemiston Property Info | BD Gestion USA | `Bemiston Property Info` | 8 | 7 | — |
| MILA FINAL | BD Gestion USA | `MILA FINAL` | 1.034 | 17 | — |
| Ocupación PPTO | BD Gestion USA | `Ocupación PPTO` | 72 | 8 | — |
| St Grand | BD Gestion USA | `St Grand` | 11.160 | 12 | — |
| St grand final (2) | BD Gestion USA | `St grand final` ⚠️ | 1.779 | 20 | **+filtro**, (2x tipos) |
| Tiempo ID | BD Gestion USA | `Tiempo ID` | 24 | 3 | — |
| USA Bemiston Tipologias | BD Gestion USA | `USA Bemiston Tipologias ` | 9 | 6 | — |
| USA Bemiston ppto | BD Gestion USA | `USA Bemiston ppto` | 4.813 | 13 | — |
| USA Graficos | BD Gestion USA | `USA Graficos` | 216 | 18 | **+filtro** |
| USA KPIS GESTION | BD Gestion USA | `USA KPIS GESTION` | 72 | 18 | **+drop-errores** (`Dólar SQF O AVG`) |
| USA Modelo Original Bemiston | BD Gestion USA | `USA Modelo Original Bemiston` | 3 | 15 | — |
| USA Renovación contratos | BD Gestion USA | `USA Renovación contratos` | 85 | 20 | — |
| Uso Y fondo Bemiston | BD Gestion USA | `Uso Y fondo Bemiston` | 24 | 4 | **+drop-cols** |
| fINAL beMISTON | BD Gestion USA | `fINAL beMISTON` | 2.079 | 16 | — |
| DIF I Y II | USA.xlsx | `DIF I Y II` | 58 | 12 | — |
| DIF II | USA.xlsx | `DIF II` | 42 | 12 | — |
| KPI | USA.xlsx | `KPI` | 6 | 5 | — |
| USA Bemiston (2) | USA.xlsx | `USA Bemiston` ⚠️ | 46 | 17 | — |
| USA DIF I y II ACUMULADOS | USA.xlsx | `USA DIF I y II ACUMULADOS` | 169 | 15 | — |
| USA EV costos Bemiston | USA.xlsx | `USA EV costos Bemiston` | 75 | 8 | — |

## 2. Desarrollo para la Venta (DV) — `Desarrollo para la venta.xlsx`

| Tabla | Hoja | Filas | Cols | Pasos extra |
|---|---|---:|---:|---|
| Amortizacion | `Amortizacion` | 18 | 5 | — |
| DV Construccion | `DV Construccion` | 556 | 14 | — |
| DV Escrituras | `DV Escrituras` | 290 | 14 | — |
| DV Evolucion de costos | `DV Evolucion de costos ` | 270 | 11 | — |
| DV Indicadores Financieros | `DV Indicadores Financieros ` | 240 | 16 | — |
| DV KPIS | `DV KPIS` | 290 | 12 | — |
| DV Uso y Fondo | `DV Uso y Fondo ` | 652 | 9 | — |
| DV Ventas | `DV Ventas` | 261 | 14 | — |
| FECHA AUX | `FECHA AUX` | 73 | 4 | — (tabla-calendario) |
| Financieros Sanvest | `Financieros Sanvest` | 3 | 15 | — |

## 3. Civitas / Atémpora — `CIVITAS.xlsx`

| Tabla | Hoja | Filas | Cols | Pasos extra |
|---|---|---:|---:|---|
| Date AUX Civitas | `Date AUX Civitas` | 24 | 4 | — (calendario) |
| Detalle arriendo civitas | `Detalle arriendo civitas` | 193 | 16 | — |
| deuda civitas | `deuda civitas` | 53 | 8 | — |
| EERR CIVITAS | `EERR CIVITAS` | 528 | 11 | **+rename** (`Nivel 2 `→`Nivel 2`), (2x tipos) |
| KPIS Atempora | `KPIS Atempora` | 16 | 33 | — |
| Morosidad | `Morosidad` | 34 | 6 | — |
| Ventas Civitas | `Ventas Civitas` | 9 | 3 | — |

## 4. Renta Residencial / LAR — `Renta Residencial .xlsx` + SQL Server

| Tabla | Origen | Hoja / Query | Filas | Cols | Pasos extra |
|---|---|---|---:|---:|---|
| Indicadores Financieros | Renta Residencial | `Indicadores Financieros ` | 864 | 16 | — |
| Indicadores Financieros Lar | Renta Residencial | `Indicadores Financieros Lar` | 539 | 17 | — |
| RR Edificios LAR | Renta Residencial | `RR Edificios LAR` | 171 | 26 | — |
| RR KPis | Renta Residencial | `RR KPis` | 92 | 15 | — |
| Real+PPTO+LY | Renta Residencial | `Real+PPTO+LY` | 228 | 53 | — |
| TIEMPO AUX | Renta Residencial | `TIEMPO AUX` | 84 | 4 | — (calendario central) |
| Tipologia | Renta Residencial | `Tipologia` | 16 | 8 | — |
| Renovaciones LAR | **SQL** `SQLLAR.dbo.contratosact` | `SELECT *` | 2.686 | 22 | — |
| Resumen LAR | **SQL** `SQLLAR.dbo.tresumen` | `SELECT nombre, dptos_Contrato, Ndeptos, ufm2r` | 12 | 4 | — |

## 5. Hotel — `BD HOTEL .xlsx`

| Tabla | Hoja | Filas | Cols | Pasos extra |
|---|---|---:|---:|---|
| Hotel FULL | `Hotel FULL` | 336 | 14 | — |
| Hotel Graficos | `Hotel Real` ⚠️ (misma hoja, distinto recorte) | 72 | 29 | — |
| Hotel Original | `Hotel Original ` | 421 | 10 | ⚠️ **lee la hoja en crudo: SIN promote-headers y SIN cast** (encabezados quedan `Column1…`) |
| Hotel PPTO | `Hotel PPTO` | 84 | 29 | — |
| Hotel Real | `Hotel Real` | 84 | 29 | — |

## 6. Oficina — `Gestion Oficina.xlsx`  ❌ ARCHIVO NO DISPONIBLE LOCALMENTE

| Tabla | Hoja | Filas | Cols | Pasos extra |
|---|---|---:|---:|---|
| Oficina Original | `Oficina Original` | 492 | 9 | — |
| Oficina Real | `Oficina Real` | 36 | 19 | — |
| Oficina PPTO | `Oficina PPTO` | 36 | 19 | — |
| Oficina Graficos | `Oficina Real` ⚠️ | 36 | 19 | — |

## 7. Grupo (Balance / EERR / Cascada) — `Base balance.xlsx`

| Tabla | Hoja | Filas | Cols | Pasos extra |
|---|---|---:|---:|---|
| Balance | `Balance` | 547 | 19 | — |
| Cascada | `Cascada` | 64 | 4 | — |
| EERR Grupo | `EERR Grupo` | 181 | 12 | — (tabla puente por `Indice`) |

## 8. ICEMM — `ICEMM.xlsx`

| Tabla | Hoja | Filas | Cols | Pasos extra |
|---|---|---:|---:|---|
| Flujo | `Flujo` | 148 | 5 | — |
| ICEMM Mensual | `ICEMM Mensual` | 600 | 16 | — |
| ICEMM YTD | `ICEMM YTD` | 24 | 7 | — |

## 9. Deuda — `Deuda.xlsx`

| Tabla | Hoja | Filas | Cols | Pasos extra |
|---|---|---:|---:|---|
| Deuda | `Deuda` | 815 | 8 | — |

## 10. MILA — `Uso Y fondos mila diciembre .xlsx`  ❌ ARCHIVO NO DISPONIBLE LOCALMENTE

| Tabla | Hoja | Filas | Cols | Pasos extra |
|---|---|---:|---:|---|
| Base mila CC | `Base mila CC` | 183 | 12 | **+filtro** |

---

## Notas para Fase 1 (replicar el ETL)

- **Plantilla única de ETL.** Como 61/64 tablas son `leer hoja → promote headers
  → cast types`, conviene una sola función parametrizable
  `cargar_hoja(archivo, hoja, tipos)` y una tabla de configuración por unidad de
  negocio, en vez de 64 funciones a mano. Las ~6 tablas con pasos extra se manejan
  como casos especiales sobre esa misma base.
- **Reconciliación.** El cuadre se hace contra `model.get_table("<tabla>")` de
  pbixray (los datos ya cargados en el modelo), celda a celda. Los conteos de
  filas/columnas de este documento son el primer chequeo grueso.
- **Tipos.** Respetar el casteo del M (Int64 vs number vs date vs text). El detalle
  de tipos por columna está en `docs/_raw/docs_data.txt` y en cada `.m`.
- **Hojas con espacios finales** en el nombre (`DV Uso y Fondo `, `Hotel Original `,
  `Indicadores Financieros `, etc.): conservar el nombre exacto al leer.
- **Encoding es-CL** (acentos, `ñ`): leer y escribir en UTF-8; al exportar CSV usar
  ISO-8859-1 con `;` según la regla del proyecto.

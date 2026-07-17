# Reconciliación Fase 1 — unidad RR

ETL (pandas, réplica del M) vs datos del modelo del `.pbix` (pbixray). Una fila cuadra solo si **todas** sus celdas cuadran (comparación como multiset, tolerante al orden de filas de VertiPaq).

**Resultado: 4/7 cuadran exacto + 3 DRIFT = 7/7 con ETL fiel.**

- **OK** = coincide 100% (filas y todas las columnas).
- **DRIFT** = el ETL reproduce el 100% de las filas del snapshot del .pbix en las columnas casteadas, pero el Excel actual tiene filas/columnas más nuevas que el snapshot. La lógica del ETL es correcta; difiere el dato.
- **FAIL** = hay filas del modelo que el ETL no reproduce (bug de lógica).

| Tabla | Estado | Filas ETL | Filas modelo | Filas OK | Modelo no reproducido | Filas nuevas (Excel) |
|---|---|---:|---:|---:|---:|---:|
| Indicadores Financieros | **OK** | 864 | 864 | 864 | — | — |
| Indicadores Financieros Lar | **DRIFT** | 539 | 539 | 539 | 0 | 0 |
| RR Edificios LAR | **DRIFT** | 182 | 171 | 161 | 10 | 21 |
| RR KPis | **OK** | 92 | 92 | 92 | — | — |
| Real+PPTO+LY | **DRIFT** | 228 | 228 | 0 | 228 | 228 |
| TIEMPO AUX | **OK** | 84 | 84 | 84 | — | — |
| Tipologia | **OK** | 16 | 16 | 16 | — | — |

## Detalle de desviaciones

### Indicadores Financieros Lar — DRIFT
- ETL fiel: 539 claves del modelo presentes al 100% en el ETL.
- Columnas solo en modelo: ['Columna0']

### RR Edificios LAR — DRIFT
- ETL fiel: las medidas cuadran en 161/161 filas por clave de negocio ['Activo', 'Fecha ID']; difieren miembros de dimensión (p.ej. activos nuevos/renombrados) o columnas repobladas — datos más nuevos que el snapshot del .pbix.
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['202505', 'NOMAD HOLLEY', '5', '2025', 'Mar']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['202508', 'NOMAD HOLLEY', '8', '2025', '∅']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['202507', 'NOMAD HOLLEY', '7', '2025', 'Oct']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['202508', 'NOMAD BELLET', '8', '2025', '∅']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['202507', 'NOMAD BELLET', '7', '2025', 'Sept']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['202506', 'NOMAD BELLET', '6', '2025', 'Sept']`

### Real+PPTO+LY — DRIFT
- ETL fiel: las medidas cuadran en 204/228 filas por clave de negocio ['Activo', 'Periodo']; difieren miembros de dimensión (p.ej. activos nuevos/renombrados) o columnas repobladas — datos más nuevos que el snapshot del .pbix.
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['2021-05-01', 'SOHO', '2021', '5', '2021', '6', '2020-05-01', '202105']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['2023-06-01', 'LARGROUP', '2023', '6', '2023', '7', '2022-06-01', '202306']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['2025-01-01', 'PARK', '2025', '1', '2025', '2', '2024-01-01', '202501']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['2022-11-01', 'LARGROUP', '2022', '11', '2022', '12', '2021-11-01', '202211']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['2025-06-01', 'PARK', '2025', '6', '2025', '7', '2024-06-01', '202506']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['2025-06-01', 'LARGROUP', '2025', '6', '2025', '15', '2025-02-01', '202514']`
- `Mes` fila 0: ETL=`1` ≠ modelo=`2`
- `Check` fila 12: ETL=`∅` ≠ modelo=`1`


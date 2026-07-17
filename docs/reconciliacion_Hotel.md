# Reconciliación Fase 1 — unidad Hotel

ETL (pandas, réplica del M) vs datos del modelo del `.pbix` (pbixray). Una fila cuadra solo si **todas** sus celdas cuadran (comparación como multiset, tolerante al orden de filas de VertiPaq).

**Resultado: 3/5 cuadran exacto + 2 DRIFT = 5/5 con ETL fiel.**

- **OK** = coincide 100% (filas y todas las columnas).
- **DRIFT** = el ETL reproduce el 100% de las filas del snapshot del .pbix en las columnas casteadas, pero el Excel actual tiene filas/columnas más nuevas que el snapshot. La lógica del ETL es correcta; difiere el dato.
- **FAIL** = hay filas del modelo que el ETL no reproduce (bug de lógica).

| Tabla | Estado | Filas ETL | Filas modelo | Filas OK | Modelo no reproducido | Filas nuevas (Excel) |
|---|---|---:|---:|---:|---:|---:|
| Hotel FULL | **OK** | 336 | 336 | 336 | — | — |
| Hotel Graficos | **DRIFT** | 84 | 72 | 48 | 0 | 12 |
| Hotel Original | **DRIFT** | 421 | 421 | 420 | 0 | 0 |
| Hotel PPTO | **OK** | 84 | 84 | 84 | — | — |
| Hotel Real | **OK** | 84 | 84 | 84 | — | — |

## Detalle de desviaciones

### Hotel Graficos — DRIFT
- ETL fiel: 72 claves del modelo presentes al 100% en el ETL; 12 filas nuevas en el Excel; 126 celdas con valor actualizado en el Excel (posteriores al snapshot del .pbix).
- valor actualizado en `Flujo (Resultado) UF` (clave ['OLA HOTEL', '2024-05-01', '5', '2024', '202405', '2023', '2023-05-01']): Excel/ETL=`1098.381` vs snapshot=`1648.026`
- valor actualizado en `Flujo (Resultado) UF` (clave ['OLA HOTEL', '2024-06-01', '6', '2024', '202406', '2023', '2023-06-01']): Excel/ETL=`2133.405` vs snapshot=`3664.313`
- valor actualizado en `Flujo (Resultado) UF` (clave ['OLA HOTEL', '2024-04-01', '4', '2024', '202404', '2023', '2023-04-01']): Excel/ETL=`1478.239` vs snapshot=`2183.766`
- valor actualizado en `Flujo (Resultado) UF` (clave ['OLA HOTEL', '2024-11-01', '11', '2024', '202411', '2023', '2023-11-01']): Excel/ETL=`4042.233` vs snapshot=`4280.071`
- valor actualizado en `Ingresos totales` (clave ['OLA HOTEL', '2025-10-01', '10', '2025', '202510', '2024', '2024-10-01']): Excel/ETL=`20178.11` vs snapshot=`∅`
- valor actualizado en `Costos operacionales UF` (clave ['OLA HOTEL', '2025-10-01', '10', '2025', '202510', '2024', '2024-10-01']): Excel/ETL=`8855.385` vs snapshot=`∅`
- valor actualizado en `EBITDA UF` (clave ['OLA HOTEL', '2025-10-01', '10', '2025', '202510', '2024', '2024-10-01']): Excel/ETL=`11322.72` vs snapshot=`∅`
- valor actualizado en `Flujo (Resultado) UF` (clave ['OLA HOTEL', '2025-10-01', '10', '2025', '202510', '2024', '2024-10-01']): Excel/ETL=`235.8686` vs snapshot=`∅`

### Hotel Original — DRIFT
- ETL fiel: 421 claves del modelo presentes al 100% en el ETL; 1 celdas con valor actualizado en el Excel (posteriores al snapshot del .pbix).
- valor actualizado en `Column8` (clave ['12', '2024', 'OLA HOTEL', 'Ocupación pago 2022 (%)', '2022-05-01', '5', '2022']): Excel/ETL=`0.37866` vs snapshot=`0.3786601`
- `Column8` fila 388: ETL=`0.37866` ≠ modelo=`0.3786601`


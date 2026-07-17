# Reconciliación Fase 1 — unidad DV

ETL (pandas, réplica del M) vs datos del modelo del `.pbix` (pbixray). Una fila cuadra solo si **todas** sus celdas cuadran (comparación como multiset, tolerante al orden de filas de VertiPaq).

**Resultado: 8/10 cuadran exacto + 2 DRIFT = 10/10 con ETL fiel.**

- **OK** = coincide 100% (filas y todas las columnas).
- **DRIFT** = el ETL reproduce el 100% de las filas del snapshot del .pbix en las columnas casteadas, pero el Excel actual tiene filas/columnas más nuevas que el snapshot. La lógica del ETL es correcta; difiere el dato.
- **FAIL** = hay filas del modelo que el ETL no reproduce (bug de lógica).

| Tabla | Estado | Filas ETL | Filas modelo | Filas OK | Modelo no reproducido | Filas nuevas (Excel) |
|---|---|---:|---:|---:|---:|---:|
| Amortizacion | **OK** | 18 | 18 | 18 | — | — |
| DV Construccion | **OK** | 556 | 556 | 556 | — | — |
| DV Escrituras | **OK** | 290 | 290 | 290 | — | — |
| DV Evolucion de costos | **DRIFT** | 272 | 270 | 269 | 0 | 2 |
| DV Indicadores Financieros | **DRIFT** | 294 | 240 | 240 | 0 | 42 |
| DV KPIS | **OK** | 290 | 290 | 290 | — | — |
| DV Uso y Fondo | **OK** | 652 | 652 | 652 | — | — |
| DV Ventas | **OK** | 261 | 261 | 261 | — | — |
| FECHA AUX | **OK** | 73 | 73 | 73 | — | — |
| Financieros Sanvest | **OK** | 3 | 3 | 3 | — | — |

## Detalle de desviaciones

### DV Evolucion de costos — DRIFT
- ETL fiel: 270 claves del modelo presentes al 100% en el ETL; 2 filas nuevas en el Excel; 1 celdas con valor actualizado en el Excel (posteriores al snapshot del .pbix).
- valor actualizado en `COSTOS_REALES` (clave ['11', '2024', 'EVOLUCIÓN COSTOS', 'Millalongo', '2026', '4', '2026-04-30', '202604']): Excel/ETL=`380.0118` vs snapshot=`∅`

### DV Indicadores Financieros — DRIFT
- ETL fiel: 240 claves del modelo presentes al 100% en el ETL; 42 filas nuevas en el Excel.


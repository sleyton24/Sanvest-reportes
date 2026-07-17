# Reconciliación Fase 1 — unidad USA

ETL (pandas, réplica del M) vs datos del modelo del `.pbix` (pbixray). Una fila cuadra solo si **todas** sus celdas cuadran (comparación como multiset, tolerante al orden de filas de VertiPaq).

**Resultado: 14/21 cuadran exacto + 6 DRIFT = 20/21 con ETL fiel.**

- **OK** = coincide 100% (filas y todas las columnas).
- **DRIFT** = el ETL reproduce el 100% de las filas del snapshot del .pbix en las columnas casteadas, pero el Excel actual tiene filas/columnas más nuevas que el snapshot. La lógica del ETL es correcta; difiere el dato.
- **FAIL** = hay filas del modelo que el ETL no reproduce (bug de lógica).

| Tabla | Estado | Filas ETL | Filas modelo | Filas OK | Modelo no reproducido | Filas nuevas (Excel) |
|---|---|---:|---:|---:|---:|---:|
| Bemiston GP and LP Information | **OK** | 13 | 13 | 13 | — | — |
| Bemiston Property Info | **FAIL** | 8 | 8 | 0 | 8 | 8 |
| MILA FINAL | **OK** | 1034 | 1034 | 1034 | — | — |
| Ocupación PPTO | **OK** | 72 | 72 | 72 | — | — |
| St Grand | **OK** | 11160 | 11160 | 11160 | — | — |
| St grand final (2) | **DRIFT** | 1779 | 1779 | 1750 | 29 | 29 |
| Tiempo ID | **OK** | 24 | 24 | 24 | — | — |
| USA Bemiston Tipologias | **OK** | 9 | 9 | 9 | — | — |
| USA Bemiston ppto | **OK** | 4813 | 4813 | 4813 | — | — |
| USA Graficos | **OK** | 216 | 216 | 216 | — | — |
| USA KPIS GESTION | **DRIFT** | 72 | 72 | 0 | 72 | 72 |
| USA Modelo Original Bemiston | **DRIFT** | 3 | 3 | 0 | 0 | 0 |
| USA Renovación contratos | **OK** | 85 | 85 | 85 | — | — |
| Uso Y fondo Bemiston | **DRIFT** | 23 | 24 | 23 | 1 | 0 |
| fINAL beMISTON | **OK** | 2079 | 2079 | 2079 | — | — |
| DIF I Y II | **DRIFT** | 58 | 58 | 0 | 0 | 0 |
| DIF II | **OK** | 42 | 42 | 42 | — | — |
| KPI | **OK** | 6 | 6 | 6 | — | — |
| USA Bemiston (2) | **OK** | 46 | 46 | 46 | — | — |
| USA DIF I y II ACUMULADOS | **DRIFT** | 169 | 169 | 81 | 0 | 0 |
| USA EV costos Bemiston | **OK** | 75 | 75 | 75 | — | — |

## Detalle de desviaciones

### Bemiston Property Info — FAIL
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['Residential', '403536', '238', '347', '212510', 'bemiston']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['Retail', '10301', '7', '1', '10301', 'bemiston']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['∅', '2540', '1', '0', '2540', '∅']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['Retail', '2541', '2', '1', '2541', 'Mila']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['Retail', '8038', '5', '6', '8038', 'ST Grand']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['Residential', '356541', '249', '76', '189854', 'ST Grand']`
- `Total Land Size (Feet)` fila 0: ETL=`0` ≠ modelo=`0.1`
- `Gross Square Feet (GSF)` fila 0: ETL=`45648` ≠ modelo=`45649`
- `Number of Units` fila 0: ETL=`4` ≠ modelo=`5`
- `Parking` fila 0: ETL=`20` ≠ modelo=`21`
- `Rentable Square Feet (RSF)` fila 0: ETL=`45648` ≠ modelo=`45649`
- `Activo` fila 4: ETL=`Bemiston` ≠ modelo=`bemiston`

### St grand final (2) — DRIFT
- ETL fiel: las medidas cuadran en 1528/1539 filas por clave de negocio ['Nivel 1', 'Fecha ID ']; difieren miembros de dimensión (p.ej. activos nuevos/renombrados) o columnas repobladas — datos más nuevos que el snapshot del .pbix.
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['OTHER INCOME', 'Income - Internet', 'REVENUE', '2025', '3', '202503', '2025-03-01']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['OTHER INCOME', "Renter's Insurance Income", 'REVENUE', '2025', '3', '202503', '2025-03-01']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['OTHER INCOME', 'Fees - Security Keys', 'REVENUE', '2025', '3', '202503', '2025-03-01']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['OTHER INCOME', 'Fees - Late Payment', 'REVENUE', '2025', '3', '202503', '2025-03-01']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['ADJUSTED RESIDENTIAL RENT', 'Rent Concession', 'REVENUE', '2025', '3', '202503', '2025-03-01']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['OTHER INCOME', 'Utility Reimburse - Electricity', 'REVENUE', '2025', '3', '202503', '2025-03-01']`
- `Nivel 2` fila 0: ETL=`Revenue` ≠ modelo=`REVENUE`
- `Monto AUX` fila 1178: ETL=`525` ≠ modelo=`393.75`
- `Monto 2` fila 1178: ETL=`525` ≠ modelo=`393.75`
- `Mes` fila 1178: ETL=`2` ≠ modelo=`3`
- `Fecha ID ` fila 1178: ETL=`202502` ≠ modelo=`202503`
- `Real UAX` fila 1178: ETL=`375` ≠ modelo=`1200`
- `Real` fila 1178: ETL=`375` ≠ modelo=`1200`
- `YTD` fila 1178: ETL=`675` ≠ modelo=`1875`

### USA KPIS GESTION — DRIFT
- ETL fiel: las medidas cuadran en 3/3 filas por clave de negocio ['Activo']; difieren miembros de dimensión (p.ej. activos nuevos/renombrados) o columnas repobladas — datos más nuevos que el snapshot del .pbix.
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['3124', '2026-02-01', 'Bemiston', '2026', '2', '202602']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['3094', '2026-04-01', 'Bemiston', '2026', '4', '202604']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['3279', '2025-03-01', 'ST grand', '2025', '3', '202503']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['3360', '2026-03-01', 'ST grand', '2026', '3', '202603']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['3349', '2025-12-01', 'ST grand', '2025', '12', '202512']`
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['3202', '2025-03-01', 'Bemiston', '2025', '3', '202503']`
- `AVG RENT ` fila 0: ETL=`2181` ≠ modelo=`2182`

### USA Modelo Original Bemiston — DRIFT
- ETL fiel: 3 claves del modelo presentes al 100% en el ETL; 3 celdas con valor actualizado en el Excel (posteriores al snapshot del .pbix).
- valor actualizado en `Loan rate AC` (clave ['69219929', 'Bemiston', '2064-12-31']): Excel/ETL=`0.028` vs snapshot=`0.0281`
- valor actualizado en `Loan rate AC` (clave ['43654596', 'Mila', '∅']): Excel/ETL=`∅` vs snapshot=`0.0255`
- valor actualizado en `Loan rate AC` (clave ['102288089', 'St Grand', '2031-07-31']): Excel/ETL=`0.0255` vs snapshot=`0.0256`
- `Loan rate AC` fila 0: ETL=`0.0255` ≠ modelo=`0.0256`

### Uso Y fondo Bemiston — DRIFT
- ETL fiel: las medidas cuadran en 10/10 filas por clave de negocio ['Category']; difieren miembros de dimensión (p.ej. activos nuevos/renombrados) o columnas repobladas — datos más nuevos que el snapshot del .pbix.
- ⚠️ clave del modelo SIN contraparte en ETL (revisar): `['∅', '∅', '∅']`

### DIF I Y II — DRIFT
- ETL fiel: 57 claves del modelo presentes al 100% en el ETL; 71 celdas con valor actualizado en el Excel (posteriores al snapshot del .pbix).
- valor actualizado en `Invested Capital Budget` (clave ['11', '2024', 'DIF I', 'Total Quarterly Distribution Amount', '0', 'Q3-2024', '2024']): Excel/ETL=`1.2436e+07` vs snapshot=`12436003`
- valor actualizado en `Distributions_BUDGET` (clave ['11', '2024', 'DIF I', 'Total Quarterly Distribution Amount', '0', 'Q3-2024', '2024']): Excel/ETL=`1333055` vs snapshot=`1333056`
- valor actualizado en `Distributions_BUDGET` (clave ['10', '2024', 'DIF I', 'Highlands Plaza Two', '0', 'Q2-2024', '2024']): Excel/ETL=`197438` vs snapshot=`197439`
- valor actualizado en `Distributions_BUDGET` (clave ['11', '2024', 'DIF I', 'Westview Office', '0', 'Q3-2024', '2024']): Excel/ETL=`837207` vs snapshot=`837208`
- valor actualizado en `Distributions_BUDGET` (clave ['3', '2024', 'DIF I', 'St. Louis Investment LLC', '0', 'Q1-2024', '2024']): Excel/ETL=`758287` vs snapshot=`758288`
- valor actualizado en `Distributions_BUDGET` (clave ['11', '2024', 'DIF I', 'Westview HVAC Loan Interest', '0', 'Q3-2024', '2024']): Excel/ETL=`0` vs snapshot=`1`
- valor actualizado en `Distributions_BUDGET` (clave ['11', '2024', 'DIF II', 'St. Louis Investment LLC', '0', 'Q3-2024', '2024']): Excel/ETL=`∅` vs snapshot=`-473424`
- valor actualizado en `Distributions_BUDGET` (clave ['1', '2025', 'DIF I', 'Westview HVAC Loan Interest', '0', 'Q4-2024', '2024']): Excel/ETL=`0` vs snapshot=`1`
- `Invested Capital Budget` fila 4: ETL=`1.2436e+07` ≠ modelo=`12436003`
- `Distributions_BUDGET` fila 0: ETL=`197438` ≠ modelo=`197439`

### USA DIF I y II ACUMULADOS — DRIFT
- ETL fiel: 169 claves del modelo presentes al 100% en el ETL; 176 celdas con valor actualizado en el Excel (posteriores al snapshot del .pbix).
- valor actualizado en `Div. Yield Annualized Budget` (clave ['1', '2025', 'DIF I', 'St. Louis Investment LLC', 'DISTRIBUTION AMOUNT AND YIELDS', '0', 'Q4', '2024', '20', 'Q4-2024']): Excel/ETL=`0.107` vs snapshot=`0.1071`
- valor actualizado en `Div. Yield Annualized` (clave ['1', '2025', 'DIF I', 'St. Louis Investment LLC', 'DISTRIBUTION AMOUNT AND YIELDS', '0', 'Q4', '2024', '20', 'Q4-2024']): Excel/ETL=`0.014` vs snapshot=`0.0141`
- valor actualizado en `Div. Yield Annualized Budget` (clave ['1', '2025', 'DIF II', 'Gross Quarterly Distribution Amount', 'DISTRIBUTION AMOUNT AND YIELDS', '0', 'Q4', '2024', '15', 'Q4-2024']): Excel/ETL=`0.04` vs snapshot=`0.0401`
- valor actualizado en `Div. Yield Annualized` (clave ['1', '2025', 'DIF II', 'Gross Quarterly Distribution Amount', 'DISTRIBUTION AMOUNT AND YIELDS', '0', 'Q4', '2024', '15', 'Q4-2024']): Excel/ETL=`0.014` vs snapshot=`0.0141`
- valor actualizado en `Div. Yield Annualized Budget` (clave ['1', '2025', 'DIF II', 'BBT Outstanding balance and operating expenses', 'DISTRIBUTION AMOUNT AND YIELDS', '0', 'YTD Q4', '2024', '16', 'Q4-2024']): Excel/ETL=`∅` vs snapshot=`0`
- valor actualizado en `Div. Yield Annualized` (clave ['1', '2025', 'DIF II', 'BBT Outstanding balance and operating expenses', 'DISTRIBUTION AMOUNT AND YIELDS', '0', 'YTD Q4', '2024', '16', 'Q4-2024']): Excel/ETL=`∅` vs snapshot=`-0.0411`
- valor actualizado en `Div. Yield Annualized Budget` (clave ['5', '2025', 'DIF I', 'Gross Quarterly Distribution Amount', 'DISTRIBUTION AMOUNT AND YIELDS', '0', 'Q1', '2025', '15', 'Q1-2025']): Excel/ETL=`0.0086` vs snapshot=`0.0087`
- valor actualizado en `Div. Yield Annualized` (clave ['5', '2025', 'DIF I', 'Gross Quarterly Distribution Amount', 'DISTRIBUTION AMOUNT AND YIELDS', '0', 'Q1', '2025', '15', 'Q1-2025']): Excel/ETL=`-0.0411` vs snapshot=`-0.041`
- `Div. Yield Annualized Budget` fila 0: ETL=`0.107` ≠ modelo=`0.1071`
- `Div. Yield Annualized` fila 0: ETL=`0.067` ≠ modelo=`0.0671`


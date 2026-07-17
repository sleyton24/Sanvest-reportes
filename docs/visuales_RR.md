# Inventario de visuales — unidad RR

Extraído de `Report/Layout` del .pbix (no del render). Posición en px (x,y,w,h). Campos por rol del visual.

## Página: 'LAR Group'  (20 visuales)
Tablas: ['Indicadores Financieros Lar', 'Real+PPTO+LY', 'Resumen LAR', 'TIEMPO AUX', 'Tipologia']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,2000,119 | — |
| 1 | `textbox` |  | 0,16,1701,103 | — |
| 2 | `actionButton` |  | 0,17,100,40 | — |
| 3 | `slicer` | Año | 1182,20,232,85 | **Values**: TIEMPO AUX.AÑO |
| 4 | `slicer` | Mes | 1414,20,219,85 | **Values**: Indicadores Financieros Lar.Mes |
| 5 | `actionButton` |  | 36,25,144,78 | — |
| 6 | `image` |  | 156,25,358,68 | — |
| 7 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros Mes | 382,138,645,360 | **Category**: Indicadores Financieros Lar.Nivel 1 , Indicadores Financieros Lar.Nivel 2; **Values**: Indicadores Financieros Lar.Versión_Real [Sum]; **PreviousYear**: Indicadores Financieros Lar.Versión_Ppto [Sum] |
| 8 | `image` |  | 10,139,370,365 | — |
| 9 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros YTD | 1051,139,617,361 | **Category**: Indicadores Financieros Lar.Nivel 1 , Indicadores Financieros Lar.Nivel 2; **Plan**: Indicadores Financieros Lar.YTD REAL [Sum]; **Forecast**: Indicadores Financieros Lar.YTD PPTO [Sum] |
| 10 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | KPIs Grupo | 9,523,557,278 | **Category**: Tipologia.TIPOLOGIAS/MÉTRICA; **Values**: Tipologia.UNIDADES ADMINISTRADAS [Max] |
| 11 | `tableEx` | KPIs por Edificios (19 de Mayo) | 583,523,1097,279 | **Values**: Resumen LAR.nombre, Resumen LAR.ufm2r [Sum], Resumen LAR.Suma de dptos_Contrato dividido por Suma de Ndeptos:m, Resumen LAR.Ndeptos [Sum] |
| 12 | `shape` |  | 0,823,1996,130 | — |
| 13 | `slicer` | Periodo | 20,833,563,120 | **Values**: Real+PPTO+LY.Periodo |
| 14 | `lineClusteredColumnComboChart` | Ingresos (UF) | 1,957,839,310 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Ingresos totales UF R [Sum], Real+PPTO+LY.Ingresos totales UF R LY [Sum]; **Y2**: Real+PPTO+LY.Ingresos totales UF p [Max] |
| 15 | `lineClusteredColumnComboChart` | Ingresos Acumulados (UF)  | 841,957,841,311 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Ingresos totales UF YTD R [Sum]; **Y2**: Real+PPTO+LY.Ingresos totales UF YTD p [Sum] |
| 16 | `lineClusteredColumnComboChart` | Costo Operacional (UF) | 0,1267,840,358 | **Y**: Real+PPTO+LY.Costos operacionales UF R [Max], Real+PPTO+LY.Costos operacionales UF LY [Max]; **Category**: Real+PPTO+LY.Periodo; **Y2**: Real+PPTO+LY.Costos operacionales UF p [Max] |
| 17 | `lineClusteredColumnComboChart` | Costo Operacional Acumulado (UF) | 840,1267,840,358 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Costos operacionales UF YTD R [Sum]; **Y2**: Real+PPTO+LY.Costos operacionales UF YTD p [Sum] |
| 18 | `lineClusteredColumnComboChart` | EBITDA (UF) | 0,1625,837,373 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.EBITDA UF R [Max], Real+PPTO+LY.EBITDA UF R LY [Max]; **Y2**: Real+PPTO+LY.EBITDA UF p [Max] |
| 19 | `lineClusteredColumnComboChart` | EBITDA Acumulado (UF) | 838,1625,837,375 | **Y2**: Real+PPTO+LY.EBITDA UF YTD p [Sum]; **Y**: Real+PPTO+LY.EBITDA UF YTD R [Sum]; **Category**: Real+PPTO+LY.Periodo |

## Página: 'SOHO'  (26 visuales)
Tablas: ['Deuda', 'Indicadores Financieros', 'Real+PPTO+LY', 'Renovaciones LAR', 'TIEMPO AUX']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,2000,119 | — |
| 1 | `image` |  | 192,13,297,92 | — |
| 2 | `slicer` | Año | 1096,13,218,96 | **Values**: TIEMPO AUX.AÑO |
| 3 | `textbox` |  | 0,16,1700,102 | — |
| 4 | `slicer` | Mes | 1345,16,218,98 | **Values**: TIEMPO AUX.MES |
| 5 | `actionButton` |  | 0,17,100,40 | — |
| 6 | `actionButton` |  | 35,21,144,77 | — |
| 7 | `image` |  | 28,123,303,301 | — |
| 8 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros Mes (UF)  | 361,131,639,294 | **Category**: Indicadores Financieros.Item; **PreviousYear**: Indicadores Financieros.Versión_Ppto [Max]; **Values**: Indicadores Financieros.Versión_Real [Max] |
| 9 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros YTD (UF) | 1025,131,639,294 | **Category**: Indicadores Financieros.Item; **Forecast**: Indicadores Financieros.YTD PPTO [Max]; **Plan**: Indicadores Financieros.YTD REAL [Max] |
| 10 | `cardVisual` | Indicadores Mensuales (UF) | 0,442,851,262 | **Data**: Real+PPTO+LY.UF/M2_DEPARTAMENTOS R  [Max], Real+PPTO+LY.UF/ESTACIONAMIENTO R [Max], Real+PPTO+LY.UF/M2 (DEPTO+ESTAC.) R [Max], Real+PPTO+LY.UF/M2_DEPARTAMENTOS p [Max], Real+PPTO+LY.UF/ESTACIONAMIENTO p [Max], Real+PPTO+LY.UF/M2 (DEPTO+ESTAC.) p [Max] |
| 11 | `gauge` | Ocupación | 852,443,814,262 | **Y**: Real+PPTO+LY.Ocupación departamentos 2022 (%) R [Max]; **TargetValue**: Real+PPTO+LY.Ocupación departamentos 2022 (%) p [Max] |
| 12 | `cardVisual` | Indicadores YTD (UF) | 3,702,846,261 | **Data**: Real+PPTO+LY.UF/M2_YTD R [Max], Real+PPTO+LY.UF/ESTACIONAMIENTO_YTD R [Max], Real+PPTO+LY.UF/M2 (DEPTO+ESTAC.)_YTD R [Max], Real+PPTO+LY.UF/M2_YTD p [Max], Real+PPTO+LY.UF/ESTACIONAMIENTO_YTD p [Max], Real+PPTO+LY.UF/M2 (DEPTO+ESTAC.)_YTD p [Max] |
| 13 | `cardVisual` | Deuda (UF) | 848,702,825,262 | **Data**: Deuda.Deuda total [Max], Deuda.por pagar [Max] |
| 14 | `shape` |  | 0,970,1675,121 | — |
| 15 | `slicer` | Periodo | 24,983,563,108 | **Values**: Real+PPTO+LY.Periodo |
| 16 | `lineClusteredColumnComboChart` | EBITDA (UF) | 1,1096,836,352 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.EBITDA UF R [Max], Real+PPTO+LY.EBITDA UF R LY [Max]; **Y2**: Real+PPTO+LY.EBITDA UF p [Max] |
| 17 | `lineClusteredColumnComboChart` | EBITDA Acumulado (UF) | 837,1096,839,353 | **Y2**: Real+PPTO+LY.EBITDA UF YTD p [Sum]; **Y**: Real+PPTO+LY.EBITDA UF YTD R [Sum]; **Category**: Real+PPTO+LY.Periodo |
| 18 | `lineClusteredColumnComboChart` | Flujo (UF) | 1,1449,836,308 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Flujo UF R [Sum], Real+PPTO+LY.Flujo UF R LY [Sum]; **Y2**: Real+PPTO+LY.Flujo UF p [Sum] |
| 19 | `lineClusteredColumnComboChart` | Flujo Acumulado (UF) | 837,1449,839,310 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Flujo UF YTD R [Sum]; **Y2**: Real+PPTO+LY.Flujo UF YTD p [Sum] |
| 20 | `lineChart` | Ocupación (%) | 1,1758,836,333 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Ocupación departamentos 2022 (%) R [Max], Real+PPTO+LY.Ocupación departamentos 2022 (%) R7 LY [Max], Real+PPTO+LY.Ocupación departamentos 2022 (%) p [Max] |
| 21 | `lineChart` | Tarifa UF/m2 | 837,1759,839,332 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.UF/M2_DEPARTAMENTOS R  [Sum], Real+PPTO+LY.UF/M2_DEPARTAMENTOS p [Sum], Real+PPTO+LY.Tarifa LY [Sum] |
| 22 | `lineChart` | EBITDA / Cuota Banco | 1,2091,838,333 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.EBITDA UF/CUOTA BANCO R [Sum], Real+PPTO+LY.EBITDA UF/CUOTA BANCO R LY [Sum], Real+PPTO+LY.EBITDA UF/CUOTA BANCO p [Sum] |
| 23 | `lineChart` | Gastos Comunes | 838,2091,838,333 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Gastos Comunes (UF/M2) R [Sum], Real+PPTO+LY.Gastos Comunes (UF/M2) P [Sum], Real+PPTO+LY.Gasto comun LY [Sum] |
| 24 | `pivotTable` | Cuadro de Vencimientos | 0,2424,836,476 | **Rows**: Renovaciones LAR.unidad; **Values**: Renovaciones LAR.ufm2R [Median], Renovaciones LAR.ufm2P [Median], Renovaciones LAR.tipologia [Min], Renovaciones LAR.fecha_fin [Min], Renovaciones LAR.superficie_util [Sum] |
| 25 | `lineClusteredColumnComboChart` | Cuadro de Vencimientos | 838,2424,838,476 | **Y**: Renovaciones LAR.folio [CountNonNull]; **Category**: Renovaciones LAR.fecha_fin.Variación.Jerarquía de fechas.Año, Renovaciones LAR.fecha_fin.Variación.Jerarquía de fechas.Mes; **Y2**: Renovaciones LAR.ufm2R [Median] |

## Página: 'PARK'  (26 visuales)
Tablas: ['Deuda', 'Indicadores Financieros', 'Real+PPTO+LY', 'Renovaciones LAR', 'TIEMPO AUX']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,2000,119 | — |
| 1 | `image` |  | 192,13,297,92 | — |
| 2 | `textbox` |  | 0,16,1700,77 | — |
| 3 | `slicer` | Mes | 1424,16,220,89 | **Values**: TIEMPO AUX.MES |
| 4 | `actionButton` |  | 0,17,100,40 | — |
| 5 | `slicer` | Año | 1201,18,217,86 | **Values**: TIEMPO AUX.AÑO |
| 6 | `actionButton` |  | 35,21,144,77 | — |
| 7 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros Mes | 411,130,598,333 | **Category**: Indicadores Financieros.Item; **PreviousYear**: Indicadores Financieros.Versión_Ppto [Max]; **Values**: Indicadores Financieros.Versión_Real [Max] |
| 8 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros YTD | 1033,130,598,333 | **Category**: Indicadores Financieros.Item; **Forecast**: Indicadores Financieros.YTD PPTO [Max]; **Plan**: Indicadores Financieros.YTD REAL [Max] |
| 9 | `image` |  | 10,134,340,332 | — |
| 10 | `cardVisual` | Indicadores Mensuales (UF) | 0,493,827,268 | **Data**: Real+PPTO+LY.UF/M2_DEPARTAMENTOS R  [Max], Real+PPTO+LY.UF/ESTACIONAMIENTO R [Max], Real+PPTO+LY.UF/M2 (DEPTO+ESTAC.) R [Max], Real+PPTO+LY.UF/M2_DEPARTAMENTOS p [Max], Real+PPTO+LY.UF/ESTACIONAMIENTO p [Max], Real+PPTO+LY.UF/M2 (DEPTO+ESTAC.) p [Max] |
| 11 | `gauge` | Ocupación | 837,493,838,268 | **Y**: Real+PPTO+LY.Ocupación departamentos 2022 (%) R [Max]; **TargetValue**: Real+PPTO+LY.Ocupación departamentos 2022 (%) p [Max] |
| 12 | `cardVisual` | Deuda (UF) | 838,758,838,264 | **Data**: Deuda.Deuda total [Max], Deuda.por pagar [Max] |
| 13 | `cardVisual` | Indicadores YTD (UF) | 0,760,828,262 | **Data**: Real+PPTO+LY.UF/M2_YTD R [Max], Real+PPTO+LY.UF/ESTACIONAMIENTO_YTD R [Max], Real+PPTO+LY.UF/M2 (DEPTO+ESTAC.)_YTD R [Max], Real+PPTO+LY.UF/M2_YTD p [Max], Real+PPTO+LY.UF/ESTACIONAMIENTO_YTD p [Max], Real+PPTO+LY.UF/M2 (DEPTO+ESTAC.)_YTD p [Max] |
| 14 | `shape` |  | -2,1022,1996,133 | — |
| 15 | `slicer` | Periodo | 0,1030,564,125 | **Values**: Real+PPTO+LY.Periodo |
| 16 | `lineClusteredColumnComboChart` | EBITDA (UF) | 3,1160,837,352 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.EBITDA UF R [Max], Real+PPTO+LY.EBITDA UF R LY [Max]; **Y2**: Real+PPTO+LY.EBITDA UF p [Max] |
| 17 | `lineClusteredColumnComboChart` | EBITDA Acumulados (UF) | 839,1161,836,351 | **Y2**: Real+PPTO+LY.EBITDA UF YTD p [Sum]; **Y**: Real+PPTO+LY.EBITDA UF YTD R [Sum]; **Category**: Real+PPTO+LY.Periodo |
| 18 | `lineClusteredColumnComboChart` | Flujo (UF) | -1,1513,842,310 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Flujo UF R [Sum], Real+PPTO+LY.Flujo UF R LY [Sum]; **Y2**: Real+PPTO+LY.Flujo UF p [Sum] |
| 19 | `lineClusteredColumnComboChart` | Flujo Acumulados (UF) | 840,1513,829,310 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Flujo UF YTD R [Sum]; **Y2**: Real+PPTO+LY.Flujo UF YTD p [Sum] |
| 20 | `lineChart` | Tarifa UF/m2 | 839,1823,835,333 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.UF/M2_DEPARTAMENTOS R  [Sum], Real+PPTO+LY.UF/M2_DEPARTAMENTOS p [Sum], Real+PPTO+LY.Tarifa LY [Sum] |
| 21 | `lineChart` | Ocupación (%) | -2,1824,842,332 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Ocupación departamentos 2022 (%) R [Max], Real+PPTO+LY.Ocupación departamentos 2022 (%) R7 LY [Max], Real+PPTO+LY.Ocupación departamentos 2022 (%) p [Max] |
| 22 | `lineChart` | EBITDA / Cuota Banco | -1,2156,838,344 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.EBITDA UF/CUOTA BANCO p [Sum], Real+PPTO+LY.EBITDA UF/CUOTA BANCO R [Sum], Real+PPTO+LY.EBITDA UF/CUOTA BANCO R LY [Sum] |
| 23 | `lineChart` | Gastos Comunes | 836,2156,833,344 | **Category**: Real+PPTO+LY.Periodo; **Y**: Real+PPTO+LY.Gastos Comunes (UF/M2) P [Sum], Real+PPTO+LY.Gastos Comunes (UF/M2) R [Sum], Real+PPTO+LY.Gasto comun LY [Sum] |
| 24 | `pivotTable` | Cuadro de Vencimientos | 0,2500,836,400 | **Rows**: Renovaciones LAR.unidad; **Values**: Renovaciones LAR.ufm2R [Median], Renovaciones LAR.ufm2P [Median], Renovaciones LAR.tipologia [Min], Renovaciones LAR.fecha_fin [Min], Renovaciones LAR.superficie_util [Sum] |
| 25 | `lineClusteredColumnComboChart` | Cuadro de Vencimientos | 836,2501,839,400 | **Y**: Renovaciones LAR.folio [CountNonNull]; **Category**: Renovaciones LAR.fecha_fin.Variación.Jerarquía de fechas.Año, Renovaciones LAR.fecha_fin.Variación.Jerarquía de fechas.Mes; **Y2**: Renovaciones LAR.ufm2R [Median] |

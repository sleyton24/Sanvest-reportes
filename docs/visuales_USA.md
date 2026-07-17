# Inventario de visuales — unidad USA

Extraído de `Report/Layout` del .pbix (no del render). Posición en px (x,y,w,h). Campos por rol del visual.

## Página: 'USA MILA KPIS'  (20 visuales)
Tablas: ['Bemiston GP and LP Information', 'Bemiston Property Info', 'USA Bemiston Tipologias', 'USA Modelo Original Bemiston', 'Uso Y fondo Bemiston']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,1700,76 | — |
| 1 | `image` |  | 1574,0,101,76 | — |
| 2 | `actionButton` |  | 1174,2,177,58 | — |
| 3 | `image` |  | 143,8,296,57 | — |
| 4 | `actionButton` |  | 1365,8,170,57 | — |
| 5 | `actionButton` |  | 0,18,61,40 | — |
| 6 | `actionButton` |  | 51,18,99,41 | — |
| 7 | `textbox` |  | 0,19,1701,42 | — |
| 8 | `image` |  | 22,81,720,236 | — |
| 9 | `pivotTable` | Property Information Original Model | 755,98,918,180 | **Rows**: Bemiston Property Info.Property Information; **Values**: Bemiston Property Info.Gross Square Feet (GSF) [Sum], Bemiston Property Info.Rentable Square Feet (RSF) [Sum], Bemiston Property Info.Number of Units [Sum], Bemiston Property Info.Parking [Sum] |
| 10 | `pivotTable` | Unit Summary Original Model | 980,317,694,206 | **Rows**: USA Bemiston Tipologias.Floor Plan; **Values**: USA Bemiston Tipologias.Avg Rent PSF [Sum], USA Bemiston Tipologias.Avg Rent/Unit [Sum], USA Bemiston Tipologias.Avg SF/Unit [Sum], USA Bemiston Tipologias.Unit Count [Sum] |
| 11 | `cardVisual` | Loan Information Original Model | 10,319,520,134 | **Data**: USA Modelo Original Bemiston.Loan [Sum], USA Modelo Original Bemiston.Loan Rate  [Sum], USA Modelo Original Bemiston.Calc LTV [Sum] |
| 12 | `cardVisual` | Loan Actual | 532,319,436,135 | **Data**: USA Modelo Original Bemiston.Loan rate AC [Min], USA Modelo Original Bemiston.Maturity [Min] |
| 13 | `cardVisual` | Project Returns Original Model -  Expected Exit Date: December 2026 | 6,466,962,137 | **Data**: USA Modelo Original Bemiston.Terminal NOI [Sum], USA Modelo Original Bemiston.Cap Rate  [Sum], USA Modelo Original Bemiston.Gross Value [Sum], USA Modelo Original Bemiston.Cash on Cash [Sum] |
| 14 | `card` | Rent Growth (%) Original Model | 980,527,346,77 | **Values**: USA Modelo Original Bemiston.Rent growth [Min] |
| 15 | `card` | Yield to cost (%) Original Model | 1329,527,345,77 | **Values**: USA Modelo Original Bemiston.Yield to cost [Sum] |
| 16 | `pivotTable` | Uses and Sources Original Model | 980,610,694,334 | **Values**: Uso Y fondo Bemiston.Monto [Sum]; **Columns**: Uso Y fondo Bemiston.Tipo ; **Rows**: Uso Y fondo Bemiston.Category |
| 17 | `cardVisual` | XIRR | 2,612,478,147 | **Data**: Bemiston GP and LP Information.XIRR [Sum] |
| 18 | `cardVisual` | Equity Sanvest | 483,612,485,147 | **Data**: Bemiston GP and LP Information.Equity [Sum] |
| 19 | `pivotTable` | Partner Level Returns Original Model  | 0,777,960,167 | **Rows**: Bemiston GP and LP Information.Categ; **Values**: Bemiston GP and LP Information.Distributions [Sum], Bemiston GP and LP Information.EM [Sum], Bemiston GP and LP Information.Equity [Sum], Bemiston GP and LP Information.Net Cash Flow [Sum], Bemiston GP and LP Information.XIRR [Sum] |

## Página: 'MILA'  (21 visuales)
Tablas: ['MILA FINAL', 'Ocupación PPTO', 'USA Graficos', 'USA KPIS GESTION']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,1800,76 | — |
| 1 | `image` |  | 1687,0,101,76 | — |
| 2 | `slicer` |  | 1375,4,255,69 | **Values**: Ocupación PPTO.Fecha |
| 3 | `image` |  | 100,10,296,57 | — |
| 4 | `textbox` |  | 0,16,1800,42 | — |
| 5 | `actionButton` |  | 61,16,100,41 | — |
| 6 | `actionButton` |  | 0,18,61,40 | — |
| 7 | `image` |  | 0,77,411,364 | — |
| 8 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Operating Statements | 411,104,680,337 | **Category**: MILA FINAL.Nivel 3 AUX, MILA FINAL.Nivel 2 , MILA FINAL.Nivel 1; **Values**: MILA FINAL.Real [Sum]; **Plan**: MILA FINAL.Monto 2 [Sum] |
| 9 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Operating Statements | 1106,105,694,337 | **Category**: MILA FINAL.Nivel 3 AUX, MILA FINAL.Nivel 2 , MILA FINAL.Nivel 1; **PreviousYear**: MILA FINAL.YTD [Sum]; **Forecast**: MILA FINAL.YTD PPTO [Sum] |
| 10 | `cardVisual` | Rent KPi''s Month | 5,457,549,246 | **Data**: USA KPIS GESTION.Dólar SQF AC MONTH [Min], USA KPIS GESTION.Dólar SQF BD MONTH [Avg], USA KPIS GESTION.Dólar SQF Retail AC MONTH [Avg], USA KPIS GESTION.Dólar SQF Retail BD MONTH [Avg] |
| 11 | `cardVisual` | Rent KPi''s YTD | 561,457,554,246 | **Data**: USA KPIS GESTION.Dólar SQF AC YTD [Sum], USA KPIS GESTION.Dólar SQF BD YTD [Avg], USA KPIS GESTION.Dólar SQF Retail AC YTD [Avg], USA KPIS GESTION.Dólar SQF Retail BD YTD [Avg] |
| 12 | `gauge` | Residential Occupancy % | 1125,457,664,246 | **TargetValue**: Ocupación PPTO.Occupied % [Max]; **Y**: Ocupación PPTO.Occupied % R [Sum] |
| 13 | `lineChart` | Occupancy (%) | 0,728,877,326 | **Category**: Ocupación PPTO.Fecha; **Y**: Ocupación PPTO.Occupied % R [Sum], Ocupación PPTO.Ocupacion O [Sum], Ocupación PPTO.Occupied % [Max] |
| 14 | `lineChart` | Average Rent  (USD/Sqf) | 894,728,907,326 | **Y**: USA KPIS GESTION.Dólar SQF BD MONTH [Max], USA KPIS GESTION.Dólar SQF AC MONTH [Max], USA KPIS GESTION.Dólar SQF O [Min]; **Category**: USA KPIS GESTION.DATE AC.Variación.Jerarquía de fechas.Año, USA KPIS GESTION.DATE AC.Variación.Jerarquía de fechas.Mes |
| 15 | `lineClusteredColumnComboChart` | Monthly Revenues USD  | 4,1067,873,323 | **Y**: USA Graficos.Actual P [Sum]; **Y2**: USA Graficos.Original [Sum], USA Graficos.Budget P [Sum]; **Category**: USA Graficos.Fecha |
| 16 | `lineClusteredColumnComboChart` | Revenues YTD USD  | 894,1067,907,323 | **Y**: USA Graficos.Actual YTD [Sum]; **Category**: USA Graficos.Fecha; **Y2**: USA Graficos.Original YTD [Sum], USA Graficos.Budget YTD [Sum] |
| 17 | `lineClusteredColumnComboChart` | Monthly Operating Expenses USD  | 0,1409,873,347 | **Y**: USA Graficos.Actual P [Sum]; **Y2**: USA Graficos.Original [Sum], USA Graficos.Budget P [Sum]; **Category**: USA Graficos.Fecha |
| 18 | `lineClusteredColumnComboChart` | Operating Expenses YTD USD  | 894,1409,907,347 | **Category**: USA Graficos.Fecha; **Y**: USA Graficos.AUX Real [Sum]; **Y2**: USA Graficos.OR YTD P [Sum], USA Graficos.Aux BD  [Sum] |
| 19 | `lineClusteredColumnComboChart` | Monthly Operating Income USD  | 0,1776,873,371 | **Y**: USA Graficos.Actual [Sum]; **Y2**: USA Graficos.Original N [Sum], USA Graficos.Budget [Sum]; **Category**: USA Graficos.Fecha |
| 20 | `lineClusteredColumnComboChart` | Net Operating Income YTD USD  | 892,1776,907,369 | **Y**: USA Graficos.Actual YTD [Sum]; **Category**: USA Graficos.Fecha; **Y2**: USA Graficos.Original YTD [Sum], USA Graficos.Budget YTD [Sum] |

## Página: 'Bemiston Gestión'  (21 visuales)
Tablas: ['Ocupación PPTO', 'USA Graficos', 'USA KPIS GESTION', 'fINAL beMISTON']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,1800,87 | — |
| 1 | `slicer` | Fecha | 1310,4,253,82 | **Values**: Ocupación PPTO.Fecha |
| 2 | `image` |  | 128,9,297,57 | — |
| 3 | `textbox` |  | 0,16,1800,55 | — |
| 4 | `actionButton` |  | 62,16,99,41 | — |
| 5 | `image` |  | 1564,16,222,51 | — |
| 6 | `actionButton` |  | 0,18,61,40 | — |
| 7 | `image` |  | 6,87,494,298 | — |
| 8 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Operating Statements Monthly | 522,100,636,286 | **Category**: fINAL beMISTON.Nivel 3, fINAL beMISTON.Nivel 2, fINAL beMISTON.Nivel 1; **PreviousYear**: fINAL beMISTON.Monto AUX [Sum]; **Values**: fINAL beMISTON.Real UAX [Sum] |
| 9 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Operating Statements YTD | 1164,100,636,286 | **Category**: fINAL beMISTON.Nivel 3, fINAL beMISTON.Nivel 2, fINAL beMISTON.Nivel 1; **PreviousYear**: fINAL beMISTON.AUX YTD  [Sum]; **Forecast**: fINAL beMISTON.AUX YTD P [Sum] |
| 10 | `gauge` | Residential Occupancy % | 1339,393,461,246 | **Y**: Ocupación PPTO.Occupied % R [Sum]; **TargetValue**: Ocupación PPTO.Occupied % [Sum] |
| 11 | `cardVisual` | Rent KPi''s Month | 16,396,637,245 | **Data**: USA KPIS GESTION.Dólar SQF AC MONTH [Min], USA KPIS GESTION.Dólar SQF BD MONTH [Avg], USA KPIS GESTION.Dólar SQF Retail AC MONTH [Avg], USA KPIS GESTION.Dólar SQF Retail BD MONTH [Avg] |
| 12 | `cardVisual` | Rent KPi''s YTD | 673,396,637,243 | **Data**: USA KPIS GESTION.Dólar SQF AC YTD [Min], USA KPIS GESTION.Dólar SQF BD YTD [Avg], USA KPIS GESTION.Dólar SQF Retail AC YTD [Avg], USA KPIS GESTION.Dólar SQF Retail BD YTD [Avg] |
| 13 | `lineChart` | Occupancy (%) | 0,650,877,275 | **Category**: Ocupación PPTO.Fecha; **Y**: Ocupación PPTO.Occupied % R [Sum], Ocupación PPTO.Ocupacion O [Sum], Ocupación PPTO.Occupied % [Max] |
| 14 | `lineChart` | Average Rent  (USD/Sqf) | 891,650,909,275 | **Y**: USA KPIS GESTION.Dólar SQF O AVG [Sum], USA KPIS GESTION.Dólar SQF BD MONTH [Max], USA KPIS GESTION.Dólar SQF AC MONTH [Max]; **Category**: USA KPIS GESTION.DATE AC.Variación.Jerarquía de fechas.Año, USA KPIS GESTION.DATE AC.Variación.Jerarquía de fechas.Mes |
| 15 | `lineClusteredColumnComboChart` | Revenues YTD USD  | 894,950,906,275 | **Y**: USA Graficos.Actual YTD [Sum]; **Category**: USA Graficos.Fecha; **Y2**: USA Graficos.Original YTD [Sum], USA Graficos.Budget YTD [Sum] |
| 16 | `lineClusteredColumnComboChart` | Monthly Revenues USD  | 3,952,873,273 | **Y**: USA Graficos.Actual P [Sum]; **Y2**: USA Graficos.Original [Sum], USA Graficos.Budget P [Sum]; **Category**: USA Graficos.Fecha |
| 17 | `lineClusteredColumnComboChart` | Monthly Operating Expenses USD  | 0,1237,873,274 | **Y**: USA Graficos.Actual P [Sum]; **Y2**: USA Graficos.Original [Sum], USA Graficos.Budget P [Sum]; **Category**: USA Graficos.Fecha |
| 18 | `lineClusteredColumnComboChart` | Operating Expenses YTD USD  | 894,1237,906,274 | **Category**: USA Graficos.Fecha; **Y**: USA Graficos.AUX Real [Sum]; **Y2**: USA Graficos.OR YTD P [Sum], USA Graficos.Aux BD  [Sum] |
| 19 | `lineClusteredColumnComboChart` | Monthly NOI USD  | 0,1530,873,274 | **Y**: USA Graficos.Actual [Sum]; **Y2**: USA Graficos.Original N [Sum], USA Graficos.Budget [Sum]; **Category**: USA Graficos.Fecha |
| 20 | `lineClusteredColumnComboChart` | Net Operating Income YTD USD  | 892,1530,906,274 | **Y**: USA Graficos.Actual YTD [Sum]; **Category**: USA Graficos.Fecha; **Y2**: USA Graficos.Original YTD [Sum], USA Graficos.Budget YTD [Sum] |

## Página: 'USA Bemiston KPIS'  (19 visuales)
Tablas: ['Bemiston GP and LP Information', 'Bemiston Property Info', 'USA Bemiston Tipologias', 'USA Modelo Original Bemiston', 'Uso Y fondo Bemiston']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,1700,76 | — |
| 1 | `image` |  | 121,8,296,57 | — |
| 2 | `actionButton` |  | 1266,9,176,58 | — |
| 3 | `textbox` |  | 0,16,1700,41 | — |
| 4 | `actionButton` |  | 44,16,126,52 | — |
| 5 | `image` |  | 1442,16,223,51 | — |
| 6 | `actionButton` |  | 0,18,60,40 | — |
| 7 | `image` |  | 12,85,728,251 | — |
| 8 | `pivotTable` | Property Information Original Model | 756,132,918,179 | **Rows**: Bemiston Property Info.Property Information; **Values**: Bemiston Property Info.Gross Square Feet (GSF) [Sum], Bemiston Property Info.Rentable Square Feet (RSF) [Sum], Bemiston Property Info.Number of Units [Sum], Bemiston Property Info.Parking [Sum] |
| 9 | `pivotTable` | Unit Summary Original Model | 1022,336,649,162 | **Rows**: USA Bemiston Tipologias.Floor Plan; **Values**: USA Bemiston Tipologias.Avg Rent PSF [Sum], USA Bemiston Tipologias.Avg Rent/Unit [Sum], USA Bemiston Tipologias.Avg SF/Unit [Sum], USA Bemiston Tipologias.Unit Count [Sum] |
| 10 | `cardVisual` | HUD Loan Information Original Model | 0,338,520,134 | **Data**: USA Modelo Original Bemiston.Loan [Sum], USA Modelo Original Bemiston.Loan Rate  [Sum], USA Modelo Original Bemiston.Calc LTV [Sum] |
| 11 | `cardVisual` | HUD Loan Actual | 521,339,483,134 | **Data**: USA Modelo Original Bemiston.Loan rate AC [Min], USA Modelo Original Bemiston.Maturity [Min] |
| 12 | `cardVisual` | Project Returns Original Model -  Expected Exit Date: January 2028 | 2,484,1002,138 | **Data**: USA Modelo Original Bemiston.Terminal NOI [Sum], USA Modelo Original Bemiston.Cap Rate  [Sum], USA Modelo Original Bemiston.Gross Value [Sum], USA Modelo Original Bemiston.Cash on Cash [Sum] |
| 13 | `card` | Yield to cost (%) Original Model | 1330,500,345,121 | **Values**: USA Modelo Original Bemiston.Yield to cost [Sum] |
| 14 | `card` | Rent Growth (%) Original Model | 1022,501,305,121 | **Values**: USA Modelo Original Bemiston.Rent growth [Min] |
| 15 | `cardVisual` | XIRR | 0,629,502,148 | **Data**: Bemiston GP and LP Information.XIRR [Sum]; **Rows**: Bemiston GP and LP Information.Categ |
| 16 | `cardVisual` | Equity Sanvest | 518,630,486,147 | **Data**: Bemiston GP and LP Information.Equity [Sum] |
| 17 | `pivotTable` | Uses and Sources Original Model | 1022,639,651,352 | **Values**: Uso Y fondo Bemiston.Monto [Sum]; **Columns**: Uso Y fondo Bemiston.Tipo ; **Rows**: Uso Y fondo Bemiston.Category |
| 18 | `pivotTable` | Partner Level Returns Original Model | 0,787,1004,213 | **Rows**: Bemiston GP and LP Information.Categ; **Values**: Bemiston GP and LP Information.Distributions [Sum], Bemiston GP and LP Information.EM [Sum], Bemiston GP and LP Information.Equity [Sum], Bemiston GP and LP Information.Net Cash Flow [Sum], Bemiston GP and LP Information.Promote [Sum], Bemiston GP and LP Information.Structure Fee [Sum], Bemiston GP and LP Information.XIRR [Sum] |

## Página: 'ST grand '  (24 visuales)
Tablas: ['Ocupación PPTO', 'St grand final (2)', 'USA Graficos', 'USA KPIS GESTION', 'USA Renovación contratos']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,1887,91 | — |
| 1 | `slicer` |  | 1419,4,255,88 | **Values**: Ocupación PPTO.Fecha |
| 2 | `image` |  | 1641,5,190,68 | — |
| 3 | `image` |  | 148,8,295,58 | — |
| 4 | `textbox` |  | 0,16,1800,42 | — |
| 5 | `actionButton` |  | 62,16,99,41 | — |
| 6 | `actionButton` |  | 0,18,61,40 | — |
| 7 | `image` |  | 43,92,475,320 | — |
| 8 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Operating Statements | 524,96,642,303 | **Category**: St grand final (2).Nivel 2, St grand final (2).Nivel 3, St grand final (2).Nivel 1; **PreviousYear**: St grand final (2).Real [Sum]; **Values**: St grand final (2).Monto 2 [Sum] |
| 9 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Operating Statements | 1202,96,656,304 | **Category**: St grand final (2).Nivel 2, St grand final (2).Nivel 3, St grand final (2).Nivel 1; **Plan**: St grand final (2).YTD PPTO [Sum]; **Forecast**: St grand final (2).YTD [Sum] |
| 10 | `cardVisual` | Rent KPi''s Month | 0,411,447,247 | **Data**: USA KPIS GESTION.Dólar SQF AC MONTH [Min], USA KPIS GESTION.Dólar SQF BD MONTH [Avg], USA KPIS GESTION.Dólar SQF Retail AC MONTH [Avg], USA KPIS GESTION.Dólar SQF Retail BD MONTH [Avg] |
| 11 | `cardVisual` | Rent KPi''s YTD | 449,411,452,245 | **Data**: USA KPIS GESTION.Dólar SQF AC YTD [Min], USA KPIS GESTION.Dólar SQF BD YTD [Avg], USA KPIS GESTION.Dólar SQF Retail AC YTD [Avg], USA KPIS GESTION.Dólar SQF Retail BD YTD [Avg] |
| 12 | `gauge` | Residential Occupancy (%) | 911,411,467,244 | **Y**: Ocupación PPTO.Occupied % R [Sum]; **TargetValue**: Ocupación PPTO.Occupied % [Sum] |
| 13 | `gauge` | Retail Occupancy (%) | 1390,412,468,245 | **Y**: Ocupación PPTO.Ocupacion Retail [Sum] |
| 14 | `lineChart` | Occupancy (%) | 0,654,901,276 | **Category**: Ocupación PPTO.Fecha; **Y**: Ocupación PPTO.Occupied % R [Sum], Ocupación PPTO.Ocupacion O [Sum], Ocupación PPTO.Occupied % [Max] |
| 15 | `lineChart` | Average Rent  (USD/Sqf) | 923,657,935,276 | **Y**: USA KPIS GESTION.Dólar SQF AC MONTH [Max], USA KPIS GESTION.Dólar SQF O [Min], USA KPIS GESTION.Dólar SQF BD MONTH [Max]; **Category**: USA KPIS GESTION.DATE AC.Variación.Jerarquía de fechas.Año, USA KPIS GESTION.DATE AC.Variación.Jerarquía de fechas.Mes |
| 16 | `lineClusteredColumnComboChart` | Monthly Revenues USD  | 0,956,901,274 | **Y**: USA Graficos.Actual P [Sum]; **Y2**: USA Graficos.Original [Sum], USA Graficos.Budget P [Sum]; **Category**: USA Graficos.Fecha |
| 17 | `lineClusteredColumnComboChart` | Revenues YTD USD  | 928,956,930,278 | **Y**: USA Graficos.Actual YTD [Sum]; **Category**: USA Graficos.Fecha; **Y2**: USA Graficos.Original YTD [Sum], USA Graficos.Budget YTD [Sum] |
| 18 | `lineClusteredColumnComboChart` | Operating Expenses YTD USD  | 928,1241,930,274 | **Category**: USA Graficos.Fecha; **Y**: USA Graficos.AUX Real [Sum]; **Y2**: USA Graficos.OR YTD P [Sum], USA Graficos.Aux BD  [Sum] |
| 19 | `lineClusteredColumnComboChart` | Monthly Operating Expenses USD  | 0,1242,897,274 | **Y**: USA Graficos.Actual P [Sum]; **Y2**: USA Graficos.Original [Sum], USA Graficos.Budget P [Sum]; **Category**: USA Graficos.Fecha |
| 20 | `lineClusteredColumnComboChart` | Monthly NOI USD  | 0,1534,896,312 | **Y**: USA Graficos.Actual [Sum]; **Y2**: USA Graficos.Original N [Sum], USA Graficos.Budget [Sum]; **Category**: USA Graficos.Fecha |
| 21 | `lineClusteredColumnComboChart` | Net Operating Income YTD USD  | 928,1534,930,312 | **Y**: USA Graficos.Actual YTD [Sum]; **Category**: USA Graficos.Fecha; **Y2**: USA Graficos.Original YTD [Sum], USA Graficos.Budget YTD [Sum] |
| 22 | `lineClusteredColumnComboChart` | Contracts to Renew per month | 0,1883,720,374 | **Y**: USA Renovación contratos.Unit # [CountNonNull]; **Y2**: USA Renovación contratos.Gross Rent [Sum], USA Renovación contratos.Renewal Offer Gross Rent [Sum]; **Category**: USA Renovación contratos.Lease End.Variación.Jerarquía de fechas.Mes |
| 23 | `pivotTable` | Renewal Information per Unit | 775,1883,1112,372 | **Rows**: USA Renovación contratos.Unit #; **Values**: USA Renovación contratos.Gross Rent [Sum], USA Renovación contratos.Renewal Offer Gross Rent [Sum], USA Renovación contratos. Market Rent [Sum], USA Renovación contratos.Gross Rent PSF [Avg], USA Renovación contratos.Net Rent PSF renewal [Avg], USA Renovación contratos.Market Rent PSF [Avg], USA Renovación contratos.Lease End [Min] |

## Página: 'USA St Grand KPIS'  (19 visuales)
Tablas: ['Bemiston GP and LP Information', 'Bemiston Property Info', 'USA Bemiston Tipologias', 'USA Modelo Original Bemiston', 'Uso Y fondo Bemiston']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,1700,76 | — |
| 1 | `image` |  | 1485,5,190,68 | — |
| 2 | `actionButton` |  | 1318,10,186,58 | — |
| 3 | `image` |  | 153,11,296,57 | — |
| 4 | `textbox` |  | 0,16,1700,41 | — |
| 5 | `actionButton` |  | 0,18,61,40 | — |
| 6 | `actionButton` |  | 54,20,99,39 | — |
| 7 | `image` |  | 0,92,736,239 | — |
| 8 | `pivotTable` | Property Information Original Model | 736,106,919,214 | **Rows**: Bemiston Property Info.Property Information; **Values**: Bemiston Property Info.Gross Square Feet (GSF) [Sum], Bemiston Property Info.Rentable Square Feet (RSF) [Sum], Bemiston Property Info.Number of Units [Sum], Bemiston Property Info.Parking [Sum] |
| 9 | `pivotTable` | Unit Summary Original Model | 978,320,696,174 | **Rows**: USA Bemiston Tipologias.Floor Plan; **Values**: USA Bemiston Tipologias.Avg Rent PSF [Sum], USA Bemiston Tipologias.Avg Rent/Unit [Sum], USA Bemiston Tipologias.Avg SF/Unit [Sum], USA Bemiston Tipologias.Unit Count [Sum] |
| 10 | `cardVisual` | HUD Loan Information Original Model | 1,331,519,135 | **Data**: USA Modelo Original Bemiston.Loan [Sum], USA Modelo Original Bemiston.Loan Rate  [Sum], USA Modelo Original Bemiston.Calc LTV [Sum] |
| 11 | `cardVisual` | Actual Loan | 534,331,428,136 | **Data**: USA Modelo Original Bemiston.Loan rate AC [Min], USA Modelo Original Bemiston.Maturity [Min] |
| 12 | `cardVisual` | Project Returns Original Model -  Expected Exit Date: January 2026 | 2,468,962,138 | **Data**: USA Modelo Original Bemiston.Terminal NOI [Sum], USA Modelo Original Bemiston.Cap Rate  [Sum], USA Modelo Original Bemiston.Gross Value [Sum], USA Modelo Original Bemiston.Cash on Cash [Sum] |
| 13 | `card` | Rent Growth (%) Original Model | 981,517,346,102 | **Values**: USA Modelo Original Bemiston.Rent growth [Min] |
| 14 | `card` | Yield to cost (%) Original Model | 1329,517,344,102 | **Values**: USA Modelo Original Bemiston.Yield to cost [Sum] |
| 15 | `cardVisual` | Equity Sanvest | 633,610,329,125 | **Data**: Bemiston GP and LP Information.Equity [Sum] |
| 16 | `cardVisual` | XIRR | 1,611,624,124 | **Data**: Bemiston GP and LP Information.XIRR [Sum]; **Rows**: Bemiston GP and LP Information.Categ |
| 17 | `pivotTable` | Uses and sources Original Model | 979,650,696,350 | **Values**: Uso Y fondo Bemiston.Monto [Sum]; **Columns**: Uso Y fondo Bemiston.Tipo ; **Rows**: Uso Y fondo Bemiston.Category |
| 18 | `pivotTable` | Partner Level Returns Original Model | 0,743,963,257 | **Rows**: Bemiston GP and LP Information.Categ; **Values**: Bemiston GP and LP Information.Distributions [Sum], Bemiston GP and LP Information.EM [Sum], Bemiston GP and LP Information.Equity [Sum], Bemiston GP and LP Information.Net Cash Flow [Sum], Bemiston GP and LP Information.Promote [Sum], Bemiston GP and LP Information.Structure Fee [Sum], Bemiston GP and LP Information.XIRR [Sum] |

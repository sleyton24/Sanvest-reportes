# Inventario de visuales — unidad ICEMM

Extraído de `Report/Layout` del .pbix (no del render). Posición en px (x,y,w,h). Campos por rol del visual.

## Página: 'USA Bemiston Construcción'  (11 visuales)
Tablas: ['USA Bemiston (2)', 'USA EV costos Bemiston']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,1700,77 | — |
| 1 | `slicer` | Date (Year, Month) | 1221,5,244,60 | **Values**: USA Bemiston (2).Periodo |
| 2 | `image` |  | 184,13,296,59 | — |
| 3 | `image` |  | 1466,13,223,51 | — |
| 4 | `actionButton` |  | 0,17,100,40 | — |
| 5 | `actionButton` |  | 84,23,100,40 | — |
| 6 | `image` |  | 5,77,473,330 | — |
| 7 | `cardVisual` | Financial KPIS | 479,89,1209,154 | **Data**: USA Bemiston (2).Inversión Total_USD [Max], USA Bemiston (2).Participación_BNV_en_Sociedad(%) [Max], USA Bemiston (2).TIR_BNV_AI [Max], USA Bemiston (2).AVANCE_CONSTRUCCIÓN [Max] |
| 8 | `cardVisual` | Construction Costs Information | 480,252,1210,161 | **Data**: USA Bemiston (2).COSTO_TOTAL_PROYECTO_(USD) [Max], USA Bemiston (2).COSTOS_TOTALES_PROYECTO_NETO (USD) [Max], USA Bemiston (2).%LINEA/COSTO_TOTAL_NETO [Max], USA Bemiston (2).DEUDA_A_LA_FECHA UF [Max], USA Bemiston (2).DEUDA_APROBADA_(USD) [Max] |
| 9 | `card` | Costo del Proyecto a la fecha (USD) | 17,423,449,123 | **Values**: USA EV costos Bemiston.COSTO_TOTAL_PROYECTO_(USD) [Max] |
| 10 | `lineChart` | Evolutivo de costos  | 480,424,1208,235 | **Category**: USA EV costos Bemiston.Periodo; **Y**: USA EV costos Bemiston.COSTO_TOTAL_PROYECTO_(USD) [Sum] |

## Página: 'Menu USA CONSTRUCCION'  (6 visuales)
Tablas: []

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `image` |  | 1000,145,134,132 | — |
| 1 | `shape` |  | 0,152,1300,103 | — |
| 2 | `image` |  | 166,166,296,74 | — |
| 3 | `textbox` |  | 342,166,666,89 | — |
| 4 | `actionButton` |  | 22,183,99,40 | — |
| 5 | `image` |  | 599,277,151,113 | — |

## Página: 'MILA Construccion'  (14 visuales)
Tablas: ['Base mila CC']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,1701,76 | — |
| 1 | `actionButton` |  | 30,0,131,77 | — |
| 2 | `slicer` | Date | 1334,0,217,70 | **Values**: Base mila CC.Date  |
| 3 | `image` |  | 1574,0,101,76 | — |
| 4 | `image` |  | 100,10,296,57 | — |
| 5 | `textbox` |  | 0,16,1700,41 | — |
| 6 | `actionButton` |  | 0,18,61,40 | — |
| 7 | `image` |  | 0,77,700,275 | — |
| 8 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Uses and Sources | 715,83,960,608 | **Category**: Base mila CC.Nivel 3 , Base mila CC.Nivel 2, Base mila CC.Nivel 1; **Plan**: Base mila CC.Total Budget [Sum]; **PreviousYear**: Base mila CC.REAL [Sum]; **Values**: Base mila CC.YTD  [Sum]; **Forecast**: Base mila CC.YTG [Sum] |
| 9 | `gauge` | Construction Pogress | 0,352,700,192 | **Y**: Base mila CC.YTD  dividido por Total Budget:m |
| 10 | `cardVisual` | Total Cost | 0,560,700,131 | **Data**: Base mila CC.Total Budget [Sum], Base mila CC.YTD  [Sum], Base mila CC.YTG [Sum] |
| 11 | `cardVisual` | Construction Cost | 0,707,700,131 | **Data**: Base mila CC.Total Budget [Sum], Base mila CC.YTD  [Sum], Base mila CC.YTG [Sum] |
| 12 | `lineClusteredColumnComboChart` | Total Cost Evolution | 715,713,960,278 | **Y**: Base mila CC.REAL [Sum]; **Y2**: Base mila CC.YTD  [Sum]; **Category**: Base mila CC.Date  |
| 13 | `cardVisual` | Debt Progress | 0,853,700,131 | **Data**: Base mila CC.Total Budget [Sum], Base mila CC.YTD  [Sum], Base mila CC.YTD  dividido por Total Budget:m |

## Página: 'Menu Construccion'  (10 visuales)
Tablas: []

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `image` |  | 0,0,277,103 | — |
| 1 | `shape` |  | 0,152,1300,103 | — |
| 2 | `textbox` |  | 114,152,1092,103 | — |
| 3 | `actionButton` |  | 16,182,99,41 | — |
| 4 | `actionButton` |  | 246,326,259,106 | — |
| 5 | `actionButton` |  | 524,326,251,106 | — |
| 6 | `actionButton` |  | 793,326,251,105 | — |
| 7 | `image` |  | 541,329,207,103 | — |
| 8 | `image` |  | 246,334,259,80 | — |
| 9 | `image` |  | 858,337,121,84 | — |

## Página: 'ICEMM'  (20 visuales)
Tablas: ['Flujo', 'ICEMM Mensual']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,2000,119 | — |
| 1 | `image` |  | 1554,8,197,102 | — |
| 2 | `textbox` |  | 0,16,1701,103 | — |
| 3 | `slicer` | Mes | 1286,16,220,86 | **Values**: ICEMM Mensual.Fecha |
| 4 | `actionButton` |  | 36,25,144,78 | — |
| 5 | `image` |  | 108,30,358,68 | — |
| 6 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros FY | 1228,143,522,381 | **Category**: ICEMM Mensual.Nivel 1, ICEMM Mensual.Nivel 2; **Values**: ICEMM Mensual.FY Proy [Sum]; **PreviousYear**: ICEMM Mensual.FY PPTO [Sum] |
| 7 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros YTD | 0,145,659,381 | **Category**: ICEMM Mensual.Nivel 1, ICEMM Mensual.Nivel 2; **Values**: ICEMM Mensual.YTD Real [Sum]; **PreviousYear**: ICEMM Mensual.YTD PPTO [Sum] |
| 8 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros YTG | 659,145,569,384 | **Category**: ICEMM Mensual.Nivel 1, ICEMM Mensual.Nivel 2; **Values**: ICEMM Mensual.YTG Proy [Sum]; **PreviousYear**: ICEMM Mensual.YTG PPTO [Sum] |
| 9 | `pivotTable` |  | 0,540,1746,630 | **Rows**: Flujo.Categoría 1, Flujo.Categoría 2; **Columns**: Flujo.Fecha; **Values**: Flujo.Monto [Sum] |
| 10 | `shape` |  | 0,1190,1750,117 | — |
| 11 | `slicer` | Mes | 2,1192,360,115 | **Values**: ICEMM Mensual.Fecha |
| 12 | `lineStackedColumnComboChart` | Ingreso Mensual | 1,1327,847,383 | **Y**: ICEMM Mensual.Real [Sum]; **Category**: ICEMM Mensual.Fecha; **Y2**: ICEMM Mensual.Proy [Sum], ICEMM Mensual.PPTO [Sum] |
| 13 | `lineStackedColumnComboChart` | Ingresos YTD | 876,1327,875,383 | **Category**: ICEMM Mensual.Fecha; **Y**: ICEMM Mensual.YTD Real [Sum]; **Y2**: ICEMM Mensual.YTD Proy [Sum], ICEMM Mensual.YTD PPTO [Sum] |
| 14 | `lineStackedColumnComboChart` | Gastos Operaciones Mensual | 0,1727,846,384 | **Category**: ICEMM Mensual.Fecha; **Y2**: ICEMM Mensual.Suma de Proy x AUX:m, ICEMM Mensual.Suma de PPTO x AUX:m; **Y**: ICEMM Mensual.Suma de Real x AUX:m |
| 15 | `lineStackedColumnComboChart` | Gastos Operacionales YTD | 875,1728,874,382 | **Category**: ICEMM Mensual.Fecha; **Y**: ICEMM Mensual.Suma de YTD Real x AUX:m; **Y2**: ICEMM Mensual.Suma de YTD Proy x AUX:m, ICEMM Mensual.Suma de YTD PPTO x AUX:m |
| 16 | `lineStackedColumnComboChart` | Resultado Operacional Mensual | 1,2125,850,384 | **Y**: ICEMM Mensual.Real [Sum]; **Category**: ICEMM Mensual.Fecha; **Y2**: ICEMM Mensual.Proy [Sum], ICEMM Mensual.PPTO [Sum] |
| 17 | `lineStackedColumnComboChart` | Resultado Operacional YTD | 877,2125,868,384 | **Category**: ICEMM Mensual.Fecha; **Y**: ICEMM Mensual.YTD Real [Sum]; **Y2**: ICEMM Mensual.YTD Proy [Sum], ICEMM Mensual.YTD PPTO [Sum] |
| 18 | `lineStackedColumnComboChart` | EBITDA Mensual | 2,2518,850,382 | **Y**: ICEMM Mensual.Real [Sum]; **Category**: ICEMM Mensual.Fecha; **Y2**: ICEMM Mensual.Proy [Sum], ICEMM Mensual.PPTO [Sum] |
| 19 | `lineStackedColumnComboChart` | EBITDA YTD | 878,2518,870,382 | **Category**: ICEMM Mensual.Fecha; **Y**: ICEMM Mensual.YTD Real [Sum]; **Y2**: ICEMM Mensual.YTD Proy [Sum], ICEMM Mensual.YTD PPTO [Sum] |

# Inventario de visuales — páginas Desarrollo para la Venta

Extraído de `Report/Layout` del .pbix (no del render). Posición en px (x,y,w,h). Campos por rol del visual.

## Página: 'Menu Desarrollo Para Venta'  (8 visuales)
Tablas: []

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `image` |  | 986,197,134,133 | — |
| 1 | `shape` | Renta Residencial | 0,210,1299,103 | — |
| 2 | `textbox` |  | 344,211,666,104 | — |
| 3 | `image` |  | 82,224,295,74 | — |
| 4 | `actionButton` |  | 1,243,99,40 | — |
| 5 | `image` |  | 385,330,187,112 | — |
| 6 | `image` |  | 573,330,181,112 | — |
| 7 | `image` |  | 758,337,159,99 | — |

## Página: 'Millalongo'  (18 visuales)
Tablas: ['Amortizacion', 'DV Construccion', 'DV Escrituras', 'DV Evolucion de costos', 'DV KPIS', 'DV Uso y Fondo', 'DV Ventas', 'FECHA AUX', 'Financieros Sanvest']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,2000,129 | — |
| 1 | `image` |  | 193,9,364,110 | — |
| 2 | `actionButton` |  | 54,25,144,79 | — |
| 3 | `slicer` | Fecha (Año) | 1476,25,218,94 | **Values**: FECHA AUX.Año |
| 4 | `slicer` | Fecha (Mes) | 1712,25,218,94 | **Values**: FECHA AUX.mes |
| 5 | `textbox` |  | 539,38,817,59 | — |
| 6 | `actionButton` |  | 0,40,54,56 | — |
| 7 | `image` |  | 2,159,323,274 | — |
| 8 | `gauge` | Avance construcción Financiero | 330,159,321,275 | **Y**: DV Construccion.AVANCE_CONSTRUCCIÓN [Max] |
| 9 | `gauge` | Avance Ventas | 663,159,279,274 | **Y**: DV KPIS.UNIDADES_VENDIDAS [Sum] |
| 10 | `cardVisual` | Ev. Original Indicadores Financieros  | 949,159,1051,274 | **Data**: Financieros Sanvest.Inversión Sanvest [Sum], Financieros Sanvest.Participación Sanvest [Sum], Financieros Sanvest.Margen % (UT/CT) [Sum], Financieros Sanvest.Margen % (UT/VTA) [Sum], Financieros Sanvest.Margen Sanvest UF [Sum], Financieros Sanvest.TIR Sanvest [Sum], Financieros Sanvest.ROI Sanvest [Sum], Financieros Sanvest.Margen Proyecto UF [Sum] |
| 11 | `cardVisual` | Información Ventas a la Fecha | 0,449,1075,326 | **Data**: DV KPIS.VENTAS NETAS_DEL_MES [Max], DV Ventas.RESERVAS_Y_PROMESAS [Sum], DV Ventas.UNIDADES_ESCRITURADAS_FIRMADAS [Sum], DV Ventas.UNIDADES_ESCRITURADAS_RECAUDADAS [Sum], DV Escrituras.PROYECCIÓN_VENTA_TOTAL(UF) [Max], DV Ventas.VENTAS_ACUMULADAS [Sum], DV Ventas.UF_RECAUDADAS          [Sum], DV Ventas.UF_POR_RECAUDAR [Sum], Financieros Sanvest.UF/m2 Venta Dpto actual [Sum], Financieros Sanvest.UF/m2 Venta Dpto Ev. Original [Sum], Financieros Sanvest.UF/m2 venta total actual [Sum], Financieros Sanvest.UF/m2 venta total EV. Original [Sum] |
| 12 | `cardVisual` | Ev. Original Información de Construcción  | 1076,450,924,325 | **Data**: DV Construccion.COSTO_TOTAL_PROYECTO_(UF) [Max], DV Construccion.COSTOS_TOTALES_PROYECTO_NETO (UF) [Max], DV Construccion.DEUDA_A_LA_FECHA UF [Max], Financieros Sanvest.Costo total neto /m2 vendible (UF/m2) [Sum], Financieros Sanvest.Incidencia construcción (UF/m2 losa) [Sum], DV Construccion.%LINEA/COSTO_TOTAL_NETO [Max] |
| 13 | `columnChart` | Ventas acumuladas (UF) | 0,774,1076,520 | **Y**: DV Ventas.UF_POR_RECAUDAR [Sum], DV Ventas.UF_RECAUDADAS          [Sum]; **Category**: FECHA AUX.Periodo |
| 14 | `pivotTable` | Usos y Fondos Proyecto a la Fecha | 1076,776,924,319 | **Rows**: DV Uso y Fondo.SUBCATEGORIA; **Values**: DV Uso y Fondo.Monto [Sum]; **Columns**: DV Uso y Fondo.Categoria |
| 15 | `cardVisual` | Estado de Deuda a la Fecha  | 1076,1095,925,198 | **Data**: Amortizacion.Saldo [Sum], Amortizacion.Amortizado [Max] |
| 16 | `lineStackedColumnComboChart` | Ventas acumuladas Unidades | 0,1294,1076,564 | **Y2**: DV KPIS.UNIDADES_VENDIDAS [Max]; **Y**: DV KPIS.VENTAS NETAS_DEL_MES [Sum]; **Category**: FECHA AUX.Periodo |
| 17 | `clusteredColumnChart` | Necesidad de caja  (M UF) | 1076,1294,925,564 | **Category**: FECHA AUX.Periodo; **Y**: DV Evolucion de costos.COSTOS_REALES [Max], DV Evolucion de costos.PPTO_DE_COSTOS [Max] |

## Página: ' Sta Victoria 155'  (18 visuales)
Tablas: ['Amortizacion', 'DV Construccion', 'DV Escrituras', 'DV Evolucion de costos', 'DV KPIS', 'DV Uso y Fondo', 'DV Ventas', 'FECHA AUX', 'Financieros Sanvest']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,2000,125 | — |
| 1 | `image` |  | 173,7,299,103 | — |
| 2 | `actionButton` |  | 0,17,100,40 | — |
| 3 | `slicer` | Fecha (Año) | 1377,22,218,88 | **Values**: FECHA AUX.Año |
| 4 | `slicer` | Fecha (Mes) | 1613,22,218,88 | **Values**: FECHA AUX.mes |
| 5 | `actionButton` |  | 54,25,144,79 | — |
| 6 | `textbox` |  | 614,34,720,76 | — |
| 7 | `cardVisual` | Ev. Original Indicadores Financieros  | 950,168,1050,264 | **Data**: Financieros Sanvest.Inversión Sanvest [Sum], Financieros Sanvest.Participación Sanvest [Sum], Financieros Sanvest.Margen % (UT/CT) [Sum], Financieros Sanvest.Margen % (UT/VTA) [Sum], Financieros Sanvest.Margen Sanvest UF [Sum], Financieros Sanvest.TIR Sanvest [Sum], Financieros Sanvest.ROI Sanvest [Sum], Financieros Sanvest.Margen Proyecto UF [Sum] |
| 8 | `image` |  | 16,178,322,247 | — |
| 9 | `gauge` | Avance construcción | 357,178,279,247 | **Y**: DV Construccion.AVANCE_CONSTRUCCIÓN [Max] |
| 10 | `gauge` | Avance Ventas | 650,178,279,247 | **Y**: DV KPIS.UNIDADES_VENDIDAS [Sum] |
| 11 | `cardVisual` | Información Ventas a la Fecha | -1,442,1075,326 | **Data**: DV KPIS.VENTAS NETAS_DEL_MES [Sum], DV Ventas.RESERVAS_Y_PROMESAS [Sum], DV Ventas.UNIDADES_ESCRITURADAS_FIRMADAS [Sum], DV Ventas.UNIDADES_ESCRITURADAS_RECAUDADAS [Sum], DV Escrituras.PROYECCIÓN_VENTA_TOTAL(UF) [Max], DV Ventas.VENTAS_ACUMULADAS [Sum], DV Ventas.UF_RECAUDADAS          [Sum], DV Ventas.UF_POR_RECAUDAR [Sum], Financieros Sanvest.UF/m2 Venta Dpto actual [Sum], Financieros Sanvest.UF/m2 Venta Dpto Ev. Original [Sum], Financieros Sanvest.UF/m2 venta total actual [Sum], Financieros Sanvest.UF/m2 venta total EV. Original [Sum] |
| 12 | `cardVisual` | Información de construcción Ev. Original | 1077,443,923,326 | **Data**: DV Construccion.COSTO_TOTAL_PROYECTO_(UF) [Max], DV Construccion.COSTOS_TOTALES_PROYECTO_NETO (UF) [Max], DV Construccion.DEUDA_A_LA_FECHA UF [Max], Financieros Sanvest.Costo total neto /m2 vendible (UF/m2) [Sum], Financieros Sanvest.Incidencia construcción (UF/m2 losa) [Sum], DV Construccion.%LINEA/COSTO_TOTAL_NETO [Max] |
| 13 | `columnChart` | Ventas acumuladas (UF) | 16,780,1076,514 | **Y**: DV Ventas.UF_POR_RECAUDAR [Sum], DV Ventas.UF_RECAUDADAS          [Sum]; **Category**: FECHA AUX.Periodo |
| 14 | `pivotTable` | Usos y Fondos Proyecto a la Fecha | 1092,780,907,316 | **Rows**: DV Uso y Fondo.SUBCATEGORIA; **Values**: DV Uso y Fondo.Monto [Sum]; **Columns**: DV Uso y Fondo.Categoria |
| 15 | `cardVisual` | Estado de Deuda a la Fecha | 1087,1097,925,198 | **Data**: Amortizacion.Saldo [Max], Amortizacion.Amortizado [Sum] |
| 16 | `lineStackedColumnComboChart` | Ventas acumuladas Unidades | 0,1294,1077,644 | **Y2**: DV KPIS.UNIDADES_VENDIDAS [Max]; **Y**: DV KPIS.VENTAS NETAS_DEL_MES [Sum]; **Category**: FECHA AUX.Periodo |
| 17 | `clusteredColumnChart` | Necesidad de caja  (M UF) | 1074,1294,925,643 | **Category**: FECHA AUX.Periodo; **Y**: DV Evolucion de costos.COSTOS_REALES [Max], DV Evolucion de costos.PPTO_DE_COSTOS [Max] |

## Página: 'Sta Victoria 99'  (18 visuales)
Tablas: ['Amortizacion', 'DV Construccion', 'DV Escrituras', 'DV Evolucion de costos', 'DV KPIS', 'DV Uso y Fondo', 'DV Ventas', 'FECHA AUX', 'Financieros Sanvest']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,2000,101 | — |
| 1 | `slicer` | Fecha (Mes) | 1779,0,218,93 | **Values**: FECHA AUX.mes |
| 2 | `slicer` | Fecha (Año) | 1541,2,216,90 | **Values**: FECHA AUX.Año |
| 3 | `image` |  | 173,7,364,76 | — |
| 4 | `textbox` |  | 0,15,2000,57 | — |
| 5 | `actionButton` |  | 0,17,100,40 | — |
| 6 | `actionButton` |  | 74,29,101,54 | — |
| 7 | `cardVisual` | Ev. Original Indicadores Financieros  | 948,115,1050,264 | **Data**: Financieros Sanvest.Inversión Sanvest [Sum], Financieros Sanvest.Participación Sanvest [Sum], Financieros Sanvest.Margen % (UT/CT) [Sum], Financieros Sanvest.Margen % (UT/VTA) [Sum], Financieros Sanvest.Margen Sanvest UF [Sum], Financieros Sanvest.TIR Sanvest [Sum], Financieros Sanvest.ROI Sanvest [Sum], Financieros Sanvest.Margen Proyecto UF [Sum] |
| 8 | `gauge` | Avance construcción | 354,125,279,247 | **Y**: DV Construccion.AVANCE_CONSTRUCCIÓN [Max] |
| 9 | `gauge` | Avance Ventas | 648,125,279,247 | **Y**: DV KPIS.UNIDADES_VENDIDAS [Sum] |
| 10 | `image` |  | 0,139,350,216 | — |
| 11 | `cardVisual` | Información Ventas a la Fecha | 0,380,1076,327 | **Data**: DV KPIS.VENTAS NETAS_DEL_MES [Sum], DV Ventas.RESERVAS_Y_PROMESAS [Sum], DV Ventas.UNIDADES_ESCRITURADAS_FIRMADAS [Sum], DV Ventas.UNIDADES_ESCRITURADAS_RECAUDADAS [Sum], DV Escrituras.PROYECCIÓN_VENTA_TOTAL(UF) [Max], DV Ventas.VENTAS_ACUMULADAS [Sum], DV Ventas.UF_RECAUDADAS          [Sum], DV Ventas.UF_POR_RECAUDAR [Sum], Financieros Sanvest.UF/m2 Venta Dpto actual [Sum], Financieros Sanvest.UF/m2 Venta Dpto Ev. Original [Sum], Financieros Sanvest.UF/m2 venta total actual [Sum], Financieros Sanvest.UF/m2 venta total EV. Original [Sum] |
| 12 | `cardVisual` | Información de construcción Ev. Original | 1076,380,925,328 | **Data**: DV Construccion.COSTO_TOTAL_PROYECTO_(UF) [Max], DV Construccion.COSTOS_TOTALES_PROYECTO_NETO (UF) [Max], DV Construccion.DEUDA_A_LA_FECHA UF [Max], Financieros Sanvest.Costo total neto /m2 vendible (UF/m2) [Sum], Financieros Sanvest.Incidencia construcción (UF/m2 losa) [Sum], DV Construccion.%LINEA/COSTO_TOTAL_NETO [Max] |
| 13 | `columnChart` | Ventas acumuladas (UF) | 0,705,1076,515 | **Y**: DV Ventas.UF_POR_RECAUDAR [Sum], DV Ventas.UF_RECAUDADAS          [Sum]; **Category**: FECHA AUX.Periodo |
| 14 | `pivotTable` | Usos y Fondos Proyecto a la Fecha | 1076,708,925,313 | **Rows**: DV Uso y Fondo.SUBCATEGORIA; **Values**: DV Uso y Fondo.Monto [Sum]; **Columns**: DV Uso y Fondo.Categoria |
| 15 | `cardVisual` | Estado de Deuda a la Fecha | 1076,1021,925,198 | **Data**: Amortizacion.Saldo [Sum], Amortizacion.Amortizado [Sum] |
| 16 | `lineStackedColumnComboChart` | Ventas acumuladas Unidades | 0,1220,1076,512 | **Y2**: DV KPIS.UNIDADES_VENDIDAS [Max]; **Y**: DV KPIS.VENTAS NETAS_DEL_MES [Sum]; **Category**: FECHA AUX.Periodo |
| 17 | `clusteredColumnChart` | Necesidad de caja  (M UF) | 1076,1220,921,508 | **Category**: FECHA AUX.Periodo; **Y**: DV Evolucion de costos.COSTOS_REALES [Max], DV Evolucion de costos.PPTO_DE_COSTOS [Max] |

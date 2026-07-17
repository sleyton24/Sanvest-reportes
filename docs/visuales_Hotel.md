# Inventario de visuales — unidad Hotel

Extraído de `Report/Layout` del .pbix (no del render). Posición en px (x,y,w,h). Campos por rol del visual.

## Página: 'OLÁ Hotel'  (30 visuales)
Tablas: ['Deuda', 'Hotel FULL', 'Hotel PPTO', 'Hotel Real']

| # | Tipo | Título | Pos (x,y,w,h) | Campos por rol |
|---|---|---|---|---|
| 0 | `shape` |  | 0,0,2000,119 | — |
| 1 | `image` |  | 1802,0,198,119 | — |
| 2 | `image` |  | 50,9,481,97 | — |
| 3 | `slicer` | Año  | 1322,9,270,97 | **Values**: Hotel Real.anio |
| 4 | `slicer` | Mes | 1601,9,221,108 | **Values**: Hotel Real.Periodo.Variación.Jerarquía de fechas.Mes |
| 5 | `textbox` |  | 0,16,2000,90 | — |
| 6 | `actionButton` |  | 0,29,93,67 | — |
| 7 | `image` |  | 1457,119,539,351 | — |
| 8 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros YTD | 744,126,713,337 | **Category**: Hotel FULL.Item; **Plan**: Hotel FULL.Versión_Ppto YTD [Max]; **Forecast**: Hotel FULL.Versión_Real YTD [Sum] |
| 9 | `ZebraBITablesBAE31B370F254F808553548EFB35BFA5` | Indicadores Financieros Mensuales | 0,130,740,337 | **Category**: Hotel FULL.Item; **Values**: Hotel FULL.Versión_Ppto [Max]; **PreviousYear**: Hotel FULL.Versión_Real [Max] |
| 10 | `gauge` |  Promedio de Ocupación Mensual (%) | 0,467,563,276 | **Y**: Hotel Real.Ocupación pago 2024 (%) [Avg]; **TargetValue**: Hotel PPTO.Ocupación pago 2024 (%) [Avg] |
| 11 | `cardVisual` | Indicadores (USD) | 563,470,714,520 | **Data**: Hotel Real.ADR Room (USD) [Sum], Hotel PPTO.ADR Room (USD) [Max], Hotel Real.ADR Room (USD) YTD [Max], Hotel PPTO.ADR Room (USD) YTD [Max], Hotel Real.REVPAR USD [Sum], Hotel PPTO.REVPAR USD [Max], Hotel Real.REVPAR (USD) YTD [Max], Hotel PPTO.REVPAR (USD) YTD [Sum] |
| 12 | `cardVisual` | Indicadores (CLP) | 1278,470,722,519 | **Data**: Hotel Real.ADR Room (CLP) [Max], Hotel PPTO.ADR Room (CLP) [Max], Hotel Real.ADR Room (CLP) YTD [Sum], Hotel PPTO.ADR Room (CLP) YTD [Sum], Hotel Real.REVPAR (CLP) [Max], Hotel PPTO.REVPAR (CLP) [Max], Hotel Real.REVPAR (CLP) YTD [Sum], Hotel PPTO.REVPAR (CLP) YTD [Sum] |
| 13 | `textbox` |  | 565,743,713,39 | — |
| 14 | `textbox` |  | 1287,743,713,39 | — |
| 15 | `cardVisual` | Deuda (UF) | 0,746,563,243 | **Data**: Deuda.Deuda total [Sum], Deuda.por pagar [Min] |
| 16 | `shape` |  | 4,995,1996,130 | — |
| 17 | `slicer` | Periodo | 46,999,562,126 | **Values**: Hotel Real.Periodo |
| 18 | `lineClusteredColumnComboChart` | Ingresos (UF) - 12M  | 0,1137,1001,327 | **Category**: Hotel PPTO.Periodo; **Y**: Hotel Real.Ingresos totales LY [Sum], Hotel Real.Ingresos totales [Sum]; **Y2**: Hotel PPTO.Ingresos totales [Sum] |
| 19 | `lineClusteredColumnComboChart` | Ingreso (UF) Acumulado Anual | 1003,1137,997,327 | **Y**: Hotel FULL.Versión_Real YTD [Sum]; **Category**: Hotel Real.Periodo; **Y2**: Hotel FULL.Versión_Ppto YTD [Sum] |
| 20 | `lineClusteredColumnComboChart` | Costos (UF) - 12M | 0,1464,1000,331 | **Category**: Hotel PPTO.Periodo; **Y**: Hotel Real.Costos operacionales UF [Sum], Hotel Real.Costos operacionales LY [Sum]; **Y2**: Hotel PPTO.Costos operacionales UF [Sum] |
| 21 | `lineClusteredColumnComboChart` | Costos (UF) Acumulado Anual | 1003,1464,997,331 | **Y**: Hotel FULL.Versión_Real YTD [Sum]; **Category**: Hotel Real.Periodo; **Y2**: Hotel FULL.Versión_Ppto YTD [Sum] |
| 22 | `lineClusteredColumnComboChart` | GOP (UF) - 12M | 0,1799,1000,330 | **Y2**: Hotel PPTO.EBITDA UF [Sum]; **Category**: Hotel PPTO.Periodo; **Y**: Hotel Real.EBITDA UF LY [Max], Hotel Real.EBITDA UF [Sum] |
| 23 | `lineClusteredColumnComboChart` | GOP (UF) Acumulado Anual | 1004,1799,996,331 | **Y**: Hotel FULL.Versión_Real YTD [Sum]; **Category**: Hotel Real.Periodo; **Y2**: Hotel FULL.Versión_Ppto YTD [Sum] |
| 24 | `lineClusteredColumnComboChart` | Flujo (UF) - 12M | 0,2133,1001,329 | **Category**: Hotel PPTO.Periodo; **Y2**: Hotel PPTO.Flujo (Resultado) UF [Max]; **Y**: Hotel Real.Flujo (Resultado) UF LY [Max], Hotel Real.Flujo (Resultado) UF [Max] |
| 25 | `lineClusteredColumnComboChart` | FLUJO (UF) Acumulado Anual | 1004,2133,996,329 | **Y**: Hotel FULL.Versión_Real YTD [Sum]; **Category**: Hotel Real.Periodo; **Y2**: Hotel FULL.Versión_Ppto YTD [Sum] |
| 26 | `lineChart` | Ocupación (%) | 0,2463,997,343 | **Category**: Hotel Real.Periodo; **Y**: Hotel Real.Ocupación pago 2024 (%) [Max], Hotel Real.Ocupación pago 2024 (%) LY [Sum]; **Y2**: Hotel PPTO.Ocupación pago 2024 (%) [Sum] |
| 27 | `lineChart` | ADR (USD) | 1002,2463,998,343 | **Category**: Hotel Real.Periodo; **Y**: Hotel Real.ADR Room (USD) [Max], Hotel Real.ADR Room (USD) LY [Max], Hotel PPTO.ADR Room (USD) [Sum] |
| 28 | `lineChart` | EBITDA/Cuota Banco  | 1002,2806,999,344 | **Category**: Hotel PPTO.Periodo; **Y**: Hotel Real.EBITDA/CUOTA BANCO [Sum], Hotel Real.EBITDA/CUOTA BANCO LY [Sum], Hotel PPTO.EBITDA/CUOTA BANCO [Sum] |
| 29 | `lineChart` | REVPAR (USD) | 0,2810,1000,340 | **Category**: Hotel PPTO.Periodo; **Y**: Hotel Real.REVPAR USD [Max], Hotel Real.REVPAR USD LY [Max]; **Y2**: Hotel PPTO.REVPAR USD [Max] |

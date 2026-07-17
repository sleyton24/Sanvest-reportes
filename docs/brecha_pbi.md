# Brecha Plataforma Web vs. Power BI — Listado Priorizado

> Documento de arquitectura. Objetivo: enumerar y priorizar todo lo que falta para que la plataforma web alcance paridad funcional con el reporte Power BI (.pbix) de Sanvest.
> Fecha: 2026-06-11.

---

## 1. Resumen Ejecutivo

La migración está **avanzada en lo operativo** y **vacía en lo financiero-consolidado y de modelo de inversión/obra**.

### Cobertura por módulo

| Módulo | Estado | Comentario |
|---|---|---|
| **DV (Desarrollo para la Venta)** | ✅ Completo (paridad alta) | 3 páginas de proyecto migradas 1:1. Solo verificaciones de etiqueta y de datos. |
| **RR — LAR Group (holding)** | ✅ Completo | Todos los visuales cubiertos. |
| **RR — SOHO / PARK** | 🟡 Parcial | Falta card Deuda (UF) + bloque Cuadro de Vencimientos (pivot + combo). |
| **Hotel — ICEMM** | ✅ Completo | Migración 1:1. |
| **Hotel — OLÁ Hotel** | 🟡 Parcial | Falta card Deuda (UF) + slicer Periodo. |
| **USA — Gestión por propiedad (Bemiston, MILA)** | ✅ Completo | Layout operativo homologado. |
| **USA — ST Grand (operativo)** | 🟡 Parcial | Falta gauge Retail Occupancy + renovaciones de contrato. |
| **USA — páginas "... KPIS" (modelo financiero/retornos)** | ❌ Falta total | 3 páginas (Bemiston/MILA/St Grand): Unit Summary, Uses & Sources, Partner Returns, Loan/HUD, XIRR, Equity Sanvest, Yield/Rent Growth. |
| **USA — Fondos DIF I y DIF II** | ❌ Falta total | Reporte trimestral + YTD, combos por edificio, gauge Div. Yield, General Information. |
| **USA — Construcción (Bemiston obra, MILA obra)** | ❌ Falta total | Costos de obra, avance de construcción, Uses & Sources. |
| **Grupo — EEFF Consolidados (Balance, EERR, Notas)** | ❌ Falta total | Solo tarjeta "Estados Financieros — Próximamente". |
| **Atémpora (Civitas)** | ❌ Falta total | No existe dashboard ni tarjeta en el menú. |

### Estimación de cobertura

- **Páginas con visuales de datos** (excluyendo ~13 páginas de menú/navegación y notas, que son n/a): de **~24 páginas sustantivas**, aproximadamente **12 están completas, 4 parciales y 8 faltan por completo**.
- **Cobertura aproximada de visuales sustantivos: ~55-60%.** Lo migrado concentra la operación recurrente (P&L, ocupación, KPIs, flujos). Lo faltante concentra: (a) consolidación financiera del Grupo, (b) modelo de inversión/retornos USA, (c) seguimiento de obra/construcción, (d) una unidad de negocio entera (Atémpora) y (e) la lógica de Deuda transversal.
- **Hilo transversal crítico:** la **card Deuda (UF)** falta en RR (SOHO/PARK), Hotel (OLÁ) y Atémpora — apunta a una **tabla fuente de deuda no cargada**. Resolver la fuente de Deuda destraba varios módulos a la vez.

---

## 2. Módulos / Páginas que FALTAN por completo

### 2.1 Estados Financieros Consolidados del Grupo  🔴 (núcleo financiero pendiente)
Hoy solo existe una tarjeta "Estados Financieros — Próximamente" en `MainMenu`. Requiere backend/tabla nueva (carga mensual) y página(s) nueva(s).

- **Balance Grupo Sanvest**: pivot `Balance Grupo`; funnel `Patrimonio Unidades de Negocio Mercado UF`; funnel `Patrimonio Unidades de Negocio Costo UF`; pieChart `% Patrimonio Unidades de Negocio Mercado`; slicer Mes.
- **EERR Grupo**: pivot `EERR Grupo UF`; waterfallChart `Utilidad Grupos Sanvest (Var. Real vs Budget) UF`; slicer Mes.
- **Notas EERR Grupo**: tableEx de notas; slicer Mes.
- Las páginas "Duplicado de ..." (Balance / EERR / Notas) quedan **cubiertas automáticamente** al migrar las páginas base — no requieren página aparte.
- **Implica:** nueva carga/origen de datos de Balance, EERR y Notas consolidadas + componentes funnel, pie y waterfall (que hoy no existen en la web).

### 2.2 Gestión Atémpora (Civitas)  🔴 (unidad de negocio completa ausente)
No hay dashboard ni tarjeta en el menú principal. Requiere unidad de negocio nueva de extremo a extremo.

- Tablas Zebra `Indicadores Financieros Mes` y `YTD`.
- Cards `KPIs Oficina`, `KPIs Locales`, `Total Disponibles`, `Unidades Totales`, `Deuda (UF)`.
- Gauges de ocupación: General, Venta, Renta, Total OF+LC.
- Combos `Ingresos (UF)`, `EBITDA (UF)`, `Resultado (UF)`, `Gastos Operacionales (UF)`, `Gastos Comunes Real`.
- Pivots `Cuadro de Arriendos`, `Cuadro de Morosidad`, `Cuadro de Ventas a la Fecha`.
- Slicer Año + carga mensual / origen de datos de Atémpora.

### 2.3 USA — Páginas de Modelo Financiero / Retornos ("... KPIS")  🟠
Tres páginas espejo (Bemiston / MILA / St Grand). USADashboard solo trae datos operativos (Yardi), no el Original Model ni los retornos del partner.

Por cada propiedad:
- Pivots `Unit Summary`, `Uses and Sources`, `Partner Level Returns`, `Property Information` (Original Model).
- Cards `Project Returns` (con Expected Exit Date: Bemiston Ene-2028, MILA Dic-2026, St Grand Ene-2026).
- Cards de préstamo: `HUD Loan Information` / `Loan Information` (Original Model) + `HUD Loan Actual` / `Loan Actual`.
- Cards `XIRR`, `Equity Sanvest`, `Rent Growth (%)`, `Yield to cost (%)`.

### 2.4 USA — Fondos DIF I y DIF II  🟠 (granularidad trimestral, distinta del resto)
- Tabla Zebra `Quarter and YTD report`.
- Combos por edificio: DIF I → Westview Office, Highlands Plaza Two, Sunset Plaza; DIF II → Grands Flats, Flux.
- Gauge `Div. Yield Annualized`.
- pivotTable `General Information`.
- Slicers `Quarter Selection` y `Year`.
- **Implica:** origen de datos de fondos de inversión USA (no existe carga) + soporte de granularidad **trimestral** (hoy todo es mensual). Páginas "Info DIF I/II" son decorativas → n/a.

### 2.5 USA — Construcción de Obra  🟠
Seguimiento de obra, distinto de la gestión operativa Yardi.

- **USA Bemiston Construcción**: card `Costo del Proyecto a la fecha (USD)`; cardVisual `Construction Costs Information`; cardVisual `Financial KPIS`; lineChart `Evolutivo de costos`; slicer Date.
- **MILA Construccion**: Zebra `Uses and Sources`; gauge `Construction Progress`; cards `Total Cost`, `Construction Cost`, `Debt Progress`; combo `Total Cost Evolution`; slicer Date.
- **Implica:** origen/carga de datos de costos y avance de obra USA (no existe; USADashboard usa Yardi operativo, ICEMMDashboard tampoco la cubre).

---

## 3. Visuales / Funciones que FALTAN en módulos YA migrados

### 3.1 RR — SOHO y PARK (mismo código, mismos faltantes)  🟡
- Card `Deuda (UF)` — el frontend la declara fuera por falta de tabla fuente.
- Pivot `Cuadro de Vencimientos`.
- Combo `Cuadro de Vencimientos` (lineClusteredColumnComboChart: vencimientos/renovaciones).

### 3.2 Hotel — OLÁ Hotel  🟡
- Card `Deuda (UF)` — el footer del componente reconoce que se integrará al migrar la unidad Deuda.
- Slicer independiente `Periodo` (Año + Mes cubren el filtrado funcionalmente; baja prioridad).
- Verificación de título: columna `Costos (UF)` del .pbix se muestra como `GOP / EBITDA (UF)` en el combo mensual — revisar consistencia (el wiring de datos coincide).

### 3.3 USA — ST Grand (operativo, mixed-use)  🟡
- Gauge `Retail Occupancy (%)` — la web solo muestra Residential Occupancy.
- Combo `Contracts to Renew per month`.
- Pivot `Renewal Information per Unit`.
- Nota: la página "Duplicado de ST grand" del Grupo es la **misma brecha** (renovaciones/vencimientos) — se cubre con lo anterior.

### 3.4 DV — verificaciones (no son visuales faltantes, son riesgos de dato)  🟢
- Millalongo: gauge titulado `Avance construcción Financiero` en .pbix vs `Avance construcción` en web — confirmar que la métrica es avance **financiero** de obra (no físico) o renombrar.
- Validar dato a dato que los filtros por proyecto (`millalongo`, `Sv155`/`SV 155`, `Sv99`/`SV 99`) reproducen exactamente los KPIs de cada página .pbix (riesgo por nombres con/sin punto o espacios).

---

## 4. Funciones Transversales del Power BI que faltan

Estas no son visuales puntuales sino capacidades del entorno Power BI que conviene evaluar para paridad de experiencia:

1. **Tabla/fuente de Deuda transversal** — falta en RR (SOHO/PARK), Hotel (OLÁ) y Atémpora. Es el bloqueo común de mayor impacto: una sola carga destraba 3+ cards Deuda (UF).
2. **Soporte de granularidad trimestral** — requerido por los fondos DIF I/II (`Quarter Selection`); hoy el modelo de filtros es mensual/anual.
3. **Componentes de visualización aún no presentes en la web**: funnel, pieChart y waterfallChart (necesarios para EEFF del Grupo). Confirmar si el toolkit de gráficos los soporta.
4. **Bloques de pivot tipo "modelo/retornos"** (Unit Summary, Uses & Sources, Partner Level Returns, Property Information) — patrón de tabla estática del Original Model, distinto de los pivots P&L ya migrados.
5. **Slicer Periodo** (selección directa de periodo) en OLÁ y RR/ICEMM — hoy implícito vía Año+Mes; evaluar si se necesita como control explícito.
6. **Drill-through / navegación contextual entre páginas** (p.ej. de gestión operativa a la página KPIS/modelo de la misma propiedad) — el .pbix lo permite; verificar equivalente en la web.
7. **Tooltips de detalle, filtros cruzados (cross-filtering) entre visuales y exportar a Excel/PDF** — capacidades nativas de Power BI a confirmar como requisito de paridad de experiencia.
8. **Páginas de notas/comentarios** (Notas Mila, Notas EERR) — la de Mila es n/a (solo texto); la de Notas EERR Grupo sí es dato (tableEx) y está en el bloque EEFF pendiente.

---

## 5. Tabla de Priorización

Escala de esfuerzo relativo: **S** (pequeño, reutiliza componentes existentes), **M** (medio, requiere componente o ajuste de datos), **L** (grande, nueva fuente de datos + página(s) nueva(s)).

| # | Ítem | Prioridad | Esfuerzo | Bloqueo / Dependencia |
|---|---|---|---|---|
| 1 | **Tabla fuente de Deuda (UF)** transversal (RR + Hotel + Atémpora) | 🔴 Alta | M | Habilita ítems 2, 3 y parte del 11 |
| 2 | Card Deuda (UF) en RR (SOHO/PARK) | 🔴 Alta | S | Depende de #1 |
| 3 | Card Deuda (UF) en Hotel OLÁ | 🔴 Alta | S | Depende de #1 |
| 4 | **EEFF Consolidados del Grupo** (Balance + EERR + Notas: pivots, funnels, pie, waterfall) | 🔴 Alta | L | Nueva carga mensual + componentes funnel/pie/waterfall |
| 5 | RR — Cuadro de Vencimientos (pivot + combo) SOHO/PARK | 🔴 Alta | M | Requiere tabla de vencimientos |
| 6 | **Gestión Atémpora** (unidad de negocio completa: Zebra, gauges, combos, 3 pivots) | 🟠 Media-Alta | L | Nueva carga + nueva tarjeta en menú |
| 7 | USA — páginas KPIS / Modelo de Retornos (Bemiston, MILA, St Grand) | 🟠 Media | L | Origen Original Model + pivots de retornos + cards XIRR/Equity |
| 8 | USA — ST Grand: gauge Retail Occupancy + renovaciones (combo + pivot) | 🟠 Media | M | Datos retail/renovaciones St Grand |
| 9 | USA — Fondos DIF I y DIF II | 🟠 Media | L | Nueva fuente + granularidad trimestral |
| 10 | USA — Construcción de obra (Bemiston + MILA) | 🟠 Media | L | Nueva carga de costos/avance de obra |
| 11 | Verificación dato-a-dato DV (mapeo por proyecto + etiqueta gauge Millalongo) | 🟢 Baja | S | Sin nuevos componentes |
| 12 | Validación de títulos (Hotel: Costos vs GOP/EBITDA; consistencia de labels) | 🟢 Baja | S | Solo etiquetas |
| 13 | Slicer Periodo explícito (OLÁ y otros) | 🟢 Baja | S | Año+Mes ya cubren funcionalmente |
| 14 | Funciones transversales: drill-through, tooltips, export, cross-filter | 🟢 Baja-Media | M | Evaluar requisito real de negocio |

### Secuencia recomendada
1. **Fase 1 (quick wins + bloqueo común):** #1 → #2 → #3, luego #5, #11, #12.
2. **Fase 2 (núcleo financiero):** #4 (EEFF Grupo) y #6 (Atémpora) — el mayor valor analítico pendiente.
3. **Fase 3 (USA avanzado):** #8 (ST Grand retail/renovaciones), #7 (KPIS/retornos), #9 (DIF), #10 (obra).
4. **Fase 4 (experiencia):** #13 y #14 según prioridad de negocio.

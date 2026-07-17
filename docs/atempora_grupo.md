# Checklist de implementación — Atémpora (Civitas) y Estados Financieros del Grupo

Líder técnico · Fase 0+1 → construcción end-to-end reutilizando el patrón **Fase 0→4** ya
probado en DV / RR / Hotel / USA / ICEMM.

## Patrón Fase 0→4 (recordatorio operativo)

| Fase | Qué se produce | Artefacto / herramienta |
|------|----------------|--------------------------|
| **0 — Diseño** | Tablas planas objetivo, jerarquías, mapeo visual→componente, slicers | este doc + diseños Fase 0/1 (ya hechos) |
| **1 — ETL/config** | `etl/config/<UNIT>.json`: por tabla `{table, sheet, file?, columns:[{col,m_type,pandas,sql}], extra_steps}` | `scripts/parse_m_types.py` / `analyze_pq.py`; carga con `etl/loader.py` (réplica fiel del M: promote-headers + `TransformColumnTypes`) vía `etl.pipeline.load_unit` |
| **2 — Reconciliación** | Cada tabla cuadra como MULTISET de filas vs `pbixray.get_table` (status OK/DRIFT/FAIL) | `etl/reconcile.py` → doc `docs/reconciliacion_<UNIT>.md` |
| **3 — Catálogo + API** | `api/catalog/<UNIT>.json` (model_name, slug, rows, columns con role dimension/measure/date) → API genérica lo sirve sin tocar `api/main.py` | `scripts/build_catalog.py <UNIT>`; endpoints `/units/{u}/tables/{slug}`, `/distinct`, `/aggregate`, `/measures` |
| **4 — Carga (upload)** | Validación de estructura (`etl/validate.py`) + reescritura de tablas (`/upload` reusa `load_unit`); si hay carga incremental con histórico, `etl/connect_<unit>.py` con UPSERT (`/upload-informes`) | `etl/validate.py`, `api/main.py` (ya genérico para `/upload`) |
| **UI** | Página React `frontend/src/pages/<Unit>Dashboard.tsx` cableada en `App.tsx`, usando componentes compartidos | `fetchRows(unit, slug)` → componentes |

Reglas duras del proyecto:
- **Reconciliación 1:1 obligatoria** antes de exponer una tabla. VertiPaq no preserva orden → comparación por multiset; FAIL solo si una clave de negocio del modelo no se reproduce en el ETL.
- **El slug SQL** sale de `etl.pipeline.slug()` (sin acentos, snake_case). Las tablas planas viven en `db/sanvest_bi_dev.sqlite`.
- **No materializar** hojas auxiliares/scratch (Original, Hoja1-7, insumos). Solo migrar las tablas del modelo `.pbix`.

---

# UNIDAD A — Atémpora (Civitas)

Fuente: `Formatos para reportes PBI/CIVITAS.xlsx` · Página PBI: **Gestión Atémpora** · **Componentes nuevos: ninguno** (todo reusa componentes existentes).
Alias: la unidad/Excel es CIVITAS, pero `KPIS Atempora.Proyecto='Atempora'` y `deuda.Proyecto='CIVITAS'` → tratar como sinónimos. UNIT sugerida: **`Atempora`**.

## A.1 — Tablas planas a crear (Fase 1 ETL/config) + reconciliación (Fase 2)

Crear `etl/config/Atempora.json` con las **7 tablas** (todas con hoja Excel homónima 1:1, `promote_headers:true`, `file` omitido → usa el Excel único de la unidad):

| slug destino | hoja Excel | model/pbix table | filas | notas de tipos / extra_steps |
|--------------|-----------|------------------|-------|-------------------------------|
| `atempora_eerr` | `EERR CIVITAS` | EERR CIVITAS | 528 | `Monto/ppto/YTD Real/YTD PPTO/Indice`→`type number`; `año/mes/fechaID`→`Int64.Type`; `Fecha`→`type date`. **Nivel 2** y **Nivel 1** son texto (encabezados invertidos, ver jerarquías). |
| `atempora_kpis` | `KPIS Atempora` | KPIS Atempora | 16 | `Proyecto`→texto; `Fecha`→date; `Mes/Año/Fecha ID`→Int64; el resto (ocupaciones, m², uf/m², unidades, totales)→`type number`. Ocupaciones en 0–1. |
| `atempora_arriendos` | `Detalle arriendo civitas` | Detalle arriendo civitas | 193 | `Unidad/Tipología/Estado/Usuario/Renovación`→texto; `Fecha inicio/Fecha término`→date; `Plazo`→Int64; superficies, UF y precios→`type number`. |
| `atempora_morosidad` | `Morosidad` | Morosidad | 34 | `} (Cliente/Deudor)`/`Clasif`→texto; `SALDO PENDIENTE`→number (CLP, NO UF); `F. EMISION`/`Columna1`→date; `Columna2`→Int64 (días). |
| `atempora_ventas` | `Ventas Civitas` | Ventas Civitas | 9 | `Comprador`→texto; `Oficinas`→texto (o entero según dato); `Venta Neta`→number. |
| `atempora_deuda` | `deuda civitas` | deuda civitas | 53 | `Proyecto`→texto; `Amortización/Capital`→number; `Año/mes/FechaID`→Int64; `Fecha`→date; `aux` vacía (conservar tal cual). |
| `atempora_date_aux` | `Date AUX Civitas` | Date AUX Civitas | ~17 | calendario auxiliar: `Año/mes/fechaid`→Int64; `fecha`→date. Sirve al slicer Año y relaciones; NO es visual. |

Pasos Fase 1/2:
1. `scripts/parse_m_types.py` / `analyze_pq.py` sobre el `.pbix` para extraer `m_type` reales de cada columna y poblar el config (no inventar tipos).
2. Cargar con `etl.pipeline.load_unit("Atempora")` → `etl/reconcile.py` contra `pbixray.get_table` de las 7 tablas. Filas verificadas en diseño: EERR 528=528, KPIS 16=16, arriendos 193=193; reconciliar también Morosidad 34, Ventas 9, deuda 53, Date AUX ~17.
3. Documentar resultado en `docs/reconciliacion_Atempora.md` (status por tabla; esperado OK en las 7).

**Cuidados de jerarquía/signo (de Fase 0):**
- **EERR encabezados INVERTIDOS**: la columna rotulada `Nivel 2` trae las 3 macro (Ingresos / Gastos Operacionales / Otros gastos); `Nivel 1 ` trae los 22 rubros de detalle. En los componentes: **Nivel1 visual = columna `Nivel 2`**, **Nivel2 visual = columna `Nivel 1 `**.
- Medidas derivadas: `EBITDA = Ingresos − Gastos Operacionales`; `Resultado = Ingresos − Gastos Operacionales − Otros gastos`. Validar en datos si los Gastos vienen positivos (restar) o ya negativos.
- Ocupaciones/gauges en 0–1 → formatear `%`. KPIS trae 16 filas (varios cortes) → tomar la fila/fecha vigente para cards y gauges.
- NO migrar hojas paralelas `Base EERR Arriendo` / `EERR Arriendo` (insumos), ni `Original/Hoja1-7/Detalle1` (scratch).

## A.2 — Catálogo (Fase 3)

- `scripts/build_catalog.py Atempora` → `api/catalog/Atempora.json` (roles dimension/measure/date inferidos; `fechaID/Año/mes` quedarán dimension, ocupaciones/UF/montos measure).
- La API genérica ya las sirve: `GET /units/Atempora/tables/atempora_eerr?año=2026&mes=5`, `/aggregate?measure=Monto&by=Nivel 2,Nivel 1 &…`, `/distinct/{column}` para el slicer Año. **No tocar `api/main.py`.**

## A.3 — Dashboard (Fase UI) — `frontend/src/pages/AtemporaDashboard.tsx`

Slicer: **Año** (de `atempora_date_aux.Año` / `atempora_eerr.año`), aparece 2x en el PBI → 1 solo slicer que controla EERR/combos/Zebra. Componente `Slicer`.

| Visual PBI | Componente (existente) | Datos / mapeo |
|------------|------------------------|---------------|
| Zebra "Indicadores Financieros Mes" | `IndicatorTableMY` (vista Mensual) o `HoldingPnL` | `atempora_eerr`: Monto (real) vs ppto por Nivel2(macro)>Nivel1(detalle), mes seleccionado |
| Zebra "Indicadores Financieros YTD" | `IndicatorTableMY` (vista YTD) | mismas filas con `YTD Real` vs `YTD PPTO` |
| cardVisual "KPIs Oficina" | `KpiCard` (grupo) | KPIS sufijo OF: ocupaciones, m², uf/m², unidades, reservas |
| cardVisual "KPIs Locales" | `KpiCard` (grupo) | KPIS sufijo LC |
| card "Total Disponibles" (2x) | `KpiCard` | KPIS `Disponible OF` + unidades disponibles OF/LC |
| card "Unidades Totales" (2x) | `KpiCard` | KPIS `Of total` + `LC Total` |
| cardVisual "Deuda (UF)" | `KpiCard` | `atempora_deuda`: suma `Capital` por Proyecto en el último `FechaID` |
| gauge "Ocupación General" | `Gauge(target)` | KPIS `Ocupacion Renta OF` (u `Ocupacion total`) vs meta |
| gauge "Ocupación Venta" | `Gauge(target)` | KPIS `Ocupacion Ventas OF/LC` |
| gauge "Ocupación Renta" (OF y LC) | `Gauge(target)` | KPIS `Ocupacion Renta OF` / `Ocupacion Renta LC` |
| gauge "Ocupación Total OF+LC" | `Gauge(target)` | KPIS `Ocupacion total` |
| combo "Ingresos (UF)" | `ColumnLinesChart` | EERR Monto (barra) vs ppto (línea), Nivel2='Ingresos ', por mes |
| combo "EBITDA (UF)" | `ColumnLinesChart` | medida derivada EBITDA real vs ppto por mes |
| combo "Resultado (UF)" | `ColumnLinesChart` | medida derivada Resultado real vs ppto por mes |
| combo "Gastos Operacionales (UF)" | `ColumnLinesChart` | EERR Nivel2='Gastos Operacionales ' real vs ppto por mes |
| combo "Gastos Comunes Real" | `ColumnLinesChart` / `BarsLineChart` | KPIS `Gasto Comun` por mes (o detalle 'Gastos comunes' de EERR) |
| pivotTable "Cuadro de Arriendos" | `PivotTable` | `atempora_arriendos`: rowField=`Tipología`, valueField=`Valor arriendo [UF]` / m² |
| pivotTable "Cuadro de Morosidad (19 de Mayo)" | `PivotTable` | `atempora_morosidad`: rowField=Cliente, colField=`Clasif` (tramo), valueField=`SALDO PENDIENTE` |
| pivotTable "Cuadro de Ventas a la Fecha" | `PivotTable` | `atempora_ventas`: rowField=`Comprador`, valueField=`Venta Neta` |

Gauges duplicados (General/Venta/Renta aparecen 2x) → consolidar (probable redundancia OF vs LC vs Total).
Cablear `<button>` Atémpora en `App.tsx` (`UNITS` + render condicional).

## A.4 — Carga (Fase 4)

- Estructura esperada vía `etl/validate.py` (ya genérico): `/units/Atempora/expected-structure` lista hojas/columnas; `/units/Atempora/upload` valida + reusa `load_unit` y reescribe las 7 tablas. **Sin código nuevo** si el flujo es reemplazo total del Excel CIVITAS (caso recomendado: 1 archivo → replace).
- Solo si el negocio pide carga incremental con histórico (no indicado en Fase 0) se agregaría `etl/connect_atempora.py` + rama en `/upload-informes`. **Por ahora: NO requerido.**
- En el dashboard: `InformeUploadPanel unit="Atempora"` (botón "⬆ Cargar CIVITAS") → `onLoaded` refresca.

---

# UNIDAD B — Estados Financieros del Grupo

Fuente: `Formatos para reportes PBI/Base balance.xlsx` · Páginas PBI: **Balance grupo Sanvest**, **EERR Grupo** (aparece como "Duplicado de EERR Grupo"), **Notas EERR Grupo**.
**Componentes NUEVOS requeridos: Funnel, PieChart, WaterfallChart** (ver sección compartida). UNIT sugerida: **`Grupo`**.

## B.1 — Tablas planas a crear (Fase 1 ETL/config) + reconciliación (Fase 2)

Crear `etl/config/Grupo.json` con **3 tablas base** del modelo (`Notas` no es tabla independiente):

| slug destino | hoja Excel | model/pbix table | filas | notas de tipos / extra_steps |
|--------------|-----------|------------------|-------|-------------------------------|
| `ef_balance_grupo` | `Balance` | Balance | 547 (Excel 548 c/header) | `N1..N5`→texto; 8 medidas `Costo/Mercado UF/USD (LQ y QAC)`→`type number`; `Trimestre`→texto (Q#-YYYY). N4=clase (ACTIVOS/PASIVOS/Patrimonio); N1/N3=Unidad de Negocio. |
| `ef_eerr_grupo` | `EERR Grupo` | EERR Grupo | 181 (Excel 182 c/header) | `N1..N3/Notas/Comentario Nota/Trimestre`→texto; `Real/YTG/Forecast/Presupuesto/Indice/2024`→`type number`. Forecast=Real+YTG. |
| `ef_cascada_utilidad` | `Cascada` | Cascada | 64 (Excel 65 c/header) | `N1`(unidad/paso)→texto; `N2`(escenario Real/Forecast/PPTO)→texto; `Monto`→`type number` (puede ser negativo); `Fecha Trimestre`→texto. |

`ef_notas_eerr` (Notas): **no materializar como tabla independiente**. Derivar de las columnas `Notas`/`Comentario Nota` de `ef_eerr_grupo` (reconcilia indirectamente contra EERR Grupo). Si el negocio exige tabla propia: parsear `Notas` desde fila 8 (col C=índice, col D=texto) como paso `post`/`connect`.

Pasos Fase 1/2:
1. Extraer `m_type` reales con `parse_m_types.py`; poblar config de las 3 tablas.
2. `load_unit("Grupo")` → `reconcile.py` vs `pbixray.get_table`: Balance (547,19), EERR Grupo (181,12), Cascada (64,4) — columnas idénticas, esperado OK. Documentar en `docs/reconciliacion_Grupo.md`.

**Cuidados (de Fase 0):**
- Balance: jerarquía N1>N2>N3>N4>N5 con dos vistas de valor **LQ** (cierre) y **QAC** (acumulado). Confirmar con negocio si pivots usan UF LQ o QAC (títulos dicen "UF").
- EERR Grupo: jerarquía N1(INGRESOS/EGRESOS)>N2>N3. Forecast=Real+YTG.
- Cascada: `Monto` negativo = gasto/`decrease`; **NO invertir signos** (ya vienen con signo).
- Slicer se llama **"Mes"** pero filtra por **Trimestre** (Q1-2025…Q1-2026); aclarar granularidad con negocio.
- NO migrar `Duplicado de Balance grupo Sanvest`, `Duplicado de Notas EERR Grupo`, ni hojas auxiliares (`Balance Oficial`/`EERR Oficial`/Hoja1-3).

## B.2 — Catálogo (Fase 3)

- `scripts/build_catalog.py Grupo` → `api/catalog/Grupo.json`. Verificar que las 8 medidas Costo/Mercado de Balance queden role=measure y `Trimestre`/N1..N5 dimension.
- API genérica: `/units/Grupo/tables/ef_balance_grupo?N4=Patrimonio&Trimestre=Q1-2026`, `/aggregate?measure=Mercado UF LQ&by=N1`, etc.

## B.3 — Dashboard (Fase UI) — `frontend/src/pages/GrupoDashboard.tsx`

Slicer: **Mes** (mapea a `Trimestre`/`Fecha Trimestre`; valores Q1-2025…Q1-2026). Componente `Slicer`. Tres "secciones" o sub-páginas en una sola página con `<section>` (como USA).

| Visual PBI | Componente | Nuevo? | Datos / mapeo |
|------------|-----------|--------|---------------|
| pivotTable "Balance Grupo" | `PivotTable` (o `FlujoPivot` para expand/collapse N4>N1>N2>N3) | no | `ef_balance_grupo` filtrado por Trimestre; medidas Costo/Mercado UF (LQ/QAC) |
| funnel "Patrimonio Unidades de Negocio Mercado UF" | **`Funnel`** | sí | filtro N4='Patrimonio'+Trimestre; group N1/N3 sum `Mercado UF LQ`; `[{label,value}]` desc (~8 unidades) |
| funnel "Patrimonio Unidades de Negocio Costo UF" | **`Funnel`** | sí | igual con `Costo UF LQ` |
| pieChart "% Patrimonio Unidades de Negocio Mercado" | **`PieChart`** | sí | group N1/N3 sum `Mercado UF LQ`, % sobre total; `[{label,value,pct}]` |
| pivotTable "EERR Grupo UF" | `PivotTable` / `FlujoPivot` (o `IndicatorTableMY` para Real vs Ppto lado a lado) | no | `ef_eerr_grupo` filtrado Trimestre; N1>N2>N3, cols Real/YTG/Forecast/Presupuesto |
| waterfallChart "Utilidad Grupos Sanvest (Var. Real vs Budget) UF" | **`WaterfallChart`** | sí | `ef_cascada_utilidad` filtrado Fecha Trimestre; pasos por N1, escenario N2; `[{categoria,valor,tipo:'increase'|'decrease'|'total'}]` por signo del Monto |
| tableEx (Notas EERR Grupo) | `PivotTable` (tabla plana sin agregación) | no | `ef_notas_eerr`/derivado: Índice/Nota + Texto, filtrado Trimestre |

Cablear `<button>` Grupo en `App.tsx`.

## B.4 — Carga (Fase 4)

- `/units/Grupo/upload` reusa `load_unit` + `validate.py` → reemplazo total de `Base balance.xlsx` (caso recomendado). Sin código nuevo en `api/main.py`.
- Si se exige histórico trimestral incremental: `etl/connect_grupo.py` con UPSERT por `Trimestre` + rama en `/upload-informes`. No indicado en Fase 0.
- Dashboard: `InformeUploadPanel unit="Grupo"`.

---

# COMPONENTES NUEVOS COMPARTIDOS

Tres componentes nuevos, **solo para la unidad Grupo**, en `frontend/src/components/charts/Charts.tsx`
(reutilizar paleta `COLORS`, `Frame`, tematización oscura y `ResponsiveContainer` ya definidos en
ese archivo). Atémpora no requiere componentes nuevos.

### `Funnel` (recharts `FunnelChart`/`Funnel` o SVG propio sobre `Frame`)
Embudo de barras horizontales ordenadas desc — patrimonio por unidad de negocio.
```ts
export function Funnel({ title, data, valueFmt = (v) => fmtNum(v, 0) }: {
  title: string;
  data: { label: string; value: number }[];   // se ordena desc internamente
  valueFmt?: (v: number) => string;
}): JSX.Element
```

### `PieChart` (recharts `PieChart`/`Pie`/`Cell`)
Distribución porcentual sobre un total — % patrimonio por unidad.
```ts
export function PieChart({ title, data, valueFmt = (v) => fmtPct(v, 1) }: {
  title: string;
  data: { label: string; value: number }[];   // pct se calcula sobre la suma
  valueFmt?: (v: number) => string;            // formatea el % en leyenda/labels
}): JSX.Element
```

### `WaterfallChart` (recharts `BarChart` con barra base transparente + barra visible)
Cascada acumulada Real vs Budget — pasos por unidad; `decrease` si `valor<0`, `total` para barras ancladas a 0.
```ts
export function WaterfallChart({ title, data, valueFmt = (v) => fmtNum(v, 0) }: {
  title: string;
  data: { categoria: string; valor: number; tipo: "increase" | "decrease" | "total" }[];
  valueFmt?: (v: number) => string;
}): JSX.Element
```
Implementación: precalcular el acumulado por paso; cada barra = `[base, base+valor]` con barra `base`
transparente (técnica estándar de waterfall en recharts). Colores: increase=`COLORS[0]` (verde),
decrease=`COLORS[4]` (rojo), total=`COLORS[1]`. Respetar el signo del dato (no invertir).

Convención común: todos reciben `title`, montan dentro de `<Frame>`, reutilizan `COLORS` y los formatters de `format.ts` (`fmtNum/fmtUF/fmtPct`). Sin estado interno salvo hover.

---

# ORDEN DE CONSTRUCCIÓN RECOMENDADO

1. **Atémpora primero** (0 componentes nuevos): config → reconciliar 7 tablas → catálogo → dashboard con componentes existentes → upload. Cierra una unidad completa con el patrón intacto y sirve de plantilla.
2. **Componentes nuevos** (Funnel, PieChart, WaterfallChart) en `Charts.tsx`, probados con datos mock antes de cablear Grupo.
3. **Grupo después**: config 3 tablas → reconciliar → catálogo → derivar Notas → dashboard (3 secciones) usando los componentes nuevos → upload.
4. **App.tsx**: registrar ambos botones (`Atempora`, `Grupo`) en `UNITS` y render condicional.

Riesgos a resolver con negocio antes de cerrar: Atémpora (signo de gastos en EERR; consolidar gauges duplicados); Grupo (UF LQ vs QAC en pivots; granularidad real del slicer "Mes"=Trimestre; tabla Notas independiente vs derivada).

# Roadmap de Gestión — Reemplazo total de Power BI (Proyecto Sanvest)

> Documento vivo de gestión técnica. Consolida los planes de implementación de los 5 clusters en un backlog único, un roadmap por fases (sprints), el trabajo habilitante transversal, las dependencias de datos del usuario y la definición de "terminado" para apagar el Power BI.
> Fecha: 2026-06-11 · Líder técnico: equipo Sanvest.

---

## 1. Objetivo y supuesto

**Objetivo.** Terminar de reemplazar el dashboard de Power BI (.pbix) por la aplicación propia (ETL en `etl/`, API genérica en `api/main.py`, frontend React en `frontend/src`), con **paridad 1:1** visual y numérica, y dejar la carga mensual/trimestral **idempotente y value-matched** desde la app (sin Power BI ni recargas manuales destructivas).

**Patrón de trabajo (5 fases por módulo).** Todos los módulos siguen el mismo flujo, lo que hace el backlog predecible:

- **Fase 0 — Extracción:** del `.pbix` (Report/Layout + Power Query M) se obtiene el contrato de columnas, literales de activo, medidas y orden de visuales. Herramientas: `scripts/extract_layout.py`, `scripts/parse_m_types.py`, `scripts/analyze_pq.py`.
- **Fase 1 — ETL/carga:** `etl/config/<Unidad>.json` declara hojas/tipos; `etl/loader.py` + `etl/pipeline.py` (`load_unit`, `slug`, `UNIT_SOURCE`) materializan las tablas planas; `etl/reconcile.py` valida 1:1 contra el snapshot del `.pbix`.
- **Fase 2 — Catálogo/API:** `scripts/build_catalog.py <Unidad>` → `api/catalog/<Unidad>.json` (roles dimension/measure/date); la API genérica sirve `/units/<u>/tables/<slug>` y `/distinct` **sin tocar `api/main.py`**.
- **Fase 3 — Frontend:** dashboards en `frontend/src/pages`, reutilizando componentes (`KpiCard`, `Gauge`, `PivotTable`, `IndicatorTable`, `ComboChart`, `ColumnLinesChart`, `MultiLineChart`, `Slicer`) y helpers (`data.aggregate`, `format.periodKey`, `api.fetchRows`).
- **Fase 4 — Carga mensual:** `etl/connect_<unidad>.py` con `apply_*(engine, path)` (transform + **UPSERT por clave de negocio**, fechas a string para idempotencia); rama en `/units/{unit}/upload-informes` de `api/main.py`; botón `InformeUploadPanel unit='<Unidad>'`.

**Supuesto clave de desbloqueo.** Los ítems marcados **`pendiente-base-usuario`** están bloqueados **solo por la entrega de datos del usuario** (no por trabajo técnico pendiente): la **base de Deuda** (UF) transversal, la **base de Vencimientos/Renovaciones LAR**, el **% ocupación retail de St Grand**, y el **seguimiento de deuda actual USA** (saldo/HUD draw). Todo lo demás (`disponible`) tiene su fuente local lista (`Formatos para reportes PBI/…`, `BD Gestion USA .xlsx`, `CIVITAS.xlsx`, `Base balance.xlsx`) y puede avanzar de inmediato. Mientras no llega una base pendiente, las cards muestran `—` / `N/D` sin romper el layout.

---

## 2. Backlog consolidado

Ordenado por **prioridad** (Alta → Media) y dentro de cada prioridad por **dependencia** (lo habilitante primero). E = esfuerzo (S/M).

| # | Módulo | Prioridad | Estado datos | Esf. | Dependencias | Entregable |
|---|--------|-----------|--------------|------|--------------|------------|
| H1 | **Fuente/tabla única de Deuda (UF)** — unidad transversal `Deuda` | Alta | pendiente-base-usuario | M | `loader`, `pipeline` (load_unit/slug), `build_catalog`, API genérica | Tabla plana `deuda` (grano Nombre activo+FechaID) + catálogo `Deuda.json`; alimenta 3 cards |
| H2 | **Granularidad TRIMESTRAL** (capacidad FE transversal) | Alta | disponible | S | Prerrequisito de Fondos DIF y EEFF Grupo | Helper `quarterKey/sortQuarter` en `format.ts` + Slicer Quarter/Year |
| EG1 | **Plataforma base cluster Grupo** (nueva unidad + trimestral + 3 charts) | Alta | disponible | M | — (usa H2) | Unidad `Grupo` (4 tablas), `GrupoDashboard.tsx`, tile MainMenu, ruta App, Funnel/Pie/Waterfall |
| AT1 | **Atémpora base** (CIVITAS.xlsx → 7 tablas + catálogo) | Alta | disponible | M | — | 7 tablas planas + `Atempora.json`, reconciliadas 1:1 |
| UK1 | **USA KPIS — Original Model core** (Unit Summary/Uses&Sources/Partner Returns/Property Info) | Alta | disponible | M | Tablas USA ya cargadas; PivotTable/IndicatorTable | Vista/sección KPIS con 4 pivots por propiedad (Bemiston/MILA/St Grand) |
| EG2 | **Balance Grupo** (pivot + 2 funnels + pie %) | Alta | disponible | M | EG1 | Sección Balance del GrupoDashboard |
| EG3 | **EERR Grupo** (pivot EERR + waterfall Var. Real vs Budget) | Alta | disponible | M | EG1 | Sección EERR con pivot jerárquico + waterfall |
| AT2 | **Atémpora — Zebra Indicadores Mes/YTD** (EERR Civitas) | Alta | disponible | S | AT1 | 2 IndicatorTable Mes/YTD |
| AT3 | **Atémpora — Cards KPIs OF/LC/Disponibles/Unidades** | Alta | disponible | S | AT1 | 4 KpiCards |
| AT4 | **Atémpora — Card Deuda (UF)** (deuda civitas, fuente propia) | Alta | disponible | S | AT1 | KpiCard Deuda (no depende de H1) |
| AT5 | **Atémpora — Gauges ocupación** (General/Venta/Renta/Total OF+LC) | Alta | disponible | S | AT1 | 4 Gauges con target |
| AT6 | **Atémpora — Combos** (Ingresos/EBITDA/Resultado/Gastos Op.) | Alta | disponible | M | AT1, AT2 | 4 ColumnLinesChart |
| AT8 | **Atémpora — Pivot Cuadro de Arriendos** | Alta | disponible | S | AT1 | PivotTable arriendos |
| AT9 | **Atémpora — Pivot Cuadro de Morosidad** | Alta | disponible | S | AT1 (rename col `}`) | PivotTable morosidad por tramo |
| AT11 | **Atémpora — Dashboard + Slicers + tile MainMenu** | Alta | disponible | M | AT1–AT10 | `AtemporaDashboard.tsx` orquestado + ruta + tile |
| UK2 | **USA KPIS — Cards retornos partner** (XIRR/Equity Sanvest/Rent Growth/Yield) | Alta | disponible | S | UK1; def. Expected Exit Date | Fila de KpiCards de retornos |
| H3 | **Card Deuda (UF) en RR** (SOHO/PARK) | Alta | pendiente-base-usuario | S | H1 | KpiCard Deuda en RRDashboard |
| H4 | **Card Deuda (UF) en Hotel** (OLÁ) | Alta | pendiente-base-usuario | S | H1 | KpiCard Deuda en HotelDashboard |
| H6 | **Carga mensual de Deuda (Fase 4)** — `connect_deuda` + endpoint + panel | Alta | pendiente-base-usuario | M | H1; `connect_lar` patrón; endpoint | UPSERT idempotente + InformeUploadPanel Deuda |
| VR1 | **RR — Cuadro de Vencimientos SOHO/PARK** (pivot + combo, Renovaciones LAR) | Alta | pendiente-base-usuario | M | Base vencimientos usuario; Slicers RR | `rr_vencimientos` + pivot + combo + KPI contratos por vencer |
| EG4 | **Notas EERR Grupo** (tableEx de notas) | Media | disponible | S | EG1, EG3 | tableEx notas filtrado por trimestre |
| AT7 | **Atémpora — Combo Gastos Comunes Real** | Media | disponible | S | AT1, AT6 | ColumnLinesChart (confirmar origen EERR Arriendo) |
| AT10 | **Atémpora — Pivot Cuadro de Ventas a la Fecha** | Media | disponible | S | AT1 | PivotTable ventas |
| AT12 | **Atémpora — Carga mensual** (Fase 4: connect_atempora + endpoint + botón) | Media | disponible | M | AT1, AT11 | UPSERT/replace por periodo + panel |
| H5 | **Card Deuda (UF) en Atémpora (Civitas) — vía unidad transversal** | Media | pendiente-base-usuario | S | H1 + AtemporaDashboard | CardSpec reutilizable (el dato propio ya está en AT4) |
| US1 | **USA St Grand — Gauge Retail Occupancy %** | Media | pendiente-base-usuario | S | Base retail St Grand; Gauge | Gauge con target |
| US2 | **USA St Grand — Combo Contracts to Renew + Pivot Renewal Info** | Media | pendiente-base-usuario | M | `usa_renovacion_contratos` (refresco) | Pivot + combo derivado por mes Lease End |
| UK3 | **USA KPIS — Cards préstamo HUD/Loan** (Information ya; Actual pendiente) | Media | pendiente-base-usuario (parcial) | S | UK1; base seguimiento deuda USA | Cards Information ahora; Actual con N/D hasta base |
| UK4 | **USA KPIS — Unit Summary MILA/St Grand** (mix unidades) | Media | pendiente-base-usuario | S | UK1; base tipologías usuario | Bemiston ya; MILA/St Grand al recibir base |
| UD1 | **USA Fondos DIF I y II** (Zebra Q&YTD, combos por edificio, gauge Div. Yield, pivot, slicers Q+Y) | Media | disponible | M | H2 (trimestral); tablas ya cargadas | Sección Fondos DIF en USADashboard |
| UD2 | **USA Bemiston Construcción** (Costo a la fecha, Construction Costs, Financial KPIS, evolutivo, slicer Date) | Media | disponible | S | Tablas USA cargadas | Sección Bemiston Construcción |
| UD3 | **MILA Construcción** (Uses&Sources, gauge progreso, cards, combo evolución) | Media | disponible | M | Filas MILA en tablas de obra (mismo config) | Sección MILA Construcción |

> Notas: la numeración (H/EG/AT/UK/VR/US/UD) es de gestión interna, no del plan original. Atémpora AT4 (Deuda Civitas) usa **fuente propia** y NO está bloqueado por la base transversal de Deuda; H5 es solo el patrón de card reutilizable cuando exista el AtemporaDashboard.

---

## 3. Roadmap por fases (sprints)

### Fase 1 — Quick wins y habilitantes de Deuda/Vencimientos

**Objetivo.** Cerrar la Deuda transversal y dejarla cableada en RR/Hotel; preparar Vencimientos para que "enchufe" al llegar la base; sembrar los habilitantes transversales.

**Ítems.**
- **H1** Fuente/tabla única `deuda` (esquema fijo + seed reconciliable mientras no llega la base).
- **H3 / H4** Cards Deuda (UF) en RR (SOHO/PARK) y Hotel (OLÁ) — leen `deuda`, muestran `—` si no hay dato.
- **H6** `connect_deuda.py` + rama en `/upload-informes` + `InformeUploadPanel unit='Deuda'`.
- **VR1** RR Cuadro de Vencimientos: dejar Fase 0/1 (esquema `rr_vencimientos`, bloque RR.json) listos; Fase 3 visual se activa al cargar la base.
- **H2** Granularidad trimestral (helper `quarterKey`) — habilita Fases 2 y 3.

**Criterio de "listo".**
- `deuda` materializada con esquema contractual; `/units/Deuda/tables/deuda` responde por API genérica.
- Cards Deuda en RR/Hotel renderizan sin romper layout y se actualizan tras un upload de prueba.
- `connect_deuda` re-sube el mismo mes **sin duplicar filas** (idempotencia probada).
- Notas de footer "(Deuda… queda fuera)" / "Cuadro de Vencimientos queda fuera" **eliminadas** una vez con dato.
- Helper trimestral con pruebas de filtrado cruzado Q/Año.

---

### Fase 2 — Núcleo financiero (EEFF Grupo + Atémpora)

**Objetivo.** Incorporar las dos unidades de negocio completas de fuente disponible: EEFF consolidados del Grupo (trimestral) y Gestión Atémpora (Civitas, mensual). Ambas son `disponible` → sin bloqueo de datos.

**Ítems.**
- **EG1–EG4** Unidad `Grupo`: plataforma base + nuevos charts (Funnel/Pie/Waterfall, QuarterSlicer), Balance, EERR + waterfall, Notas.
- **AT1–AT12** Unidad `Atempora`: base 7 tablas, Zebra Mes/YTD, cards KPIs, Deuda Civitas, gauges, combos, 3 pivots (arriendos/morosidad/ventas), dashboard + slicers + tile, carga mensual.

**Criterio de "listo".**
- `GrupoDashboard` y `AtemporaDashboard` enlazados desde MainMenu y App; reemplazan las tarjetas "Próximamente".
- Reconciliación 1:1 vs snapshot `.pbix`: pivots, funnels, pie %, waterfall (Grupo); Zebra, cards, gauges, combos y 3 pivots (Atémpora).
- Slicer Trimestre (Grupo) y Año+Mes (Atémpora) operativos.
- Cargas mensual/trimestral (`connect_grupo`, `connect_atempora`) idempotentes y value-matched (prueba doble carga = 0 inserciones nuevas).
- Card Deuda Atémpora (AT4) servida desde `deuda_civitas` (fuente propia).

---

### Fase 3 — USA avanzado (Retornos / DIF trimestral / Obra)

**Objetivo.** Completar el lado USA: modelo de retornos (KPIS), Fondos DIF I/II (trimestral) y construcción de obra (Bemiston/MILA). Núcleo `disponible`; partes con `pendiente-base-usuario` quedan con placeholders.

**Ítems.**
- **UK1–UK2** USA KPIS Original Model core + cards de retornos del partner (XIRR/Equity Sanvest/Rent Growth/Yield to cost) — disponible.
- **UD1** Fondos DIF I y II (usa H2 trimestral) — disponible.
- **UD2 / UD3** Bemiston Construcción y MILA Construcción — disponible (validar filas MILA en tablas de obra).
- **UK3 / UK4 / US1 / US2** HUD/Loan Actual, Unit Summary MILA/St Grand, Retail Occupancy, Renovaciones St Grand — entregar la parte disponible y dejar `N/D`/placeholder hasta recibir las bases del usuario.

**Criterio de "listo".**
- Vista KPIS con 4 pivots por propiedad y fila de cards de retornos reconciliados 1:1.
- Sección Fondos DIF con Zebra Q&YTD, combos por edificio, gauge Div. Yield (target=Budget) y pivot General Information, filtrable por Quarter+Year.
- Secciones Bemiston y MILA Construcción con cards, gauge de avance y evolutivo de costos (REAL/PROYECCIÓN/PRESUPUESTO).
- Ítems pendientes muestran Information/disponible y marcan saldo/tasa AC/tipologías faltantes como `N/D`, listos para encender 1:1 al llegar la base.

---

### Fase 4 — Experiencia y operación

**Objetivo.** Pulir la experiencia para igualar/superar al Power BI y dejar la operación mensual autónoma.

**Ítems.**
- **Drill-through:** desde la vista operativa Yardi a la vista KPIS de la misma propiedad (USA); navegación entre dashboards relacionados.
- **Export:** exportar pivots/tablas (CSV/Excel) e idealmente la vista a PDF.
- **Cargas mensuales restantes** consolidadas en cada `InformeUploadPanel` (RR/Hotel/USA/Grupo/Atempora/Deuda) con feedback de `{ok, periodo, resultado}`.
- **Activación diferida** de ítems pendientes en cuanto lleguen las bases del usuario (H5 card Deuda Atémpora vía unidad transversal cuando exista el contenedor; Retail Occupancy; HUD Actual; tipologías MILA/St Grand).
- **Pruebas de idempotencia** transversales (`scripts/test_upload.py`) y validación de API (`scripts/validate_api.py`).

**Criterio de "listo".**
- Cada unidad tiene su botón de carga funcional e idempotente.
- Drill-through y export operativos en al menos USA (KPIS) y los pivots financieros.
- Suite de reconciliación verde para todas las unidades migradas.

---

## 4. Trabajo habilitante transversal

| Habilitante | Descripción | Dónde vive | Quién lo consume | Estado |
|-------------|-------------|------------|------------------|--------|
| **Tabla única de Deuda (`deuda`)** | UNA tabla plana transversal, grano (Nombre activo, FechaID), literales de activo idénticos al `.pbix` (SOHO/PARK/OLA HOTEL/Atémpora). Carga vía `etl/config/Deuda.json` + `load_unit('Deuda')`. | `etl/`, `api/catalog/Deuda.json` | Cards Deuda RR (H3), Hotel (H4), Atémpora transversal (H5) | Pendiente base usuario; esquema fijo desde ya |
| **Granularidad TRIMESTRAL** | Helper `quarterKey/sortQuarter` (parsea `Qn-AAAA`/Trimestre+Año) análogo a `periodKey`; reutiliza Slicer genérico como Quarter Selection + Year. | `frontend/src/format.ts`, dashboards | Fondos DIF (UD1), EEFF Grupo (EG1) | Disponible — datos ya traen dimensión trimestral |
| **Componentes nuevos de chart** | `FunnelChart`, `PieChart` (label %), `WaterfallChart` (Bar apilado base transparente + delta por signo), `QuarterSlicer`. Tema de marca (navy + COLORS) y formatters `fmtUF/fmtPct`. | `frontend/src/components/charts/Charts.tsx` | EEFF Grupo (Balance/EERR) | A construir en Fase 2 (EG1) |
| **Drill-through** | Navegación contextual entre vistas (p.ej. Yardi → KPIS por propiedad). | `frontend/src` (routing/links) | USA principalmente | Fase 4 |
| **Export** | Exportar tablas/pivots y vistas (CSV/Excel/PDF). | `frontend/src` (+ API si server-side) | Transversal | Fase 4 |
| **Patrón UPSERT idempotente** | `_read/_write` con fechas→string, UPSERT por clave de negocio preservando histórico (modelo `connect_lar`/`connect_icemm`). | `etl/connect_*.py` | Todas las cargas mensuales/trimestrales | Patrón existente, se replica por unidad |

---

## 5. Qué necesito del usuario y cuándo

### 5.1 Bases pendientes (desbloquean ítems `pendiente-base-usuario`)

| Base requerida | Formato esperado | Desbloquea | Cuándo |
|----------------|------------------|------------|--------|
| **Base de Deuda (UF)** | Excel con grano (Nombre activo, FechaID) + Deuda (UF) y opcionales (Amortizado, Cuota Banco, Línea/Deuda total, % Avance). Literales de activo: SOHO, PARK, OLA HOTEL, Atémpora. | H1 → H3, H4, H5, H6 | **Antes de cerrar Fase 1** (bloqueo único del cluster Deuda) |
| **Vencimientos/Renovaciones LAR** | Crudo del Cuadro de Vencimientos por Activo (SOHO/PARK), tipología/unidad, fecha venc., estado, monto UF, renovaciones. | VR1 (pivot + combo + KPI contratos por vencer) | Durante Fase 1 (Fase 0/1 técnicas pueden adelantarse) |
| **% Ocupación Retail St Grand** | Columna `Occupied % Retail` + target/budget en el origen Yardi de St Grand. | US1 (Gauge Retail Occupancy) | Fase 3 |
| **Seguimiento de deuda actual USA** | Saldo/HUD draw a la fecha + tasa AC (incl. MILA). | UK3 (HUD/Loan Actual) | Fase 3 |
| **Tipologías MILA y St Grand** | Mix de unidades (Floor Plan, Unit Count, Avg SF/Rent/PSF) con discriminador `Activo`. | UK4 (Unit Summary MILA/St Grand) | Fase 3 |
| **Refresco `usa_renovacion_contratos`** | Actualización periódica del snapshot (ya hay 85 filas de estructura). | US2 (Renewal Info + Contracts to Renew) | Fase 3 (estructura ya disponible) |

### 5.2 Fuentes nuevas YA disponibles (no requieren entrega adicional)

- **EEFF Grupo** → `Formatos para reportes PBI/Base balance.xlsx` (hojas Balance, EERR Grupo, Cascada, Notas).
- **Atémpora (Civitas)** → `Formatos para reportes PBI/CIVITAS.xlsx` (7 hojas verificadas).
- **USA Original Model / DIF / Obra** → `BD Gestion USA .xlsx`; tablas ya cargadas y en `api/catalog/USA.json`.

> Acción recomendada: solicitar formalmente la **base de Deuda** y la **base de Vencimientos/Renovaciones LAR** al inicio de Fase 1, ya que son el único bloqueo de prioridad Alta. El resto de bases pendientes son de prioridad Media y caen en Fase 3.

---

## 6. Definición de "terminado" / criterio de paridad para apagar el Power BI

El Power BI se puede **apagar** cuando se cumplen todos los criterios siguientes:

1. **Cobertura de visuales 1:1.** Todos los visuales del `.pbix` (cards, gauges, pivots, combos, zebras, funnels, pie, waterfall, tableEx) tienen su equivalente en la app, con el mismo orden de filas/columnas, etiquetas y formatos (`fmtUF`, `fmtPct`, USD).
2. **Reconciliación numérica.** `etl/reconcile.py` valida 1:1 (row counts y agregados) cada tabla/medida contra el snapshot del `.pbix`, por activo/periodo/trimestre, para todas las unidades: RR, Hotel, USA (KPIS, DIF, Obra), Grupo, Atémpora, Deuda.
3. **Datos completos.** Ningún card crítico queda en `—`/`N/D` por falta de fuente: todas las bases pendientes (Deuda, Vencimientos/Renovaciones, retail St Grand, deuda actual USA, tipologías MILA/St Grand) recibidas e integradas.
4. **Carga autónoma idempotente.** Cada unidad se actualiza desde su `InformeUploadPanel` con UPSERT por clave de negocio; re-subir el mismo periodo NO duplica filas ni destruye histórico (probado con `scripts/test_upload.py`).
5. **API y catálogo validados.** `scripts/validate_api.py` verde para todos los `/units/<u>/tables/<slug>` y `/distinct` (slicers).
6. **Experiencia equivalente o superior.** Slicers (Año/Mes y Trimestre/Year donde aplica), drill-through USA y export operativos.
7. **Navegación completa.** MainMenu + rutas en App.tsx cubren todas las unidades de negocio (sin tarjetas "Próximamente" activas), incluido GrupoDashboard y AtemporaDashboard.
8. **Documentación de operación.** Contrato de cada base y procedimiento de carga mensual/trimestral documentados en `docs/`, para operar sin el `.pbix`.

Cumplidos 1–8, el `.pbix` queda como **respaldo histórico de referencia** y deja de ser la fuente operativa.

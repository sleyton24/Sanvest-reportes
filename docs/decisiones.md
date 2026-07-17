# Decisiones — qué se precalcula vs. qué se calcula al vuelo (y por qué)

Bitácora viva del proyecto Power BI → Web App. Se actualiza en cada fase.

## Fase 0 — Reverse engineering (2026-06-05)

### D0.1 — Entorno: Python 3.12 para la extracción, no 3.14
`pbixray` depende de `xpress9` (extensión Cython para descomprimir el modelo
VertiPaq). No compila en Python 3.14 (sdist roto, sin wheel). **Decisión:** venv
con **Python 3.12** en [`.venv/`](../.venv/). pandas/openpyxl ahí mismo.
El backend FastAPI puede usar 3.14 aparte; pbixray solo se necesita en Fase 0.

### D0.2 — Migrar por unidad de negocio, no el .pbix completo
El .pbix contiene ~10 informes independientes (ver [modelo.md](modelo.md) §2).
**Decisión:** abordar **una unidad de negocio a la vez**, fase 1→4 completa por
unidad, antes de pasar a la siguiente. (Unidad inicial: pendiente de confirmar
con el usuario.)

### D0.3 — ETL como plantilla única, no 64 funciones
61/64 tablas son `promote-headers + cast-types`. **Decisión:** una función
`cargar_hoja(archivo, hoja, mapa_tipos)` + config declarativa por tabla; los ~6
casos con pasos extra se tratan como overrides. Evita 64 funciones casi idénticas.

### D0.4 — Clasificación preliminar de medidas DAX (detalle en modelo.md §5)
- **Cosmética de gráfico** (`AUX = -1`, multiplicaciones de signo) → resolver en
  el **front**, no en SQL.
- **Aritmética simple** (`MAX-MAX`, `SUM+SUM`, `DIVIDE`) → columna calculada o
  medida directa en el **API**.
- **Con contexto** (`SUMX(IF N1<>"INGRESOS"…)` de EERR, `CALCULATE`,
  `SELECTEDVALUE`) → calcular en el **API**, no precalcular en la tabla plana
  (dependen del filtro del visual).
- Decisión definitiva por medida: al llegar a la unidad de negocio que la usa.

## Fase 1 — Replicar ETL (2026-06-05)

### D1.1 — Unidad de negocio inicial: **Desarrollo para la Venta (DV)**
El usuario no fijó unidad ("hazlo… "); se elige DV por ser el vertical slice más
limpio: 10 tablas en un solo Excel disponible, sin dependencia de SQL Server/LAR,
y representativo (fechas, KPIs, ventas, financieros). Redirigible en la pausa.

### D1.2 — Base de datos: SQLite en dev, SQL Server (VPS) en producción
Instrucción del usuario: *"hazlo con tu base interna, después en producción lo
subimos al SQL de nuestro VPS"*. **Decisión:** sink de desarrollo = **SQLite**
(`db/sanvest_bi_dev.sqlite`) vía **SQLAlchemy**; producción = SQL Server del VPS
cambiando solo el connection string. El código ETL es agnóstico de motor. El
esquema se diseña con tipos que mapean limpio a SQL Server.
> La reconciliación (requisito duro) ocurre en pandas contra `model.get_table()`
> de pbixray, independiente del motor de BD destino.

### D1.3 — El .pbix es un SNAPSHOT; el Excel actual puede estar más nuevo
Reconciliación DV: **10/10 tablas con ETL fiel** (8 cuadran exacto al 100%; 2 en
estado DRIFT). DRIFT = el ETL reproduce el 100% de las filas del snapshot del
.pbix, pero el Excel tiene datos posteriores al último refresh del .pbix:
- `DV Indicadores Financieros`: +42 filas nuevas (periodos 2025/2026) y la columna
  `Inversion Sanvest` se reposicionó (de última a 9ª) y pasó de texto-coma a número.
- `DV Evolucion de costos`: +2 filas nuevas (2026-04) y 1 celda de `COSTOS_REALES`
  que estaba vacía en el snapshot y ahora tiene valor.

**Decisión / criterio de reconciliación:** una tabla es "ETL fiel" si **toda
clave de negocio del modelo se reproduce en el ETL**. Las filas nuevas y los
valores actualizados en el Excel NO son errores de ETL: son drift de datos
(el .pbix es del 22-05; los Excel se siguen editando). El verdadero objetivo del
proyecto —reemplazar el .pbix— hace que el Excel sea la fuente de verdad viva.
> Implicación: cuando exista la carga directa (Fase 4), el .pbix deja de ser el
> patrón; pasa a serlo el último Excel cargado. La reconciliación contra el .pbix
> es válida solo como prueba de que la LÓGICA del ETL replica el M.

### D1.4 — ETL como plantilla declarativa (implementado)
`etl/`: `loader.load_sheet` (replica promote-headers + cast del M), `pipeline.load_unit`
(carga una unidad desde 1 Excel, reutilizable en Fase 4), `db.get_engine`
(SQLite dev / SQL Server prod), `reconcile` (multiset + drift por clave). Config
por unidad en `etl/config/<UNIDAD>.json`, generada de parsear el M
(`scripts/parse_m_types.py`). DDL SQL Server en `db/ddl_sqlserver_<UNIDAD>.sql`.

## Fase 2 — Backend FastAPI (2026-06-05)

### D2.1 — API catálogo-driven (genérica por unidad)
`api/` lee `api/catalog/<unidad>.json` (generado por `scripts/build_catalog.py`).
Endpoints genéricos sirven cualquier tabla/medida sin código por-unidad: tablas
con filtro+paginación+orden, `distinct` (slicers), `aggregate` (group-by para
visuales), y medidas. Columnas validadas contra el catálogo; valores siempre
parametrizados. Detalle en [api.md](api.md).

### D2.2 — Medidas DAX: contexto de filtro → al vuelo en la API
Las 2 medidas reales de DV (`proy−acum`, `2×MAX(Monto)`) son agregados con
contexto de filtro; se calculan en la API con los filtros del request, NO se
precalculan en la tabla plana. Validado: valor API == valor BD. (Confirma el
criterio D0.4 para medidas con contexto.)

### D2.3 — Mismo engine ETL/API; CORS para el front
La API reusa `etl/db.get_engine` (SQLite dev / SQL Server prod). CORS habilitado
para `localhost:5173` (Vite) de cara a Fase 3.

## Fase 3 — Dashboard React (2026-06-05)

### D3.1 — Visuales extraídos del layout interno del .pbix
`scripts/extract_layout.py` lee `Report/Layout` (JSON UTF-16) del .pbix. DV tiene
3 páginas-proyecto idénticas (Millalongo, Sta Victoria 155, Sta Victoria 99) con
10 visuales de datos c/u: 2 gauges, 4 KPI cards, 3 gráficos (columna apilada,
combo línea+columna, columna agrupada), 1 pivot. Inventario en
[visuales_DV.md](visuales_DV.md).

### D3.2 — ⚠️ Nombre de proyecto INCONSISTENTE entre tablas (mapeo manual)
El mismo proyecto se escribe distinto según la tabla:
| Proyecto | DV* (`Nombre proyecto`) | Amortizacion (`Proyecto`) | Financieros (`Activo`) |
|---|---|---|---|
| Millalongo | Millalongo | Millalongo | Millalongo |
| Sta Victoria 155 | Sta. Victoria 155 | Sv155 | SV 155 |
| Sta Victoria 99 | Sta. Victoria 99 | Sv99 | SV 99 |
En el PBI esto se resolvía con filtros de página manuales (las relaciones no
linkean). **Decisión:** mapeo explícito de proyecto en el front (`config.ts`),
filtrando cada tabla por su propia ortografía. Solo 3 de los 6 proyectos del dato
tienen página/financieros; el front ofrece esos 3 (igual que el PBI).

### D3.3 — Contexto de filtro de los visuales (de `Report/Layout`)
Para producir los mismos números, cada visual aplica filtros (extraídos con
`scripts/extract_filters.py`):
- **Proyecto** (página): cada tabla por su ortografía (ver D3.2).
- **Versión**: `DV Ventas` y `DV Escrituras` → `'REAL'`; `DV KPIS` y
  `DV Indicadores Financieros` → `'PROYECCIÓN'`. Construcción/Uso y Fondo/Evolución
  sin filtro de Versión (usan `[Max]`/`[Sum]` sobre todo).
- **Fechas**: la card "Estado de Deuda" fija `Amortizacion.Fecha = 2025-12-01`;
  gráficos con ventana de Periodo (relativa/rango). v1: cards/gauges con Max/Sum
  "a la fecha"; gráficos muestran la serie completa (la ventana relativa del PBI
  se anota como refinamiento).
Estos filtros van codificados en `frontend/src/config.ts`.

### D3.4 — Charts con Recharts; cards/gauges/pivot custom
"Sin librerías de componentes UI" → no se usa MUI/Ant/etc. Tabla pivot **custom**.
Para los 3 gráficos cartesianos se usa **Recharts** (librería de gráficos, no un
kit de UI); gauges en SVG propio; KPI cards en HTML propio. Si se prefiere otra
librería de gráficos (o cero dependencias), avisar.

### D3.5 — Puertos: API en 8077 (no 8000)
En esta máquina corre otro proyecto ("LAR Revenue Intelligence") que ocupa `:8000`
y `:5173`. **Decisión:** la API de este proyecto corre en **8077** y el proxy de
Vite apunta ahí por defecto (`frontend/vite.config.ts`, override con
`VITE_API_TARGET`). Verificado end-to-end: front (Vite) → proxy `/api` → API 8077
→ SQLite, con los filtros del informe (proyecto + Versión=REAL/PROYECCIÓN).

## Fase 4 — Carga directa (2026-06-05)

### D4.1 — Reutilizar EXACTAMENTE el ETL de Fase 1 (regla dura #5)
`POST /units/{unit}/upload` guarda el Excel en temporal y llama
`etl.load_unit(unit, excel_path=subido, engine=...)` — la MISMA función que usa
Fase 1 con la fuente local. No hay un segundo camino de transformación.

### D4.2 — Validar antes de cargar (no escribir basura)
`etl.validate.validate_unit_file` chequea, por tabla, que la hoja exista y estén
las columnas que el M castea. Si falla → 422 sin cargar nada. Protege las tablas
planas de un Excel con estructura inesperada.

### D4.3 — Refresco del dashboard
El front sube por `fetch`+`FormData` (`UploadPanel`), y al éxito incrementa un
`refresh` que vuelve a pedir los datos. Carga con `if_exists="replace"` → la
nueva carga reemplaza la tabla. End-to-end verificado: subir el Excel de DV
recarga 2.709 filas y el dashboard refleja los datos nuevos.

## Unidad Hotel — 2ª unidad migrada (2026-06-05)

### D5.1 — Fecha casteada a Int64 = número de serie de Excel (fix de ETL)
Power Query, al convertir una FECHA a `Int64.Type`, devuelve el **número de serie
de Excel** (días desde 1899-12-30), no nanosegundos. `Hotel Real.Periodo LY AUX`
lo exponía. Fix en `etl/loader.py`: si la columna a castear a Int64 es de fechas,
convertir a serial. Sin esto, `Hotel Real` no cuadraba.

### D5.2 — Reconciliación robusta a representación es-CL (mejora del reconciliador)
El modelo guarda columnas NO tipadas (lectura cruda, p.ej. `Hotel Original`) como
**texto es-CL**: números `69,43582301` (coma) y fechas `01-01-2020` (dd-mm-yyyy).
`etl/reconcile.py` ahora normaliza: parsea número-coma y fecha es-CL, maneja
`datetime` de Python (no solo `pd.Timestamp`), y compara floats a **7 cifras
significativas** (absorbe el último dígito entre el doble de openpyxl y el texto
del modelo). Además el análisis de DRIFT infiere clave/medida del **dato** (no de
los tipos casteados), para clasificar también lecturas crudas. Resultado Hotel:
**5/5 ETL fiel** (3 exacto + 2 DRIFT); DV sigue 10/10 (sin regresión).

### D5.3 — Hotel: un módulo más, mismo pipeline
Migración por configuración: `UNITS` en `parse_m_types.py` + `UNIT_SOURCE` en
`pipeline.py`; luego `run_fase1 Hotel`, `gen_ddl Hotel`, `build_catalog Hotel`,
`extract_layout Hotel`. API genérica la sirve sin cambios. Front: `HotelDashboard`
(página "OLÁ Hotel": 2 KPI cards, gauge ocupación, 2 tablas indicadores, 4 combos
mensuales Real/Año-ant/Ppto, 4 combos YTD por Item, 4 líneas) + **navegación entre
unidades** (`App.tsx`, tabs DV | Hotel). Pendiente menor: tarjeta Deuda (UF) usa la
unidad Deuda (otra unidad) — se integra al migrarla.

## LAR / Renta Residencial — Informes de Gestión → panel (2026-06-08)

### DL.1 — El objetivo real: automatizar la actualización mensual
No es solo leer el Excel procesado; es transformar los **archivos crudos** del mes
(`2026/<mes>/LAR Group/`) al formato de las tablas planas, como hace el "skill" de
DV que pasó Seba. Para LAR la fuente son los **Informes de Gestión** (SOHO/PARK) +
el **Informe LAR GROUP consolidado** (holding).

### DL.2 — Mapeo derivado y VERIFICADO (no estaba en el .pbix)
Reconstruido por value-matching contra las tablas reconciliadas:
- **Informe Gestión SOHO/PARK** (sección financiera): EBITDA UF=fila directa,
  Flujo=fila directa, Ingresos/Costos UF = $ ÷ tasa_UF (tasa = EBITDA$ ÷ EBITDA_UF).
  Bloque "KPIs de Gestión" (Ocupación, EBITDA/Cuota, UF/m²…) en columnas Real/Ppto.
  → Indicadores Financieros (100%), Real+PPTO+LY (núcleo verificado).
- **Informe LAR GROUP consolidado** (`INFORME GESTIÓN`): P&L del holding, tasa UF en
  fila ~5, cuentas por etiqueta (Ingresos r9-16 / Gastos r24-35), EBITDA(UF)/RESULTADO(UF).
  → Indicadores Financieros Lar (254/263 ✓; 9 dif = quirk orden Dic) + filas LARGROUP
  de las otras dos (Ingresos/Costos/EBITDA/Flujo, cuadran exacto).
- Código: [etl/informes_lar.py](informes_lar.py) (transforms) + reconciliadores en scripts/.

### DL.3 — Conexión con HISTÓRICO (upsert, no replace)
[etl/connect_lar.py](../etl/connect_lar.py) `apply_informes(engine, specs, consolidado)`:
upsert por clave de negocio (preserva años previos), recalcula YTD (acum. del año)
y LY (Real mes-12) sobre toda la tabla. Idempotente (clave string, fechas a texto
antes de escribir). Verificado: histórico intacto, meses del informe actualizados,
sin duplicados al reaplicar.

### DL.4 — Carga (Fase 4) + dashboard
`POST /units/RR/upload-informes` (multi-archivo; detecta SOHO/PARK/consolidado por
nombre). Front: tab **Renta Residencial** + "Cargar Informes" → `apply_informes` →
refresca. Pendiente menor: vista de P&L del holding (Indicadores Financieros Lar)
en el dashboard; hoy se ven SOHO/PARK/LARGROUP vía Real+PPTO+LY.

## Hotel — CCPP OLÁ Providencia → panel (2026-06-08)

### DH.1 — Fuente: hoja `RESUMEN formato Sanvest` del CCPP mensual
`CCPP OLÁ Providencia <mes>.xlsx` (en `2026/<mes>/Hotel/`). Layout por mes:
[Real, Ppto, Diff, Real LY, Diff LY] + columnas YTD → trae Real/Ppto/LY/YTD
directos. Métricas en filas (Ventas Totales, Gastos Operacionales, GOP, EBITDA,
Resultado, Total Flujo Caja Consolidado, % Ocupación, Tarifa $/US$, UF).

### DH.2 — Decisión de Seba: EBITDA = GOP
El `hotel_real` viejo (de `BD HOTEL.xlsx`, intermedio manual) calculaba
EBITDA/Costos/Flujo con una definición NO documentada que no coincide con el CCPP.
**Decisión:** adoptar el CCPP con **EBITDA = GOP** (r11), Costos = Gastos
Operacionales, Flujo = Total Flujo Caja Consolidado, Ingresos = Ventas Totales.
Ingresos/Ocupación/ADR cuadran 1:1 (12/12); EBITDA/Costos/Flujo pasan a la
definición estándar (los históricos se recalculan). Transform:
[etl/hotel_ccpp.py](../etl/hotel_ccpp.py); conexión upsert:
[etl/connect_hotel.py](../etl/connect_hotel.py) `apply_ccpp`. Verificado: EBITDA
Ago-25 7038→6409 (=GOP), histórico 2024 intacto. Carga:
`POST /units/Hotel/upload-informes`; botón "Cargar CCPP" en el dashboard Hotel.

## USA — base + crudo Budget_Comparison (2026-06-08)

### DU.1 — Base migrada (multi-archivo)
USA = 21 tablas de **2 Excel** (BD Gestion USA + USA.xlsx). Extendí el pipeline a
fuente **por tabla** (`file` en el config de `parse_m_types`, resuelto en
`load_unit`). Reconciliación: **20/21 ETL fiel** (1 FAIL = Bemiston Property Info,
metadata que cambió en el Excel = drift). En la API como unidad USA.

### DU.2 — Crudo→panel: Budget_Comparison por propiedad
Crudos en `2026/<mes>/USA/`: `<Propiedad> - Budget_Comparison_Accrual` (Bemiston,
MILA, St Grand/15229) + `USA Kpis.xlsx`. Cada archivo = 1 mes (MTD = mes;
PTD = YTD). Mapeo (hoja `Report1`): cuenta(col1)→Nivel 1; MTD Actual→Real,
MTD Budget→Monto, PTD→YTD. **Regla de signo: REVENUE +, EXPENSES − (según Nivel 3
del panel).** Verificado: Bemiston **140/140**, MILA 118/120; St Grand misma
estructura/código. Transform `etl/usa_budget.py`; upsert con histórico
`etl/connect_usa.py` `apply_usa_budget` (detecta propiedad→tabla por nombre:
final_bemiston/mila_final/st_grand_final_2). Endpoint `POST /units/USA/upload-informes`.
Idempotente + histórico preservado.

### DU.3 — USA Kpis + dashboard (hecho)
`USA Kpis.xlsx` → USA KPIS GESTION: bloques por propiedad (St. Grand/Mila/Bemiston),
meses 1-12 en columnas; $/SQF Actual/Budget, Retail, Avg Rent → columnas del panel.
Transform `etl/usa_kpis.py`, upsert `connect_usa.upsert_kpis`, endpoint rutea por
nombre ("kpis" → KPIs; else Budget_Comparison). Verificado (Bemiston Ene $/SQF
AC=3.31425). **Dashboard USA** (`USADashboard.tsx`): tab + selector propiedad +
P&L por Nivel 3 + KPIs (Revenue/OpEx/NOI para Bemiston/MILA) + carga.

### DU.4 — Homologación de las 3 propiedades (tabla única usa_pnl)
Pedido de Seba: "los 3 paneles iguales, yo solo cargo el informe Yardi". Hecho:
- **`usa_pnl`** (esquema único): Activo, Seccion (REVENUE/OPERATING EXPENSES/OTHER
  EXPENSES), Categoria, Linea, Real, Ppto, YTD, YTD_Ppto, Anio, Mes, FechaID.
  Construida por `scripts/build_usa_pnl.py` desde las 3 tablas: Bemiston/Mila
  (sección=Nivel 3), St Grand (sección=**Nivel 2**, excluye subtotales en MAYÚS).
- **Carga única "Informe Yardi"**: `connect_usa.apply_yardi` detecta la propiedad
  por el r0 del informe (`Nombre (código)`: Bemiston/15167, Mila/15229, St Grand),
  aplica signo por sección (REVENUE+/EXP−) y upsert por (Activo, Linea, FechaID) a
  usa_pnl. Endpoint USA: archivos → apply_yardi; "kpis" → USA KPIS GESTION.
  Verificado (Bemiston Market Rent +715.271, Vacancy −188.331; idempotente).
- Dashboard USA lee `usa_pnl` → los 3 paneles idénticos (selector de propiedad).

### Pendientes menores USA
- **St Grand crudo**: su Nivel 3 NO es la sección (es la línea de cuenta), así que la
  regla de signo (REVENUE en Nivel 3) NO aplica a un Budget_Comparison de St Grand.
  La base (de BD Gestion USA) está OK; falta resolver el signo/sección para subir su
  crudo. Bemiston/MILA OK.
- Omitir 2-4 líneas de subtotal (Net Income/NOI) en los inserts de Budget_Comparison.

### Pendientes que bloquean fases siguientes
- Conseguir `Gestion Oficina.xlsx` y `Uso Y fondos mila diciembre .xlsx`.
- Acceso a SQL Server `BNVSOFSQL\SQL_2 / SQLLAR` (solo afecta a LAR).
- Definir base de datos destino en SQL Server (CLAUDE.md la deja "por definir").

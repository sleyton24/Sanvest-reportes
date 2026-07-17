# Diseño de la App Sanvest BI — SPEC implementable

> Documento de dirección de diseño. Síntesis de los 3 conceptos evaluados
> ("Veredicto del Mes", "Analítica Guiada — 3 paradas", "Scorecard + Spotlight").
> Objetivo: que **cualquier persona** (no analista) entienda el estado de una
> unidad de negocio en segundos, sin perder el detalle 1:1 con el `.pbix` que ya
> usa el analista. Cero librerías nuevas; se reutiliza todo lo construido
> (`format.ts`, `data.ts`, tokens CSS, charts Recharts, Gauge SVG).

---

## 0. Evaluación de conceptos (1-5)

| Criterio | Veredicto del Mes | Analítica Guiada (3 paradas) | Scorecard + Spotlight |
|---|---|---|---|
| (a) Claridad para cualquier persona | 5 — titular en 1 frase + 5 números grandes; el ojo cae top-down | 4 — muy clara, pero el "recorrido" de 3 paradas pide más scroll antes del primer dato accionable | 5 — semáforo de color pre-atencional: rojo/ámbar/verde se lee antes que el número |
| (b) Profesionalismo / estética | 5 — jerarquía por tamaño y aire, banda de veredicto sobria, coherente con navy | 4 — riesgo de "sobre-anotar" cada chart con insight + numeración de paradas recarga | 4 — fuerte, pero el borde de color por tile puede competir con el color de unidad |
| (c) Factibilidad React+Recharts (sin libs) | 5 — sparkline reusa Recharts o `<path>` como Gauge; todo el dato ya existe | 5 — idéntico, SVG propio para sparkline; helper puro | 5 — `<polyline>` SVG simple; helper puro `buildInsight` |
| (d) Fidelidad de marca Sanvest | 5 — usa `--accent` por unidad y semánticos `--pos/--neg`, sin tocar tema | 4 — separa bien acento de unidad vs semántico, pero introduce íconos/numeración no presentes en la marca | 3 — propone renombrar `--neg`→`--bad` y añade borde de estado que puede chocar con la barra de unidad del h1 |
| (e) Reuso de lo ya construido | 5 — `CollapsibleSection` envuelve `HoldingPnL`/`IndicatorTableMY`/pivots intactos; `HeroKpi` solo en la 1ª fila | 5 — `Collapsible` por sección; conserva todos los charts y tablas | 5 — Scorecard reemplaza solo la fila hero; tablas y charts intactos |
| **Total /25** | **25** | **22** | **22** |

### Concepto ganador
**"Veredicto del Mes"** como columna vertebral, **enriquecido** con lo mejor de
los otros dos:
- de **Scorecard + Spotlight**: el **estado semáforo** (verde/ámbar/rojo) en cada
  KPI hero y la **regla de banda ámbar ±x%** para el cálculo del tono — la
  pre-atención por color es el mayor acierto de claridad.
- de **Analítica Guiada**: los **`SectionIntro`** ("qué mirar") que anteceden los
  bloques de charts y el **`InsightChip`** pegado a cada gráfico clave — dan
  storytelling sin obligar a un recorrido largo.

Lo que se **descarta** del ganador-base y de los demás: la numeración de "paradas"
(①②③) y los íconos por sección (ruido visual no presente en la marca); renombrar
`--neg`→`--bad` (innecesario, rompe búsquedas existentes); el borde de color de
estado en TODO el tile (se reduce a un punto/badge para no competir con el color
de unidad del `h1`).

---

## 1. Principios de diseño

1. **Top-down en una sola lectura.** El ojo cae en este orden: *titular* (1 frase,
   qué pasó) → *KPIs hero* (5 números grandes con Δ y color, el estado) →
   *charts con intro* (por qué / la tendencia) → *detalle colapsado* (para el
   analista). Quien mira 5 segundos ya sabe cómo va la unidad.
2. **El color significa negocio, no aritmética.** Verde = mejor que el plan,
   rojo = peor que el plan, ámbar = en línea (±banda). El signo del número NO
   decide el color: en Costos/Gastos/Deuda estar *bajo* presupuesto es verde
   aunque la resta sea negativa (`goodWhen: 'lower'`).
3. **Jerarquía por tamaño y aire, no por bordes.** Los números hero (40px) y el
   titular (28px) mandan; el detalle conserva la densidad de 12px tabular. Se
   evita saturar de líneas/cajas; se usa espacio en blanco.
4. **Insights deterministas, auditables, sin IA en runtime.** Todo texto en
   lenguaje natural lo arma un helper puro (`buildInsight`) con plantillas en
   español sobre `real/ppto/ly`. Mismo input → mismo texto, testeable y
   reconciliable con el `.pbix`.
5. **Reutilizar, no reescribir.** Lo denso ya construido (`HoldingPnL`,
   `IndicatorTableMY`, `PivotTable`, `FlujoPivot`, todos los charts) se conserva
   intacto y se envuelve en un colapsable. Los componentes nuevos son pequeños y
   se apoyan en `format.ts`, `data.ts` y los tokens CSS existentes.

---

## 2. Sistema visual

### Tipografía y escala
Sobre las fuentes ya cargadas (Avenir Next → Inter → Nunito Sans).

| Rol | Tamaño / peso | Notas |
|---|---|---|
| Titular del veredicto (HeaderInsight) | 26-28px / 700 | color `--white`; el % y el KPI ancla en color de estado |
| Sub-frase de causa | 14px / 400 | `--muted` |
| Número hero (KpiHero) | 40px / 800 | `font-variant-numeric: tabular-nums` |
| Título de KPI hero | 12px / 600 | `--muted`, MAYÚSCULA, `letter-spacing: .4px` |
| Δ badge (StatusBadge/InsightChip) | 13px / 700 | flecha SVG 10px + % |
| Sub-línea "vs LY" | 11px / 400 | `--muted` |
| SectionIntro título | 16px / 600 | `--white` |
| SectionIntro lead ("Qué mirar…") | 13px / 400 | `--muted` |
| Detalle (tablas/P&L) | 12px tabular | sin cambios respecto a hoy |

### Jerarquía de números
Números grandes **solo** en KPIs hero y en gauges. El veredicto cita 1-2 cifras
clave dentro de la frase. Todo lo demás (tablas Mensual+YTD, P&L, pivots) mantiene
12px tabular. Nunca dos pesos tipográficos compitiendo en la misma fila.

### Paleta de variación (semántica)
Reutiliza los tokens ya definidos en `:root`; **no se renombra nada**.

| Estado | Token | Hex | Cuándo |
|---|---|---|---|
| Favorable (mejor que plan) | `--pos` | `#A8C813` | `Δrel` favorable según `goodWhen` |
| En línea (cerca del plan) | `--warn` *(nuevo)* | `#FACF22` | `|Δrel| ≤ banda` (def. 5%; ocupación/ratios 3%) |
| Desfavorable (peor que plan) | `--neg` | `#ff7a76` | `Δrel` desfavorable según `goodWhen` |
| Sin dato / sin ppto | `--muted` | `#9fb0c3` | `ppto == null` o `0` → badge `—`, tono neutro |

Único token nuevo: `--warn: #FACF22;` (es el amarillo de marca ya usado por Hotel,
elevado a semántico). `--pos`/`--neg` se reutilizan tal cual.

**Badges (pill):** `border-radius: 999px`; fondo
`color-mix(in srgb, var(--estado) 14%, transparent)`; texto en el color pleno;
flecha SVG ▲/▼/→ de 10px. Mismo lenguaje visual en hero, chips y (opcional) en la
columna Δ de las tablas.

### Espaciado
- Fila hero: `gap: 16px` (reusa `.row`); tarjetas `min-height ~150px`,
  `padding: 18px`.
- Banda de veredicto y fila hero llevan `margin-bottom: 22px` para "respirar".
- Veredicto: borde-izquierdo 4px del color de estado + fondo
  `color-mix(in srgb, var(--estado) 8%, transparent)` — sutil, coherente con navy.

### Uso del color de unidad
- `--accent` (verde DV / celeste RR `#3796AA` / amarillo Hotel `#FACF22` /
  naranjo USA `#EF731B` / rojo ICEMM `#D83252`) se hereda vía `.app.unit-*` y se
  usa **solo** para: barra del `h1`, trazo del **Sparkline** y punto final, y
  acentos de marca. **Nunca** se mezcla con el color semántico de variación
  (excepto DV, donde acento y `--pos` coinciden por diseño de marca).
- El **estado** (verde/ámbar/rojo) vive en badges y en el borde del veredicto;
  el **acento de unidad** vive en sparklines y cromo. Dos lenguajes de color
  separados y consistentes en las 5 unidades.

---

## 3. Estructura estándar de un dashboard (arriba → abajo)

| # | Sección | Componente(s) | Propósito |
|---|---|---|---|
| 1 | **Header** | `.dash__header` (existente) + sub-titular "OLÁ Hotel · a may 2025" | Título con barra de unidad, slicers Año/Mes, upload. El sub-titular ancla el periodo de lectura. Se reutiliza tal cual. |
| 2 | **Veredicto** | `HeaderInsight` | Banda full-width con 1 frase autogenerada del mes (KPI ancla + mayor desviación) y borde de color de estado. "Qué pasó", en 5 segundos. |
| 3 | **KPIs hero** | `KpiHero` ×3-5 dentro de `.row` | Fila de mayor jerarquía: número grande + `StatusBadge` Δ vs Ppto + sub-línea vs LY + `Sparkline` 12m. "El estado", de un vistazo. |
| 4 | **Soporte narrado** | `SectionIntro` + 2-4 charts existentes (`BarsLineChart`/`MultiLineChart`), cada uno con `InsightChip` | Intro de 1 línea ("Qué mirar…") + gráficos de tendencia Real/Ppto/LY anotados. "Por qué / la tendencia". |
| 5 | **Detalle financiero** | `CollapsibleSection` envolviendo `IndicatorTableMY`, `HoldingPnL`, `PivotTable`, `FlujoPivot` (intactos) | Colapsado por defecto. El analista conserva el 1:1 con el `.pbix`; el ejecutivo no lo ve salvo que lo abra. |
| 6 | **Footer** | `.dash__footer` (existente) | Fuente `.pbix`, notas de reconciliación. Sin cambios. |

El mismo patrón (veredicto → hero → intro → detalle) se repite en las 5 unidades:
aprender un dashboard es aprender todos.

---

## 4. Componentes nuevos a construir

Todos en `frontend/src/components/insight/` (presentación) salvo el helper, que va
en `frontend/src/insight.ts`. Cada componente < ~45 líneas, solo CSS nuevo con
clases que reutilizan tokens existentes.

### 4.1 `StatusBadge`
- **Propósito:** núcleo visual reutilizado por todos. Pill con flecha + variación
  vs una referencia (Ppto o LY), coloreada por **estado de negocio**.
- **Props:**
  ```ts
  {
    value: number | null;      // real
    base: number | null;       // ppto o ly
    mode?: 'pct' | 'pp' | 'abs';   // pct por defecto; 'pp' para tasas (ocupación)
    goodWhen?: 'higher' | 'lower'; // 'lower' para costos/gastos/deuda
    band?: number;             // banda ámbar (def. 0.05; tasas 0.03)
    suffix?: string;           // ej. ' vs Ppto'
    fmt?: (v: number | null) => string;
  }
  ```
- **Cálculo del estado:** ver §5. Si `base == null || base == 0` → texto `—`,
  clase neutra (`--muted`), sin flecha.

### 4.2 `Sparkline`
- **Propósito:** mini-línea de 12 meses sin ejes/leyenda/grid (~120×34px), punto
  final resaltado, banda opcional de Ppto punteada. Da contexto de tendencia, no
  un solo punto.
- **Implementación:** `<svg><polyline>` propio al estilo de `Gauge.tsx` (auto-escala
  min/max, ~25 líneas, sin Recharts → evita el peso de `ResponsiveContainer` ×5
  tiles). Trazo 2px en `--accent`; ppto punteado `rgba(255,255,255,.25)`.
- **Props:**
  ```ts
  {
    points: (number | null)[];   // serie mensual (de groupByPeriod → PeriodPoint[])
    ppto?: (number | null)[];
    width?: number;  height?: number;
  }
  ```

### 4.3 `KpiHero`
- **Propósito:** versión ejecutiva de `KpiCard` solo para la fila hero. Número
  grande (40px), título arriba, `StatusBadge` Δ vs Ppto, sub-línea vs LY,
  `Sparkline` al pie. `KpiCard` se conserva para el detalle.
- **Props:**
  ```ts
  {
    title: string;
    value: number | null;
    ppto?: number | null;
    ly?: number | null;
    trend?: (number | null)[];        // 12 meses para el sparkline
    trendPpto?: (number | null)[];
    fmt: (v: number | null) => string;  // fmtUF / fmtUSD / fmtPct / fmtNum
    goodWhen?: 'higher' | 'lower';
    deltaMode?: 'pct' | 'pp' | 'abs';
  }
  ```

### 4.4 `HeaderInsight` (titular / veredicto)
- **Propósito:** banda full-width con el veredicto del mes y borde de color de
  estado. El texto lo arma `buildVerdict()` (§5), no la UI.
- **Props:**
  ```ts
  {
    unit: string;
    period: string;           // 'Mayo 2025'
    tone: 'pos' | 'warn' | 'neg';
    headline: string;         // 'Mayo cerró 23% bajo presupuesto en EBITDA'
    detail?: string;          // 'Principalmente por menores ingresos (−18% vs Ppto).'
  }
  ```

### 4.5 `SectionIntro`
- **Propósito:** encabezado de bloque de charts: título + una línea guía
  ("Qué mirar: …") en `--muted`. Da el storytelling antes de cada bloque, sin
  numeración ni íconos.
- **Props:** `{ title: string; lead: string }`

### 4.6 `InsightChip`
- **Propósito:** línea de insight en lenguaje natural anclada bajo el título de un
  chart clave. `StatusBadge` + frase corta. Se alimenta de `buildInsight` (§5).
- **Props:**
  ```ts
  {
    text: string;   // 'Ocupación 97,9%, +0,9 pp vs Ppto'
    delta?: { value: number | null; base: number | null; goodWhen?: 'higher'|'lower'; mode?: 'pct'|'pp'|'abs' };
  }
  ```

### 4.7 `CollapsibleSection`
- **Propósito:** acordeón ligero con `<details>/<summary>` nativo (cero JS) que
  envuelve los componentes densos existentes y los deja cerrados por defecto.
  Resuelve "detalle secundario" sin tocar esos componentes.
- **Props:** `{ title: string; defaultOpen?: boolean; children: React.ReactNode }`

### 4.8 `buildInsight` / `buildVerdict` (helpers puros — `insight.ts`)
- **Propósito:** convertir números en texto determinista. `buildInsight` arma la
  frase de UNA métrica; `buildVerdict` rankea las métricas del mes y arma el
  titular (la de mayor desviación desfavorable) + la causa.
- **Firmas:**
  ```ts
  interface Metric {
    label: string;
    real: number | null;
    ppto: number | null;
    ly?: number | null;
    goodWhen: 'higher' | 'lower';
    mode?: 'pct' | 'pp' | 'abs';
    fmt: (v: number | null) => string;
  }

  buildInsight(m: Metric): { tone: 'pos'|'warn'|'neg'|'na'; text: string; delta: number | null };

  buildVerdict(input: { unit: string; period: string; metrics: Metric[] }):
    { tone: 'pos'|'warn'|'neg'; headline: string; detail: string };
  ```

---

## 5. Lógica de los INSIGHTS autogenerados

Todo se calcula con `format.ts` (`fmtPct/fmtUF/fmtUSD/fmtNum`) sobre `real/ppto/ly`
que las páginas ya obtienen vía `aggregate()` / `groupByPeriod()`.

### 5.1 Variación y dirección
```
Δabs  = real - base                     (base = ppto, o ly para la comparación vs LY)
Δrel  = (real - base) / |base|          (si base == 0 o null → "—", tono 'na')
favorable = (goodWhen === 'higher') ? (Δabs >= 0) : (Δabs <= 0)
```
- Tasas (ocupación, %línea, márgenes): se reportan en **puntos porcentuales (pp)**,
  `mode: 'pp'`, usando `Δabs` directo (no `Δrel`). El resto en **%** (`Δrel`).

### 5.2 Tono (semáforo)
```
si base inválida           → 'na'   (badge '—', color --muted)
si |Δrel| <= band          → 'warn' (en línea; band def. 0.05; tasas 0.03)
si favorable               → 'pos'
si no                      → 'neg'
```
La misma regla la usan `StatusBadge`, `KpiHero`, `InsightChip` y `HeaderInsight`,
así "verde = sobre plan, rojo = bajo plan" se aprende una vez y aplica a todo.

### 5.3 Plantillas de frase (español, deterministas)
- **Verbo por signo y banda:** `favorable && !warn → "sobre"`,
  `!favorable && !warn → "bajo"`, `warn → "en línea con"`.
- **InsightChip (1 métrica):**
  `"{Label} {valor}, {±Δ} {pct|pp} {sobre|bajo|en línea con} Ppto"`
  → *"EBITDA 3.180 UF, −23% bajo Ppto"* · *"Ocupación 97,9%, +0,9 pp sobre Ppto"*.
- **vs LY (sub-línea hero):** `"vs LY {±Δ}"` con `fmtPct`/pp; sin tono propio
  (informativo), sirve para la pregunta "¿mejor que antes?".

### 5.4 Titular del veredicto (`buildVerdict`)
1. Calcular `buildInsight` para cada métrica de la config de la unidad.
2. **KPI ancla**: la métrica marcada `anchor: true` (EBITDA/Resultado). Su tono y
   `Δ` definen el `tone` y el cuerpo del titular:
   `"{Period} cerró {|Δ%|}% {sobre|bajo} presupuesto en {Ancla}"`.
3. **Causa** (`detail`): de las métricas restantes, tomar la de mayor `|Δrel|`
   **desfavorable** → `"Principalmente por {menores|mayores} {Causa} ({±Δ%} vs Ppto)."`.
   Si no hay desfavorables relevantes y el ancla es `pos`:
   `"Mejor que el plan, impulsado por {mejor métrica}."`.
4. **Fallbacks:** sin dato del mes → `"Datos del mes en proceso."`; ancla sin ppto →
   degradar a la métrica con ppto de mayor desviación.

### 5.5 Configuración por unidad (manual, 1 array por dashboard)
Cada dashboard declara su lista de métricas hero con `{ label, table, col, agg,
fmt, goodWhen, mode, anchor? }` — igual que hoy declara `MONTHLY`/`CARDS`.
Ejemplos de `goodWhen: 'lower'`: Costos, Gastos, Deuda, Saldo, Necesidad de caja.

---

## 6. Plan de aplicación

### Piloto recomendado: **OLÁ Hotel**
Razones: ya tiene Real / Ppto / LY / YTD limpios (`hotel_real`, `hotel_ppto`,
`hotel_full` con columnas `…LY` y `… YTD` precalculadas), KPIs claros (Ingresos,
EBITDA, Ocupación, ADR) y `MONTHLY`/`LINES` ya alimentan series mensuales vía
`groupByPeriod()` → sparklines directos. Es la unidad donde el "veredicto + hero"
se ve más natural.

**Pasos del piloto (1-2 días sistema base + ~0,5 día Hotel):**
1. `insight.ts`: `buildInsight` + `buildVerdict` + tipos `Metric`. Tests de tono y
   plantillas con casos reales (EBITDA −23%, costos bajo ppto → verde, ocupación pp).
2. Componentes: `StatusBadge`, `Sparkline`, `KpiHero`, `HeaderInsight`,
   `SectionIntro`, `InsightChip`, `CollapsibleSection` + clases CSS nuevas
   (`.verdict`, `.kpi-hero`, `.spark`, `.delta`, `.section-intro`, `.collapsible`)
   y el token `--warn`.
3. En `HotelDashboard`: declarar `HERO` (array de `Metric` con `anchor` en EBITDA),
   reemplazar la 1ª fila por `HeaderInsight` + fila de `KpiHero`, anteceder los
   bloques de charts con `SectionIntro` + `InsightChip`, y envolver
   `IndicatorTableMY` (+ futuras tablas) en `CollapsibleSection`.

### Orden de roll-out
1. **Hotel** (piloto, datos más limpios).
2. **ICEMM** — Real/Ppto/LY por Nivel1; derivar 3-4 KPIs hero (Ingresos,
   Resultado Op., EBITDA) reutilizando la lógica de combos; P&L al colapsable.
3. **USA** — estructura Real/Ppto/LY análoga a Hotel.
4. **RR** (Multifamily/LAR) — `real_ppto_ly` ya disponible.
5. **DV** — última: métricas acumuladas sin Ppto mensual claro; `InsightChip`
   debe degradar a "sin presupuesto comparable" cuando `ppto == null`, y el
   veredicto se ancla en avance de ventas/construcción (gauges existentes).

**Migración incremental y de bajo riesgo:** se aplica unidad por unidad; el resto
del dashboard sigue funcionando. Nulos manejados por `fmt`/`StatusBadge` (`—`) y
por `buildVerdict` (omite métricas sin ppto). No se toca backend ni la
reconciliación 1:1 con el `.pbix`.

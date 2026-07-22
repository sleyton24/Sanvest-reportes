# Civitas (Atémpora): mapeo FC → `eerr_civitas`

**Objetivo:** transformar el Excel de Flujo de Caja (FC) de Civitas en el "EERR de la operación de
ARRIENDO" (eliminando ingresos y costos por ventas), para alimentar la tabla plana `eerr_civitas`
que consume el dashboard.

- **FUENTE:** `Ejemplos para subir/Civitas/FC Civitas_Modelo Venta Retail 2026_05 vF3.xlsx`
- **DESTINO de referencia (armado a mano):** `Formatos para reportes PBI/CIVITAS.xlsx`
  (hojas `EERR CIVITAS`, `EERR Arriendo`, `Base EERR Arriendo`)
- **Tabla destino (ya existe en dev):** `eerr_civitas`
  columnas = `Nivel 2 , Nivel 1 , Monto, ppto, Fecha , año , mes , fechaID, Indice , YTD Real, YTD PPTO`
  (528 filas = 24 meses × 22 rubros, 202501…202612).

---

## 0. Conclusión principal (TL;DR)

**Caso = PREBUILT.** No hay que mapear cuentas del Mayor ni del Plan de cuentas. El FC ya contiene
un **Estado de Resultados en UF por mes, completo y con los 22 rubros exactos** del EERR, en la hoja
**`CIVITAS_mensual`, filas 152–189**. Basta leer ese bloque, hacer melt a formato largo, poner en 0
las líneas de venta y calcular YTD/Indice.

**Reproducción numérica:** para 202501 el bloque UF del FC reproduce `eerr_civitas` **exactamente
(diff = 0.0 en los 22 rubros)** una vez puestas en 0 las 3 líneas que el armado manual anula
(Promesa Compra Venta, Costo Venta Activo, Corrección monetaria). Ver §7.

**Advertencia sobre PPTO:** un FC mensual trae **una sola serie** (Real = actuals de meses cerrados +
proyección de meses abiertos). **No** trae un presupuesto congelado por separado. El `ppto` del
dashboard proviene de un baseline (snapshot de presupuesto) que hay que conservar aparte. Ver §2–§3.

---

## 1. Dónde está el EERR en el FC (hoja + rango exacto)

Hoja **`CIVITAS_mensual`** (241 filas × 65 cols). Contiene, apiladas verticalmente:

| Bloque | Filas | Unidad | Uso |
|---|---|---|---|
| BALANCE | 9–55 | M$ | no |
| **ESTADO DE RESULTADOS (M$)** | 57–90 | M$ | fuente de M$ (con código de cuenta en col A) |
| FLUJO DE CAJA (M$) | 93–146 | M$ | no (contiene líneas venta, informativo) |
| **Valor UF** | **148** | CLP/UF | **divisor de conversión M$→UF** |
| **ESTADO DE RESULTADOS (UF)** | **152–189** | **UF** | **FUENTE DIRECTA del EERR (prebuilt)** |
| FLUJO DE CAJA (UF) | 192–236 | UF | no |

**El bloque a leer es el EERR (UF), filas 152–189.** Está pre-calculado: cada celda = M$ ÷ (Valor UF/1000).
Ver §4. Los labels de rubro están en la **columna C**.

### Layout de columnas (meses) — común a toda la hoja

La fila **7** tiene la fecha de cada columna. La fila 3 tiene el índice de mes (0 = columna anual del año).

| Año | Ene | … | Dic | Col anual |
|---|---|---|---|---|
| 2024 | H | … | S | T |
| **2025** | **U** | … | **AF** | AG |
| **2026** | **AH** | … | **AS** | (no hay) |
| 2027 | AT | … | BE | — |

Regla práctica: `col(2025, m) = U + (m-1)`; `col(2026, m) = AH + (m-1)`.
(Ojo: entre bloques anuales hay una columna de total anual — T para 2024, AG para 2025 — que hay que saltar.
Para 2026 no existe columna anual, va directo AS→AT.)

---

## 2. Real vs Proyección/PPTO — dónde está cada uno

**Dentro de un FC hay una sola serie mensual** (el bloque UF, filas 152–189). Para meses cerrados esa
columna es el **Real (actuals)**; para meses futuros es la **proyección** del modelo. No hay una segunda
columna de presupuesto congelado.

Evidencia (cómo el armado manual construyó Real vs PPTO en `EERR Arriendo`, formato ancho):

- **PPTO** = primer bloque de columnas → 2025 en `D:O`, 2026 en `U:AF`. (Presupuesto original congelado.)
- **Real** = segundo bloque, pegado al cerrar cada mes → 2025 Sep–Dic en `P:S`, 2026 Ene/Feb/Mar en `T/AG/AH`.
- Meses sin segundo bloque (2025 Ene–Ago, 2026 Abr–Dic) → `Real = PPTO`.

Verificado en `EERR CIVITAS` 202509: `Monto (Real)` = columna `P` del ancho; `ppto` = columna `L`. Exacto.

**Patrón de divergencia Real≠PPTO en `eerr_civitas`** (filas donde `Monto ≠ ppto`):

| fechaID | filas con Real≠PPTO |
|---|---|
| 202501–202508 | 0 (Real = PPTO) |
| 202509–202512 | 15–16 de 22 |
| 202601–202603 | 14–15 de 22 |
| 202604–202612 | 0 — **y además Monto/ppto vienen VACÍOS** (placeholders; el manual solo tenía datos hasta 202603) |

Conclusión: el presupuesto (PPTO) es un **dato aparte del actual**, no derivable de un único FC mensual.

---

## 3. De dónde sacar Real y PPTO en el ETL

- **Real (`Monto`)** → del FC actual, bloque UF (filas 152–189), columna del mes, con ventas eliminadas.
  Un solo archivo mensual basta.
- **PPTO (`ppto`)** → **no** sale del FC mensual corriente. Opciones para el ETL:
  1. **Baseline congelado (recomendado):** cargar una vez el FC de presupuesto del año (p. ej. el
     primer FC del año o un "vF_ppto") y guardar su bloque UF como `ppto` de los 12 meses. Luego los
     cargues mensuales solo hacen upsert de `Monto` (Real) preservando `ppto`.
  2. **PPTO := Real** (para arrancar): variance = 0, pipeline funciona, pero el análisis de desvío queda plano.
  3. Persistir `ppto` en la tabla por `(fechaID, rubro)` y que `connect_atempora` solo actualice `Monto`.

> Nota honesta: los números del FC vF3 (mayo-2026) **no** coinciden 1:1 con los del `eerr_civitas`
> manual en varios meses de 2025 (ver §7), porque el FC es un modelo vivo que **restata** meses ya
> cerrados entre versiones. El armado manual tomó snapshots de FC de distintas fechas. La lógica de
> transformación es correcta; las diferencias son de **vintage** del dato, no de mapeo.

---

## 4. Conversión M$ → UF (fórmula exacta)

El EERR final está en UF. El FC guarda el EERR tanto en M$ (filas 57–90) como en UF (152–189).

```
UF_rubro(mes) = M$_rubro(mes) * 1000 / ValorUF(mes)
```

donde `ValorUF(mes)` = fila **148** de `CIVITAS_mensual`, misma columna del mes (CLP por UF; M$ = miles de pesos).

Verificado 202501 (col U, ValorUF = 38 384,41):
- Honorarios: M$ = −9 424,679 → −9 424,679 × 1000 / 38 384,41 = **−245,5340332181737** ✓
- Oficina: M$ = 51 666,565 → **1 346,0299376752175** ✓

**El bloque UF (152–189) ya trae ese resultado pre-calculado**, así que el ETL puede leerlo directo
sin recalcular. (La fórmula queda documentada por si se prefiere leer M$ + convertir.)

---

## 5. Líneas de VENTA a eliminar (ubicación exacta en el FC)

Para el "EERR de arriendo" se anulan (poner en 0 o excluir) estas líneas:

| Línea | En EERR (UF) fila | En EERR (M$) fila | Cuenta | Nota |
|---|---|---|---|---|
| **Promesa Compra Venta** | **163** | 64 | 5107 | ingreso por venta — el usuario pidió eliminar |
| **Costo Venta Activo** | **166** | 67 | 4100 | costo por venta — el usuario pidió eliminar |
| *Ventas* | 157 | 58 | 5101 | venta del activo; **no** está entre los 22 rubros del destino (ya excluida) |
| *(Corrección monetaria)* | 184 | 85 | 4500 | **el armado manual la anula a 0** en todo 2025; es Idx3 (fuera de NOI). No la pidió el usuario, pero para calzar 1:1 con el manual hay que ponerla en 0 |

Además, en `CIVITAS_mensual` FLUJO (M$ filas 96/97, UF filas 195/196) y en la hoja **`Análisis FC`**
(filas 4 y 5) aparecen las líneas de flujo **"(-) Venta Activo"** y **"(+) Costo venta activo"** — son
del flujo de caja, no del EERR; solo confirman que el modelo vende activos (por eso `Costo Venta Activo`
viene poblado en el FC vF3, p. ej. 202504 = −23 869 UF, 202506 = −9 942 UF).

**En el FC vF3 estas líneas SÍ vienen con valores** (a diferencia del manual, que las tiene en 0) →
la eliminación es un paso **necesario** del ETL, no cosmético.

---

## 6. Crosswalk de los 22 rubros → origen en el FC

Orden fijo por mes en `eerr_civitas` (mismo orden en el bloque UF del FC). `Indice`: 1=Ingresos,
2=Gastos Operacionales, 3=Otros gastos. Los gastos van con **signo negativo** (ya vienen negativos en el FC).

| # | Nivel 2 (macro) | Nivel 1 (rubro destino) | Indice | Fila UF (152–189) | Fila M$ (57–90) | Cuenta | Eliminar |
|---|---|---|---|---|---|---|---|
| 1 | Ingresos | Ingresos por Arriendo Oficina | 1 | 158 | 59 | 5102 | |
| 2 | Ingresos | Ingresos por Arriendo Local Comercial | 1 | 159 | 60 | 5103 | |
| 3 | Ingresos | Ingresos por Arriendo Estacionamiento | 1 | 160 | 61 | 5104 | |
| 4 | Ingresos | Ingresos por Arriendo Bodega | 1 | 161 | 62 | 5105 | |
| 5 | Ingresos | Ingresos por Reserva Inicial | 1 | 162 | 63 | 5106 | |
| 6 | Ingresos | **Promesa Compra Venta** | 1 | 163 | 64 | 5107 | **SÍ** |
| 7 | Ingresos | Otros ingresos | 1 | 164 | 65 | 5108 | |
| 8 | Gastos Operacionales | **Costo Venta Activo** | 2 | 166 | 67 | 4100 | **SÍ** |
| 9 | Gastos Operacionales | Honorarios | 2 | 167 | 68 | 4101 | |
| 10 | Gastos Operacionales | Corretaje | 2 | 168 | 69 | 4102 | |
| 11 | Gastos Operacionales | Marketing | 2 | 169 | 70 | 4103 | |
| 12 | Gastos Operacionales | Luz y Agua | 2 | 170 | 71 | 4104 | |
| 13 | Gastos Operacionales | Gastos comunes | 2 | 171 | 72 | 4105 | |
| 14 | Gastos Operacionales | Seguros | 2 | 172 | 73 | 4106 | |
| 15 | Gastos Operacionales | Gastos Generales | 2 | 173 | 74 | 4107 | |
| 16 | Gastos Operacionales | Contribuciones | 2 | 174 | 75 | 4108 | |
| 17 | Gastos Operacionales | Patentes | 2 | 175 | 76 | 4109 | |
| 18 | Gastos Operacionales | IVA no recuperable | 2 | 176 | 77 | 4110 | |
| 19 | Otros gastos | Gastos financieros | 3 | 181 | 82 | 4400 | |
| 20 | Otros gastos | Intereses pagados | 3 | 182 | 83 | 4410 | *(en M$ el label es "Intereses financieros")* |
| 21 | Otros gastos | Diferencia de cambio | 3 | 183 | 84 | 4540 | |
| 22 | Otros gastos | Corrección monetaria | 3 | 184 | 85 | 4500 | (el manual la anula, ver §5) |

Filas de subtotal que **NO** van a la tabla plana: 153–155 (resúmenes), 157 (Ventas), 178
(Resultado Operacional), 180/185 (Resultado no operacional), 187–189 (RAI / impuesto / resultado ejercicio).
El dashboard solo llega hasta **NOI = Ingresos (Idx1) + Gastos Operacionales (Idx2)**; los Otros gastos
(Idx3) pueden cargarse igual pero no son el foco.

---

## 7. Reproducción numérica de un mes (evidencia)

Mes elegido: **202501** (existe en `eerr_civitas` con Real = PPTO). Fuente FC = `CIVITAS_mensual` col **U**,
bloque UF. "Aplicado" = valor FC salvo líneas eliminadas (163/166/184) que se ponen en 0.

| # | Nivel2 | Rubro | Fila FC | FC UF (col U) | Elim | `eerr_civitas` Monto | diff |
|---|---|---|---|---|---|---|---|
| 1 | Ingresos | Ingresos por Arriendo Oficina | 158 | 1346.029938 | | 1346.029938 | 0.0 |
| 2 | Ingresos | Ingresos por Arriendo Local Comercial | 159 | 282.645741 | | 282.645741 | 0.0 |
| 3 | Ingresos | Ingresos por Arriendo Estacionamiento | 160 | 382.421197 | | 382.421197 | 0.0 |
| 4 | Ingresos | Ingresos por Arriendo Bodega | 161 | 68.953203 | | 68.953203 | 0.0 |
| 5 | Ingresos | Ingresos por Reserva Inicial | 162 | 0.0 | | 0.0 | 0.0 |
| 6 | Ingresos | Promesa Compra Venta | 163 | 0.0 | SÍ | 0.0 | 0.0 |
| 7 | Ingresos | Otros ingresos | 164 | 446.936790 | | 446.936790 | 0.0 |
| 8 | Gastos Op | Costo Venta Activo | 166 | 0.0 | SÍ | 0.0 | 0.0 |
| 9 | Gastos Op | Honorarios | 167 | -245.534033 | | -245.534033 | 0.0 |
| 10 | Gastos Op | Corretaje | 168 | -79.251655 | | -79.251655 | 0.0 |
| 11 | Gastos Op | Marketing | 169 | -53.323315 | | -53.323315 | 0.0 |
| 12 | Gastos Op | Luz y Agua | 170 | -231.174401 | | -231.174401 | 0.0 |
| 13 | Gastos Op | Gastos comunes | 171 | -508.791720 | | -508.791720 | 0.0 |
| 14 | Gastos Op | Seguros | 172 | 0.0 | | 0.0 | 0.0 |
| 15 | Gastos Op | Gastos Generales | 173 | -10.243065 | | -10.243065 | 0.0 |
| 16 | Gastos Op | Contribuciones | 174 | 0.0 | | 0.0 | 0.0 |
| 17 | Gastos Op | Patentes | 175 | 0.0 | | 0.0 | 0.0 |
| 18 | Gastos Op | IVA no recuperable | 176 | -17.002684 | | -17.002684 | 0.0 |
| 19 | Otros gastos | Gastos financieros | 181 | -0.018028 | | -0.018028 | 0.0 |
| 20 | Otros gastos | Intereses pagados | 182 | -2074.780699 | | -2074.780699 | 0.0 |
| 21 | Otros gastos | Diferencia de cambio | 183 | 0.0 | | 0.0 | 0.0 |
| 22 | Otros gastos | Corrección monetaria | 184 | -0.121169 | SÍ | 0.0 | 0.0 |

**Resultado: diff = 0.0 en los 22 rubros.** 202502 idem (diff 0.0). Es una reproducción **exacta**.

### Meses con diferencia (vintage), no error de mapeo

Para 202505/07/08 aparecen diffs de ~100–250 UF en rubros sueltos (p. ej. Honorarios 202508:
FC = −243,76 vs manual = 0; Oficina 202504: FC = 1666,80 vs manual = 1397,88). Son **restatements**
del modelo vivo entre la versión que usó el armado manual y esta vF3. La estructura, el mapeo y la
fórmula UF son correctos; el dato de origen cambió de versión.

Diffs grandes (10.000–30.000 UF) en 202503/04/06 = exactamente las líneas **Costo Venta Activo** y
**Corrección monetaria**, que el FC vF3 trae pobladas y el manual anula → confirma la necesidad de la
eliminación (§5).

---

## 8. YTD y Indice

- **Indice**: 1 = Ingresos, 2 = Gastos Operacionales, 3 = Otros gastos (constante por rubro, ver §6).
- **YTD Real / YTD PPTO**: suma acumulada **dentro del año**, reiniciando en enero, por rubro.
  `YTD_Real(rubro, mes) = Σ Monto(rubro, ene..mes)` del mismo año. Idem `YTD PPTO` sobre `ppto`.
  Verificado: Oficina 202502 → YTD Real = 2 813,821 = 1 346,030 (ene) + 1 467,791 (feb). ✓
  Corretaje 202502 → Real = 0 pero YTD Real = −79,252 (arrastra enero). ✓
- **Fecha / año / mes / fechaID**: `Fecha` = primer día del mes; `año`, `mes` enteros;
  `fechaID` = string `'AAAAMM'` (**ojo:** en el archivo manual 202601 quedó como int, pero el estándar
  es string — normalizar a string en el ETL).

---

## 9. Receta para `connect_atempora.py` (resumen operativo)

1. Abrir el FC, hoja `CIVITAS_mensual`. Leer `ValorUF` (fila 148) y las fechas de meses (fila 7) por columna.
2. Para cada mes objetivo (columnas de 2025 = U…AF, 2026 = AH…AS; saltar columnas de total anual):
   leer el bloque UF (filas 158–184 según crosswalk §6) → 22 rubros.
   (Alternativa: leer M$ filas 59–85 y convertir con la fórmula §4; da idéntico.)
3. **Eliminar ventas**: poner en 0 `Promesa Compra Venta` (163) y `Costo Venta Activo` (166).
   (Opcional, para calzar con el manual: `Corrección monetaria` (184) → 0.)
4. Melt a formato largo con columnas `Nivel 2 , Nivel 1 , Monto, Fecha , año , mes , fechaID, Indice`.
5. `ppto`: según §3 (baseline congelado / preservar en tabla / o = Monto para arrancar).
6. Calcular `YTD Real` y `YTD PPTO` (acumulado anual por rubro, §8).
7. Upsert en `eerr_civitas` por `(fechaID, Nivel 1)` (PostgreSQL prod / SQLite dev).
8. El dashboard grafica hasta NOI (Idx 1 + 2). Idx 3 se carga pero no es foco.

**Cuentas de referencia (Plan de cta softland):** ingresos 5101–5108, costos/gastos op 4100–4110,
no operacionales 4400/4410/4540/4500, impuesto 4700. No se necesitan para el prebuilt, pero sirven si
alguna vez hay que reconstruir el EERR desde el Mayor.

# Manual de carga — Reportes Sanvest BI

Guía práctica para actualizar los dashboards subiendo los archivos Excel del mes.
Cada unidad de negocio tiene su propio botón de carga dentro de su dashboard.

> **Importante — abre la app en el puerto correcto**
> La aplicación corre en **http://localhost:5176**.
> En esta máquina los puertos **:5173** y **:8000** los ocupa *otro* proyecto — si abres
> esos verás una app distinta o desactualizada. Usa siempre **:5176** y, si acabas de
> actualizar, recarga con **Ctrl + Shift + R**.
> (API interna: :8077. No necesitas abrirla; el front la consume sola vía proxy.)

---

## 1. Las dos formas de cargar

La plataforma tiene **dos mecanismos** de carga. Cada unidad usa el que corresponde a
cómo llega su información:

| Mecanismo | Botón | Qué hace | Borra histórico |
|---|---|---|---|
| **Informe mensual** | "⬆ Cargar Informe…" | Toma los informes del mes, los transforma (despivot, YTD, LY) y hace **UPSERT** (agrega/actualiza el mes, conserva los años anteriores). Detecta el activo por el **nombre del archivo**. | **No** — acumula histórico |
| **Reemplazo completo** | "⬆ Cargar Excel" | Sube el Excel **completo** de la unidad (el "formato"), valida la estructura y **reescribe** todas las tablas. | **Sí** — reemplaza todo |

Regla rápida: si actualizas **mes a mes** con informes operativos → *Informe mensual*.
Si mantienes un único Excel maestro que se edita y vuelves a subir entero → *Reemplazo completo*.

---

## 2. Qué carga cada unidad

| Unidad (menú) | Mecanismo | Archivo(s) a subir | Detección |
|---|---|---|---|
| **Desarrollo para la Venta** (DV) | Informe mensual (varios archivos juntos) **o** Reemplazo | ver §3.1 | por nombre |
| **Renta Residencial** (RR · LAR) | Informe mensual | Informe SOHO, Informe PARK, Informe LAR GROUP | por nombre |
| **OLÁ Hotel** | Informe mensual | CCPP OLÁ Providencia | único |
| **USA** | Informe mensual | Budget Comparison por propiedad + KPIs | por nombre |
| **Construcción** (ICEMM) | Informe mensual | Informe ICEMM (gestión + flujo) | único |
| **Atémpora** (Civitas) | Reemplazo completo | CIVITAS.xlsx | — |
| **Estados Financieros** (Grupo) | Reemplazo completo | Base balance.xlsx | — |

La **detección por nombre** significa que el sistema mira el nombre del archivo para saber
qué activo es. Por eso **no renombres** los archivos de forma que pierdan la palabra clave
(SOHO, PARK, rentabilidad, etc.). Puedes subir varios a la vez.

---

## 3. Detalle por unidad

### 3.1 Desarrollo para la Venta (DV)

Botón **"⬆ Cargar Informes de Ventas"** (mensual, multi-archivo). Sube **juntos** los
informes del mes; el sistema los clasifica por el nombre:

| Si el nombre contiene… | Se interpreta como | Obligatorio |
|---|---|---|
| `rentabilidad` | Rentabilidad Inversiones Proyectos | **Sí** |
| `estad` (estadística) | Estadística de ventas | opcional |
| `mensual` | Informe Mensual | opcional |
| `escrituraci` + `millalongo`/`mi.72`/`mi 72` | Escrituración — Millalongo | opcional |
| `escrituraci` + `victoria 99`/`sv.99`/` 99` | Escrituración — Sta. Victoria 99 | opcional |
| `escrituraci` + `victoria 155`/`sv.155`/`155` | Escrituración — Sta. Victoria 155 | opcional |

- Si falta el de **Rentabilidad**, la carga se rechaza (error 422).
- Notas de negocio:
  - **Sta. Victoria 99**: ya vendida al 100 %; solo cambian los gastos. No esperes nuevas ventas.
  - **Sta. Victoria 155**: en preventa; mantiene la misma lógica que Millalongo (aún sin escrituración).
  - La **línea de crédito** es el único dato 100 % manual.
- Alternativa: el botón **"⬆ Cargar Excel"** sube el formato maestro completo de DV
  (reemplazo) si prefieres reconstruir todo desde un solo archivo.

### 3.2 Renta Residencial — LAR Group (RR)

Botón **"⬆ Cargar Informe"** (mensual, multi-archivo). Detecta por nombre:

| Si el nombre contiene… | Activo |
|---|---|
| `soho` | SOHO |
| `park` | PARK |
| `lar group` (sin "soho" ni "park") | Holding LAR GROUP consolidado |

Puedes subir SOHO, PARK y el consolidado LAR GROUP a la vez, o de a uno.
El holding LAR alimenta su propia página (como en el Power BI). Si un nombre no contiene
ninguna de esas palabras, se rechaza con un mensaje claro.

### 3.3 OLÁ Hotel

Botón **"⬆ Cargar CCPP"** (mensual). Sube el **CCPP de OLÁ Providencia** del mes.
Hace UPSERT con histórico y recalcula los indicadores.

### 3.4 USA

Botón **"⬆ Cargar Informe Yardi"** (mensual, multi-archivo). Por cada archivo:

| Si el nombre contiene… | Se procesa como |
|---|---|
| `kpis` | KPIs USA |
| (cualquier otro Budget Comparison) | Yardi → P&L homologado (Bemiston / MILA / St Grand) |

Sube los Budget Comparison por propiedad y, si aplica, el de KPIs.

### 3.5 Construcción — ICEMM

Botón **"⬆ Cargar Informe ICEMM"** (mensual). Sube el **Informe ICEMM** crudo. El sistema:

- Despivota la hoja **INFORME GESTIÓN \<año\>** → tabla `icemm_mensual` (FY / YTD / YTG).
- Despivota la hoja **Flujo de Caja** → tabla `flujo` (el pivot de Flujo de Caja del dashboard).
- UPSERT por categoría + mes (conserva meses anteriores).

> El **Flujo de Caja** aparece en el dashboard ICEMM entre las tablas de Indicadores
> (FY/YTD/YTG) y los gráficos combinados.

### 3.6 Atémpora (Civitas)

Botón **"⬆ Cargar Excel"** (reemplazo completo). Sube el **CIVITAS.xlsx** completo.
Valida la estructura y reescribe las 7 tablas (EERR, KPIs, deuda, arriendos, morosidad,
ventas). Si la estructura no calza, la carga se rechaza (422) y **no** modifica nada.

### 3.7 Estados Financieros — Grupo

Botón **"⬆ Cargar Excel"** (reemplazo completo). Sube **Base balance.xlsx** completo.
Reescribe Balance, EERR del grupo y cascada. Slicer por trimestre.

---

## 4. Paso a paso (cualquier unidad)

1. Abre **http://localhost:5176** y entra a la unidad (desde el menú o la barra superior).
2. En la cabecera del dashboard, pulsa el botón de carga (**"⬆ Cargar …"**).
3. Selecciona el/los archivo(s) `.xlsx`/`.xlsm`. En las unidades multi-archivo puedes
   seleccionar varios a la vez (Ctrl/Shift al elegir).
4. El botón muestra **"Procesando…"**. Al terminar:
   - **✓ verde** con el resumen (`tabla N↻/M+` = N filas actualizadas / M insertadas), o
   - **✗ rojo** con el motivo si algo falló.
5. El dashboard se **refresca solo** con los datos nuevos.

---

## 5. Qué esperar tras cargar

- **Informe mensual (UPSERT):** el mes nuevo se agrega o se actualiza; los años/meses
  anteriores **se conservan**. Volver a subir el mismo archivo es idempotente (no duplica).
- **Reemplazo completo:** las tablas de esa unidad se **reescriben** con lo que trae el
  Excel. Si la validación falla, **no** se toca nada (la carga es todo-o-nada).

---

## 6. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| No veo "Estados Financieros" / el Flujo de ICEMM / cambios recientes | Pestaña vieja o puerto equivocado | Abre **:5176** y recarga con **Ctrl + Shift + R** |
| Veo una app distinta | Abriste **:5173** o **:8000** (otro proyecto) | Usa **:5176** |
| "Falta el archivo 'Rentabilidad…'" (DV) | No incluiste el de Rentabilidad | Agrégalo a la selección |
| "No reconozco '…'" (RR) | El nombre no contiene SOHO / PARK / LAR GROUP | Renombra conservando la palabra clave |
| "El Excel no cumple la estructura esperada" (422) | Faltan hojas/columnas en el formato | Revisa contra **"Estructura esperada"** de la unidad; no se cargó nada |
| El activo cargó en el lugar equivocado | El nombre del archivo confundió la detección | Renombra para que solo contenga la palabra clave correcta |
| ✗ rojo con error de procesamiento | El archivo del mes cambió de formato | Compara con el del mes anterior que sí cargó |

---

## 7. Referencia rápida (archivos "formato" maestros)

Ubicación de los formatos base (para reemplazo completo / referencia de estructura):
`Formatos para reportes PBI/`

| Unidad | Archivo formato |
|---|---|
| DV | `Desarrollo para la venta.xlsx` |
| RR | `Renta Residencial .xlsx` |
| Hotel | `BD HOTEL .xlsx` |
| USA | `BD Gestion USA .xlsx` |
| ICEMM | `ICEMM.xlsx` |
| Atémpora | `CIVITAS.xlsx` |
| Grupo | `Base balance.xlsx` |

> Los datos están reconciliados 1:1 contra el `.pbix` original (ver `docs/`). La carga
> mensual mantiene la app al día sin tocar el modelo.

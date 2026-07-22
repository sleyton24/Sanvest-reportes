# Civitas (Atémpora): mapeo Morosidad → tabla `morosidad`

**Objetivo:** cargar el Reporte de Morosidad de Civitas en la tabla plana `morosidad` (BD dev)
manteniendo las columnas exactas que el dashboard ya consume, para que el "Cuadro de Morosidad"
siga saliendo **segmentado por tramo de mora**.

- **FUENTE:** `Ejemplos para subir/Civitas/Reporte_de_morosidad_Civitas_10-07-2026.xlsx`
- **TABLA DESTINO (ya existe en dev):** `morosidad`
- **CONSUMO (front):** `frontend/src/pages/AtemporaDashboard.tsx:360`
  `<PivotTable rowField="}" colField="Clasif" valueField="SALDO PENDIENTE" ...>`
  → filas = cliente, columnas = tramo, valor = CLP. **No tocar el front.**

---

## 0. TL;DR

- El Excel trae **1 hoja** (`Reporte 10-07-2026`), un detalle **factura por factura** (no viene el
  tramo). El tramo (`Clasif`) es **derivado**: banda de días de mora entre la fecha de emisión y la
  fecha de corte del reporte.
- Caso = **DERIVED**: se lee el detalle, se filtra el saldo > 0 y la fila TOTAL, se calcula
  `Columna2` (días de mora) y de ahí `Clasif`. Cada fila-factura = una fila en `morosidad`.
- **Reconciliación exacta:** suma de `SALDO PENDIENTE` = **75.972.562** = `TOTAL GENERAL` del Excel.
- Hay que **renombrar la columna cliente a `}`** en el destino (así se llama hoy la columna que el
  front usa como `rowField`); es un artefacto del Power Query original, se conserva para no tocar UI.

---

## 1. Fuente (hoja + layout)

Hoja única **`Reporte 10-07-2026`** (43 filas × 9 cols).
- Fila 0: título. Fila 1: **`Actualizado al 10/07/2026`** ← fecha de corte (parsear de aquí).
- Fila 3: cabeceras. Filas 4–40: **detalle** (37 facturas con saldo > 0).
- Fila 41: vacía. Fila 42: `TOTAL GENERAL` (solo para reconciliar; **excluir** de la carga).

Cabeceras fila 3 (con mojibake latin-1 en el crudo):
`RUT | CLIENTE | N° FACTURA | F. EMISIÓN | MONTO FACTURA | MONTO PAGADO | SALDO PENDIENTE | DESCRIPCIÓN | COMENTARIO`

---

## 2. Mapeo columna Excel → columna destino

| Destino (`morosidad`) | Tipo | Origen Excel | Regla |
|---|---|---|---|
| `}` | TEXT | `CLIENTE` | copia literal (nombre razón social). Renombrar a `}`. |
| `SALDO PENDIENTE` | FLOAT | `SALDO PENDIENTE` | CLP (**no UF**). Cargar solo filas con saldo > 0. |
| `F. EMISION` | TEXT | `F. EMISIÓN` | string `dd-mm-yyyy` tal cual (sin acento en el nombre destino). |
| `Columna1` | DATETIME | *(fila 1 "Actualizado al")* | fecha de corte del reporte = `2026-07-10 00:00:00`. Igual para todas las filas. |
| `Columna2` | BIGINT | derivado | días de mora = `(Columna1 − F. EMISIÓN).days`. |
| `Clasif` | TEXT | derivado | banda de `Columna2` (ver §3). |

Columnas del Excel que **no se cargan:** `RUT`, `N° FACTURA`, `MONTO FACTURA`, `MONTO PAGADO`,
`DESCRIPCIÓN`, `COMENTARIO` (la tabla destino no las tiene; el front no las usa).

---

## 3. Lógica del tramo (`Clasif`)

Aging medido desde **`F. EMISIÓN`** hasta la **fecha de corte** (`Columna1`). El Excel no trae fecha
de vencimiento, así que se usa la emisión como proxy (idéntico a la carga previa de mayo, verificado:
16-04→corte 19-05 = 33 días → `[30-60[`; 09-09-2025 = 252 días → `90+`).

`Columna2 = días`; notación de intervalo semiabierta `[a-b[` (a inclusive, b exclusive):

| días de mora | `Clasif` |
|---|---|
| `0 ≤ d < 30`  | `[0-30[` |
| `30 ≤ d < 60` | `[30-60[` |
| `60 ≤ d < 90` | `[60-90[` |
| `d ≥ 90`      | `90+` |

```python
def band(d):
    if d < 30:  return "[0-30["
    if d < 60:  return "[30-60["
    if d < 90:  return "[60-90["
    return "90+"
```

Valores exactos de `Clasif` (deben calzar con lo ya cargado): `[0-30[`, `[30-60[`, `[60-90[`, `90+`.

---

## 4. Reconciliación (corte 10-07-2026)

37 facturas, suma total = **75.972.562** (= TOTAL GENERAL). Desglose por tramo:

| `Clasif` | n facturas | Σ SALDO PENDIENTE (CLP) |
|---|---|---|
| `[0-30[`  | 14 | 25.733.215 |
| `[30-60[` | 10 | 28.401.805 |
| `[60-90[` |  6 |  9.654.684 |
| `90+`     |  7 | 12.182.858 |
| **Total** | 37 | **75.972.562** |

---

## 5. Notas de implementación

- La carga es **full-refresh** de la tabla `morosidad` (una foto por corte); no acumular cortes:
  `Columna1` es constante en toda la tabla e identifica el corte vigente.
- Encoding: leer con `openpyxl data_only=True`; los mojibake (`�`) están en texto de cabecera y
  descripción, no afectan las columnas que se cargan.
- El pivote del front totaliza `SALDO PENDIENTE` por (cliente × tramo); ningún renombre adicional es
  necesario más allá de dejar la columna cliente como `}` y el tramo como `Clasif`.

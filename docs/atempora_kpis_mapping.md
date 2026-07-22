# Spec de extracción — `kpis_atempora` (Civitas / Atémpora)

## Fuente
- Archivo: `Ejemplos para subir/Civitas/01. Atempora (7).xlsx`
- Hoja: **`Estado actual`**
- Carga: `openpyxl.load_workbook(path, data_only=True, read_only=False)`
  (NO `read_only=True`: las dimensiones vienen vacías/erróneas y hay que leer por celda).
- La hoja es **un solo punto** = snapshot del mes indicado en `Estado actual!F9`
  (aquí `2026-07-22`). Cada mes se sube un archivo nuevo → una fila nueva en la tabla.

## Estructura del bloque de KPIs (hoja `Estado actual`)
Cada TIPO tiene una fila de encabezado (col B = nombre TIPO, C = # unidades total,
G = superficie total) seguida de 6 filas de estado + 1 fila "Unidades/Superficie total":

| Bloque | Encabezado | Disponible | Res.Arriendo | Arrendado | Res.Compra | Promesado | Escriturado | Total |
|--------|-----------|-----------|--------------|-----------|-----------|-----------|-------------|-------|
| **Oficina (OF)**        | fila 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 |
| **Local comercial (LC)**| fila 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 |
| Total OF+LC             | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 |
| Estacionamiento         | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 |
| Bodega                  | 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 |

Columnas dentro de cada fila de estado:
- **B** = etiqueta del estado · **C** = # unidades · **D** = fracción de unidades
- **F** = etiqueta (repite) · **G** = superficie m² · **H** = fracción de superficie
- **I** = (vacía) · **J** = UF/m² (o UF/un en Est/Bodega) de ese estado

> **Estacionamiento y Bodega se IGNORAN**: el dashboard solo usa OF y LC y no entran
> en ningún agregado (`M2 occ totales` reconciliado abajo sin ellos).

## Mapeo celda → columna (fila `f_of`=35, `f_lc`=44 como base de cada bloque)

### Oficina (OF) — ocupaciones por **SUPERFICIE** (col H / m²)
| Columna destino | Origen | Fórmula | Valor actual (jul-2026) |
|---|---|---|---|
| `Ocupacion Renta OF`   | H38 = G38/G35 | m² Arrendado / m² total OF | 3869.16/9022.71 = **0.4288** |
| `Ocupacion Ventas OF`  | H41 = G41/G35 | m² Escriturado / m² total OF | 2124.78/9022.71 = **0.2355** |
| `m2 arrendados OF`      | G38 | m² Arrendado | 3869.16 |
| `M2 vendidos OF`        | G41 | m² Escriturado | 2124.78 |
| `Disponible OF`         | G36 | m² Disponible | 1022.25 |
| `Reserva Arriendo OF`   | G37 | m² Res. Arriendo | 1846.74 |
| `Reserva Compra OF`     | G39 | m² Res. Compra (col BIGINT porque hist.=0) | 159.78 |
| `uf/m2 arriendo OF`     | J38 | UF/m² del Arrendado | 0.559 |
| `uf/m2 venta OF`        | J41 | UF/m² del Escriturado | 91.72 |
| `Unidades Arrendadas OF`     | C38 | # Arrendado | 25 |
| `Unidades Vendidas OF`       | C41 | # Escriturado | 15 |
| `Unidades reservadas  ARR OF`| C37 | # Res. Arriendo | 13 |
| `Unidades reservadas  Vent OF`| C39 | # Res. Compra | 1 |
| `Unidades Disponibles OF`    | C36 | # Disponible | 7 |
| `Of total`              | C35 (=C42) | # unidades totales OF | 61 |

### Local comercial (LC) — ocupaciones por **UNIDADES** (col D)
| Columna destino | Origen | Fórmula | Valor actual |
|---|---|---|---|
| `Ocupacion Renta LC`   | D47 = C47/C44 | # Arrendado / # total LC | 5/6 = **0.8333** |
| `Ocupacion Ventas LC`  | D50 = C50/C44 | # Escriturado / # total LC | 1/6 = **0.1667** |
| `m2 arrendados LC`      | G47 | m² Arrendado | 1715.11 |
| `M2 vendidos LC`        | G50 | m² Escriturado | 199.71 |
| `uf/m2 arriendo LC`     | J47 | UF/m² del Arrendado | 0.236 |
| `uf/m2 venta LC`        | J50 | UF/m² del Escriturado | 107.05 |
| `Unidades Arrendadas LC`  | C47 | # Arrendado | 5 |
| `Unidades Vendidas LC`    | C50 | # Escriturado | 1 |
| `Unidades Disponibles LC` | C45 | # Disponible | 0 |
| `LC Total`             | C44 (=C51) | # unidades totales LC | 6 |

> **QUIRK confirmado con las 16 filas históricas**: OF usa fracción de **superficie**
> (col H); LC usa fracción de **unidades** (col D). En todas las filas
> `Ocupacion Renta LC = 0.83` (=5/6, no 0.896 de superficie) y
> `Ocupacion Ventas LC = 0.17` (=1/6, no 0.104). Para OF, la fila más reciente (202603)
> confirma superficie: 0.398→0.40 (unidades daría 0.38) y venta 0.235→0.24 (un.=0.25).
> LC no tiene columnas de m²/reserva Disponible en el esquema.

### Agregados
| Columna destino | Fórmula | Valor actual |
|---|---|---|
| `M2 occ totales` | G38 + G41 + G47 + G50 (arr+esc de OF y LC; SIN Est/Bod) | 3869.16+2124.78+1715.11+199.71 = **7908.76** |
| `Ocupacion total`| `M2 occ totales` / (G35 + G44) = /10937.53 | 7908.76/10937.53 = **0.7231** |
| `Gasto Comun`    | Ver nota — NO derivable de `Estado actual` | ~0.08 (manual/auxiliar) |

### Periodo (todo derivado de `Estado actual!F9`, = `KPIS!H9`, aquí 2026-07-22)
| Columna destino | Fórmula | Valor actual |
|---|---|---|
| `Proyecto` | constante | `"Atempora"` |
| `Fecha ` | primer día del mes de F9 | `2026-07-01` |
| `Año` | año de F9 | 2026 |
| `Mes` | índice secuencial = (Año-2025)*12 + mes | (2026-2025)*12+7 = **19** |
| `Fecha ID` | Año*100 + mes | **202607** |

Verificado: 202501→Mes 1, 202601→Mes 13, 202604→Mes 16.

## Evidencia numérica (reconciliación)
- **Oficina arrendado (pedido explícito)**: G38 3869.16 / G35 9022.71 = **0.4288** ✓
- **Denominador de `Ocupacion total`**: en 14 de 16 filas históricas
  `M2 occ totales / 0.549161… = 10937.53` exacto (= G35 9022.71 + G44 1914.82).
  Ej. 202505: 6457.05/10937.53 = 0.59036 = valor almacenado a plena precisión ✓
- **`M2 occ totales`** 202603/202604: 3588.79+2124.78+1715.11+199.71 = 7628.39 = valor
  almacenado exacto ✓
- **`M2 vendidos OF`** = G41 = 2124.78 idéntico al almacenado en 202603/202604 ✓

## Anomalías / advertencias para el loader
1. **`Ocupacion total` filas 202603 y 202604 = 0.68** rompe el patrón: 7628.39/10937.53
   = 0.6975 (→0.70), no 0.68. Las otras 14 filas cuadran perfecto con /10937.53. Tratar
   0.68 como dato antiguo mal redondeado; **usar la fórmula /(G35+G44)**.
2. **`Gasto Comun`** (0.083→0.078→0.08 en el histórico) NO sale de `Estado actual`.
   Es un ratio de gasto común (~0.08 UF/m²). Candidatos en el libro: `KPIS` sección
   "Gastos comunes", `Break-even!E47`=0.0783 (gasto común 2025). No es determinista aquí;
   marcar como **campo manual/auxiliar a confirmar**, no bloqueante (dashboard usa OF/LC).
3. Tipos del esquema `Reserva Compra OF` y las `Unidades*` son BIGINT solo porque los
   valores históricos fueron enteros; el origen real puede ser float (m²) — castear.
4. Redondeo: la tabla guarda ocupaciones/uf a ~2 decimales; almacenar el valor crudo y
   dejar el redondeo a la capa de presentación para reproducir el histórico.

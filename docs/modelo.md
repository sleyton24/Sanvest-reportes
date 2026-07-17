# Modelo del .pbix — `Sanvest BI 24.0122026.pbix`

> Fase 0 — Reverse engineering. Documento generado a partir de la extracción
> programática con **pbixray 0.10.0** (no de mirar el render del informe).
> Datos crudos en [`docs/_raw/`](_raw/) y queries M completas en
> [`docs/queries_m/`](queries_m/). Reproducible con
> [`scripts/extract_pbix.py`](../scripts/extract_pbix.py).

## 1. Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Tamaño del .pbix | ~50 MB |
| Tablas totales en el modelo | **106** |
| — Tablas reales (con query M / origen) | **64** |
| — Tablas auto-fecha (`LocalDateTable_*`, `DateTableTemplate_*`) | **42** (ruido de Power BI; ignorar) |
| Medidas DAX | **41** |
| Relaciones | **122** (muchas hacia las tablas auto-fecha) |
| Motor de extracción | pbixray 0.10.0 (Python 3.12 — `xpress9` no compila en 3.14) |

**Hallazgo clave (define toda la estrategia de migración):** el .pbix **no es un
informe, es una colección de ~10 informes** de distintas unidades de negocio
metidas en un solo archivo. Cada unidad se alimenta de **un único Excel fuente**
(salvo USA, que usa dos). Conviene migrar **una unidad de negocio a la vez**.

**Segundo hallazgo clave:** la capa Power Query es **trivial**. De 64 tablas,
**61 hacen solo `PromoteHeaders` + `TransformColumnTypes`** (leer hoja → ascender
encabezados → castear tipos). Solo 4 tablas hacen algo más (un filtro de filas,
un rename, un drop de columnas/errores). **La lógica de negocio real NO está en
Power Query: está pre-calculada dentro de las hojas Excel** (que el usuario arma
a mano) y en la **capa de relaciones + medidas DAX** del modelo.

## 2. Unidades de negocio detectadas

Cada fila es un candidato a "informe" migrable de forma independiente.

| # | Unidad de negocio | Excel fuente | Tablas | Filas (aprox.) | Fuente disponible localmente |
|---|---|---|---:|---:|:---:|
| 1 | **USA / Bemiston / St Grand** | `BD Gestion USA .xlsx` (15) + `USA.xlsx` (6) | 21 | ~30.000 | ✅ ambos |
| 2 | **Desarrollo para la Venta (DV)** | `Desarrollo para la venta.xlsx` | 10 | ~2.650 | ✅ |
| 3 | **Civitas / Atémpora** | `CIVITAS.xlsx` | 7 | ~860 | ✅ |
| 4 | **Renta Residencial / LAR** | `Renta Residencial .xlsx` (7) + **SQL Server** (2) | 9 | ~4.700 | ✅ Excel · ⚠️ SQL requiere acceso |
| 5 | **Hotel** | `BD HOTEL .xlsx` | 5 | ~1.000 | ✅ |
| 6 | **Oficina** | `Gestion Oficina.xlsx` | 4 | ~600 | ❌ **falta el Excel** |
| 7 | **Grupo (Balance / EERR / Cascada)** | `Base balance.xlsx` | 3 | ~790 | ✅ |
| 8 | **ICEMM** | `ICEMM.xlsx` | 3 | ~770 | ✅ |
| 9 | **Deuda** | `Deuda.xlsx` | 1 | 815 | ✅ |
| 10 | **MILA** | `Uso Y fondos mila diciembre .xlsx` | 1 | 183 | ❌ **falta el Excel** |

> El detalle tabla-por-tabla (hoja, columnas, pasos M) está en
> [`mapa_etl.md`](mapa_etl.md).

## 3. Orígenes de datos

### 3.1 Excel (62 de 64 tablas)
Patrón M idéntico en todas:
```m
let
    Origen = Excel.Workbook(File.Contents("<ruta>\<archivo>.xlsx"), null, true),
    Hoja   = Origen{[Item="<NombreHoja>", Kind="Sheet"]}[Data],
    Encab  = Table.PromoteHeaders(Hoja, [PromoteAllScalars=true]),
    Tipos  = Table.TransformColumnTypes(Encab, {{"col", tipo}, ...})
in
    Tipos
```
Las rutas en el .pbix apuntan a **tres raíces OneDrive distintas** (el archivo
fue editado desde varias máquinas/sincronizaciones a lo largo del tiempo):
- `C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\`
- `C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\`
- `C:\One Drive Sleyton\BNV\…\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\`

**Lo único que importa para el ETL es `nombre_de_archivo` + `nombre_de_hoja`.**
La carpeta local [`Formatos para reportes PBI/`](../Formatos%20para%20reportes%20PBI/)
es una copia de esa fuente y contiene 10 de los 12 archivos referenciados.

### 3.2 SQL Server (2 tablas — solo LAR)
Ya existe infraestructura SQL para LAR, lo que coincide con el stack objetivo:
- Servidor: **`BNVSOFSQL\SQL_2`** · Base: **`SQLLAR`**
- `Renovaciones LAR` → `SELECT * FROM SQLLAR.dbo.contratosact` (2.686 filas, 22 cols)
- `Resumen LAR` → `SELECT [nombre],[dptos_Contrato],[Ndeptos],[ufm2r] FROM SQLLAR.dbo.tresumen` (12 filas)

> El `Resumen LAR` trae `TOP (1000)` en el M; con solo 12 filas reales no afecta,
> pero hay que replicar el `SELECT` exacto, no `SELECT *`.

## 4. Pasos de transformación M usados en todo el modelo

| Paso M | # tablas que lo usan |
|---|---:|
| `Table.PromoteHeaders` | 61 |
| `Table.TransformColumnTypes` | 61 |
| `Table.SelectRows` (filtro de filas) | 3 |
| `Table.RenameColumns` | 1 |
| `Table.RemoveRowsWithErrors` | 1 |
| `Table.RemoveColumns` | 1 |

Tablas con paso extra (las únicas que requieren atención especial en el ETL):
- **`Base mila CC`** → filtro de filas
- **`St grand final (2)`** → doble casteo + filtro de filas
- **`USA Graficos`** → filtro de filas
- **`EERR CIVITAS`** → doble casteo + `RenameColumns` (`"Nivel 2 "` → `"Nivel 2"`)
- **`USA KPIS GESTION`** → `RemoveRowsWithErrors` sobre `"Dólar SQF O AVG"`
- **`Uso Y fondo Bemiston`** → `RemoveColumns`
- **`Hotel Original`** → ⚠️ caso único: lee la hoja **en crudo**, sin
  `PromoteHeaders` ni casteo (los encabezados quedan como `Column1, Column2…`).
  Replicar tal cual ([queries_m/Hotel Original.m](queries_m/Hotel%20Original.m)).

## 5. Medidas DAX (41)

Clasificadas por dificultad de portar a SQL/API. La mayoría son **triviales**.

### 5.1 Constantes auxiliares de signo (patrón "voltear para gráfico")
Varias medidas son literalmente `-1` y se multiplican por una suma para invertir
el signo en visuales de cascada/EERR. **No son lógica de negocio; son cosmética
de gráfico** → se resuelven en el front, no en SQL.
- `[Base mila CC] AUX graficos = -1`, `[fINAL beMISTON] Medida = -1`,
  `[ICEMM Mensual] AUX = -1`, `[EERR CIVITAS] AUXCivitas = -1`,
  `[Hotel Real] Medida 2 = periodo-12` (offset LY)
- …y sus derivadas `SUM(col) * [AUX]`.

### 5.2 Aritmética simple (precalculables como columna o medida directa)
- `MAX(a) - MAX(b)`, `MAX(a) + MAX(b)`, `SUM(a) + SUM(b)`
- `DIVIDE(SUM(a), SUM(b))` — p. ej. `[Resumen LAR] dptos_Contrato / Ndeptos`,
  `[Base mila CC] YTD / Total Budget`, ratio UF/m² de Civitas.

### 5.3 Con contexto / iteradores (requieren cuidado — calcular en API)
- **`[EERR Grupo] Real Adj`, `YTG adj`, `PPTO adj`, `Forecast ADJ`, `2024 Adj`** —
  `SUMX('EERR Grupo', IF([N1] <> "INGRESOS", [col] * -1, [col]))`: voltea el signo
  de todo lo que no sea INGRESOS para armar el EERR. Misma lógica en
  `[Amortizacion] Real Ajustado`.
- **`[EERR Grupo] Real menos Presupuesto`** — usa `CALCULATE(... , N1="INGRESOS")`
  con variables → único caso con `CALCULATE` real.
- **`[St grand final (2)] Monto_Ajustado`** — `SELECTEDVALUE` + `IF` (depende del
  contexto de fila seleccionada en el visual).

> ⚠️ `[Base mila CC] AUX graficos x Monto 2` referencia la tabla `'USA Mila PPTO'`,
> que **no existe** en el modelo actual (¿renombrada/eliminada?). Medida rota.

> **No hay time-intelligence DAX pesada** (`TOTALYTD`, `SAMEPERIODLASTYEAR`, etc.).
> El "YTD" y el "año anterior" se resuelven con **columnas `YTD`/`LY` ya calculadas
> en el Excel** y con las relaciones por `Fecha ID`. Esto simplifica mucho la migración.

## 6. Relaciones — hubs del modelo

Las 122 relaciones (muchas van a tablas auto-fecha `None[None]`). Las reales se
articulan sobre **columnas-llave compartidas**:

| Llave | Rol | Tablas dimensión |
|---|---|---|
| **`Fecha ID` / `FechaID`** | Calendario (la más usada) | `TIEMPO AUX`, `FECHA AUX`, `Hotel Graficos`, `Date AUX Civitas` |
| **`Indice`** | Mapeo de líneas de EERR | `Balance`, `EERR Grupo` |
| **`Activo`** | Dimensión de propiedad (USA) | `USA Modelo Original Bemiston` |
| **`Periodo`** | Periodo (yyyymm) | `FECHA AUX`, `Hotel Real`, `Oficina Real` |
| **`Mes`** | Mes | `KPIS Atempora` |

`TIEMPO AUX` (84 filas, Renta Residencial) y `FECHA AUX` (73 filas, DV) son las
dos tablas-calendario centrales. `EERR Grupo` actúa como tabla puente: 8 tablas
distintas (de varias unidades) se relacionan a ella por `Indice` para consolidar
el estado de resultados del Grupo.

> Lista completa de relaciones: ver `docs/_raw/docs_data.txt` (sección RELACIONES)
> y `docs/_raw/model_summary.json`.

## 7. Anomalías y pendientes a confirmar con el usuario

1. **Faltan 2 Excel fuente** en la carpeta local: `Gestion Oficina.xlsx` (Oficina)
   y `Uso Y fondos mila diciembre .xlsx` (MILA). Sin ellos no se pueden migrar
   esas 2 unidades.
2. **Acceso a SQL Server** `BNVSOFSQL\SQL_2 / SQLLAR` para las 2 tablas de LAR.
3. **Versiones/duplicados** en la carpeta: `Desarrollo para la venta copia.xlsx`,
   `Hotel ejemplo2.xlsx`, `ICEMM_Base_Datos vinculada.xlsx`, y la carpeta `2026/`
   (`Div. Yield Negocios Sanvest.xlsx`, `USA_Ocupacion_Precio_StGrand_Bemiston.xlsx`)
   — no son fuentes directas del .pbix; aclarar si son insumos intermedios o
   versiones nuevas.
4. **Medida DAX rota** que apunta a `'USA Mila PPTO'` (tabla inexistente).
5. **Nombres de tabla ≠ nombre de hoja** en algunos casos (ver `mapa_etl.md`):
   `Hotel Graficos`→hoja `Hotel Real`, `USA Bemiston (2)`→`USA Bemiston`,
   `St grand final (2)`→`St grand final`.

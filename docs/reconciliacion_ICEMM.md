# Reconciliación ICEMM (Construcción) — Fase 1

ETL (`etl.load_unit("ICEMM")` desde `Formatos para reportes PBI/ICEMM.xlsx`) vs. snapshot
del `.pbix` (`pbixray.get_table`). Comparación por multiset de filas normalizadas (es-CL).

| Tabla | Filas ETL / modelo | Coinciden | Estado |
|---|---|---|---|
| **ICEMM Mensual** | 600 / 600 | 600 | ✅ **OK 1:1** |
| **Flujo** | 148 / 148 | 148 | ✅ **OK 1:1** |
| ICEMM YTD | 24 / 24 | 4 | ⚠️ DRIFT |

## Conclusión
Las **dos tablas que alimentan la página ICEMM reconcilian al 100%**:
- `ICEMM Mensual` → las 3 tablas P&L (FY / YTD / YTG por Nivel 1/Nivel 2) y los 8 combos.
- `Flujo` → el pivot de flujo de caja.

`ICEMM YTD` (tabla auxiliar de 24 filas) presenta DRIFT en columnas de medida
(YTG PPTO/Proy, PPTO, Real): el Excel `ICEMM.xlsx` está más actualizado que el snapshot
del `.pbix`. **No tiene impacto**: la página ICEMM no usa esa tabla (0 referencias en el
Report/Layout). Misma lógica/loader que ICEMM Mensual (que sí reconcilia), por lo que el
ETL es fiel; la diferencia es de datos (snapshot viejo), no de transformación.

## Tablas planas en dev DB
`icemm_mensual` (600), `icemm_ytd` (24), `flujo` (148).

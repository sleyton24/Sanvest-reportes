# Frontend — Dashboard DV (React + Vite + TS)

Reconstrucción web de las páginas "Desarrollo para la Venta" del Power BI.
Reconstruido desde el layout interno del `.pbix` (ver `docs/visuales_DV.md`),
no de capturas. Consume la API FastAPI.

## Correr en desarrollo

1. **API** (desde la raíz del proyecto, venv 3.12):
   ```powershell
   .venv\Scripts\python -m uvicorn api.main:app --reload --port 8077
   ```
   > Se usa el puerto **8077** porque en esta máquina `:8000` y `:5173` los ocupa
   > otro proyecto (LAR Revenue Intelligence). Para cambiarlo: arrancar uvicorn en
   > otro puerto y exportar `VITE_API_TARGET=http://127.0.0.1:<puerto>` antes de Vite.

2. **Front** (desde `frontend/`):
   ```powershell
   npm install   # solo la primera vez
   npm run dev
   ```
   Vite hace proxy de `/api` → la API (default `:8077`), así no hay problemas de CORS.
   Abrir la URL que imprime Vite (5173 si está libre; si no, el siguiente puerto).

## Build de producción
```powershell
npm run build      # type-check + bundle a dist/
npm run preview    # sirve dist/ localmente
```

## Estructura

| Archivo | Rol |
|---|---|
| `src/config.ts` | Mapeo de proyectos (ortografía por tabla), filtros de versión, specs de cards/gauges/charts/pivot — derivado del layout y filtros del .pbix |
| `src/data.ts` | Arma filtros (proyecto+versión+año/mes) y agrega en cliente |
| `src/api.ts` | Cliente de la API |
| `src/format.ts` | Formato es-CL (UF, %, fechas) |
| `src/components/` | Slicer, Gauge (SVG), KpiCard, PivotTable (custom), charts (Recharts) |
| `src/pages/DVDashboard.tsx` | Página: 3 proyectos, slicers Año/Mes, 2 gauges, 4 cards, 3 gráficos, 1 pivot |

## Notas de fidelidad
- **Proyectos:** Millalongo, Sta Victoria 155, Sta Victoria 99 (los 3 con página/
  financieros en el PBI). El nombre se mapea por tabla (ver `docs/decisiones.md` D3.2).
- **Filtros de versión:** Ventas/Escrituras = `REAL`; KPIs/Indicadores = `PROYECCIÓN`.
- **"A la fecha":** cifras del último periodo disponible salvo que se elija Año/Mes.
- Gráficos: serie temporal completa (la ventana relativa del PBI queda como
  refinamiento pendiente).

# Sanvest BI — Onboarding / Traspaso

Web app que migra un modelo de **Power BI** a web, reconciliada 1:1 contra el .pbix
(`Sanvest BI 24.0122026.pbix`). Stack: **FastAPI** (backend) + **React/Vite/Recharts**
(frontend) + **PostgreSQL** (prod) / **SQLite** (dev). Usuario: sleyton@sanvest.cl
(finanzas/BI de Sanvest, grupo inmobiliario chileno). Trabajar en español.

## Rutas y arranque
- **Proyecto:** `c:\Users\sleyton\BNV\Transformacion Digital\Reportes Sanvest`
- **Frontend:** `frontend/` → Vite dev en `:5176`, o `npm run build` → `frontend/dist`
- **API:** `api/` → `.venv/Scripts/python -m uvicorn api.main:app --port 8077 --host 127.0.0.1`
- **ETL:** `etl/` (`connect_*.py` + `apply_*`). Catálogo por unidad: `api/catalog/*.json`
- **Dev DB:** `db/sanvest_bi_dev.sqlite` | **Prod:** PostgreSQL `sanvest` en VPS (config `PG*` en `.env`)
- **7 unidades:** DV (Desarrollo), RR (LAR: SOHO/PARK + holding "LAR Group"), Hotel (OLÁ),
  USA (Bemiston/Mila/St Grand), ICEMM (Construcción), Atempora (Civitas), Grupo (EEFF).

## Reglas críticas (aprendidas)
- La API en `:8077` lee **PROD** (por `PG*` en `.env`, sin `SANVEST_DB_URL`). Lo que ve el
  usuario en la app es prod. El SQLite dev es para probar ETL localmente.
- Cambios de **frontend** se ven tras `npm run build` (o Vite HMR). Cambios de **datos** solo
  se ven si están en **prod**.
- El usuario de BD de prod **NO puede crear tablas** (`has_schema_privilege(public,CREATE)=False`).
  Solo funciona **DELETE+append** en tablas EXISTENTES (`to_sql(replace)` falla). Tablas nuevas
  en prod requieren un usuario con privilegios.
- **NUNCA escribir a prod sin OK explícito del usuario + backup** a `db/backups/`.
- Verificar SIEMPRE: `npx tsc --noEmit` + `npm run build` antes de cerrar un cambio.
- Para editar `.xlsx` preservando gráficos/pivots usar **Excel COM (pywin32)**, no openpyxl.
- La API dev se cae al cerrar sesión (correrla en background). Pendiente dejarla como servicio.
- Se trabajó con **Workflows multi-agente** (un agente por dashboard) para cambios masivos.

## Estado: 26 de 32 temas del listado HECHOS y en vivo
Títulos chicos · grúa ICEMM · bandera USA · portada "Balance·EERR" · avance ventas % ·
usos-y-fondos bajo deuda · **últimos 12 meses** en todos los gráficos · escala ventas unidades ·
**botón PDF con etiquetas** (`print.tsx`) · occ mes+YTD LAR · renombre "Informe de Gestión" ·
occ hotel mes+YTD · Ev.Proyecto&Terms USA · ICEMM orden YTD→YTG→FY · flujo ICEMM colapsable
sin duplicados · occ Civitas por m² · Civitas P&L colapsable arriba · cuadros arriendos×cliente
y ventas (replicando el .pbix) · morosidad con total · total patrimonio · torta con % ·
balance 4 columnas (Mercado/Costo UF/USD) · notas al hover.
**Bug corregido:** la ventana de 12 meses se topa en el último mes con Real (no muestra meses
futuros con solo Ppto).

## Pendiente (por prioridad)

1. **DEPLOY SEGURIDAD EN EL VPS** (recomendado empezar acá; guía en `docs/deploy.md`):
   nginx + TLS + Basic Auth, `SANVEST_ENV=prod`, `SANVEST_API_TOKEN`, roles de BD, build del
   frontend con `VITE_API_TOKEN`, rotar `PGPASSWORD`, y dejar la API como **servicio systemd**
   (para que no se caiga). El usuario tiene acceso al VPS.

2. ~~CREAR TABLA `deuda_activos` EN PROD~~ **RESUELTO (09-jul-2026) sin tabla**: como el
   usuario de prod no puede crear tablas y la deuda es un cronograma estático, la API la sirve
   desde un **archivo empaquetado** `api/data/deuda_activos.json` (módulo `api/filetables.py`).
   `table_rows` usa el archivo solo si la tabla NO existe en la BD (si algún día se crea, la BD
   gana). Ítem 11 EN VIVO: card en RR (SOHO/PARK) y tabla en Hotel (Ola + Hotel Ola + total).
   Regenerar el JSON tras editar Deuda.xlsx: ver cabecera de `api/filetables.py`.
   Pendiente: confirmar la moneda de `Deuda.xlsx` (SOHO ≈104k en el archivo vs ≈26k UF en el
   balance del Grupo — ver preguntas abiertas).

3. ~~CARGAR OLÁ HOTEL MAYO A PROD~~ **HECHO (09-jul-2026)** junto con la restauración del
   incidente Hotel: un CCPP parcial con los años internos mal rotulados (decía 2025 siendo
   2026) había pisado el 2025 completo en prod (Real en 0 jul–dic, 2026 sobre ene–may).
   Se restauró `hotel_full`/`hotel_real`/`hotel_ppto` desde dev con
   `scripts/restore_hotel_prod.py` (backup en `db/backups/prod_hotel_20260709_124701/`)
   y `apply_ccpp` ahora tiene un **guard anti-regresión** (aborta si el último mes con Real
   del archivo es anterior al de la BD; override: `allow_backfill=True`).

4. **ÍTEM 19:** informe de gestión **aperturado** (Hotel + SOHO + PARK) — requiere ETL para traer
   más líneas del P&L (hoy solo 4 líneas resumen por propiedad en `hotel_full` /
   `indicadores_financieros`).

5. **ÍTEM 24:** pestaña **"Obras"** (control de obras ICEMM) — está en **otra BD SQL de ICEMM**
   (mismo servidor Postgres, base distinta a `sanvest`). Hay que conectarla.

6. **DEPENDEN DEL USUARIO:** (2) logos oficiales por unidad → subir archivos a la carpeta;
   (13) gráfico gasto común → decidir si lo quiere; (15) KPIs grupo LAR → definir cuáles/fuente.

## Preguntas abiertas (deuda)
- **Moneda de `Deuda.xlsx`: UF, CONFIRMADO por el usuario (09-jul-2026).** Las etiquetas ("UF")
  quedan correctas. OJO: la cifra NO reconcilia con el balance del Grupo (SOHO ≈104k UF en el
  archivo vs ≈26k UF en el balance); al ser ambas UF, es una **diferencia real de dato** a
  investigar aparte (¿deuda total del crédito vs saldo contable? ¿otro corte de fecha?), no un
  tema de unidades.
- **Hotel:** ¿un crédito o dos (Ola + Hotel Ola)? Hoy se muestran ambos + total.

---
*Antes de tocar prod: pedir OK y hacer backup. Recomendación: empezar por el deploy de
seguridad en el VPS (deja la API estable, publica la deuda y permite cargar Hotel mayo).*

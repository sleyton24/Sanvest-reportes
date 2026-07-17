# Despliegue en producción (VPS)

Arquitectura: **nginx** sirve el frontend estático y hace de reverse-proxy de `/api`
hacia **uvicorn** (FastAPI), que lee/escribe en **PostgreSQL `sanvest`**.

```
navegador ── nginx :80/443 ──┬── /            → frontend/dist (estático)
                             └── /api/…        → uvicorn 127.0.0.1:8077 (FastAPI)
                                                   └── PostgreSQL 'sanvest'
```

## 1. Backend (FastAPI + ETL)

```bash
cd /ruta/Reportes\ Sanvest
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt          # incluye psycopg2-binary
cp .env.example .env                      # y completar PG* (o copiar el .env real)
```

`.env` (NO se commitea — está en .gitignore):
```
PGHOST=...        PGPORT=5432
PGUSER=...        PGPASSWORD=...
PGDATABASE=sanvest
# PGSSLMODE=require   # si el server exige TLS
```

`etl/db.py` carga `.env` solo y `get_engine()` arma la conexión Postgres desde las
`PG*`. La base `sanvest` ya fue creada y migrada (57 tablas). Para una instalación
nueva: `python scripts/create_pg_database.py` y `python scripts/migrate_sqlite_to_postgres.py`.

### Servicio systemd  `/etc/systemd/system/sanvest-api.service`
```ini
[Unit]
Description=Sanvest BI API (uvicorn)
After=network.target

[Service]
WorkingDirectory=/ruta/Reportes Sanvest
EnvironmentFile=/ruta/Reportes Sanvest/.env
ExecStart=/ruta/Reportes Sanvest/.venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8077
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now sanvest-api
```

## 2. Frontend (build estático)

```bash
cd frontend
npm ci
npm run build            # genera frontend/dist  (rebuild en CADA cambio de código)
```
> El `dist` versionado puede estar viejo: **siempre reconstruir antes de desplegar.**
> El front llama a `/api` (mismo dominio); no necesita CORS si va detrás de nginx.

## 3. nginx

```nginx
server {
    listen 80;
    server_name TU_DOMINIO;
    root /ruta/Reportes Sanvest/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8077/;   # la barra final quita el prefijo /api
        proxy_set_header Host $host;
    }
    location / {
        try_files $uri /index.html;          # SPA fallback
    }
}
```

## 4. Carga mensual (ya en producción)

Subir los informes desde la app (botones "Cargar…") o por API; el ETL escribe en
Postgres. Cada unidad tiene su flujo en `etl/connect_*.py` (ver `docs/manual_carga.md`).

## 5. Seguridad (OBLIGATORIO antes de exponer público)

**Login por usuario + perfilado por rol (en el código).** La app tiene login
usuario/contraseña (tabla `app_users`, token firmado JWT-HMAC). Roles: `admin`
(ve todas las unidades y puede cargar) y `viewer` (ve solo sus unidades, solo
lectura). Todas las lecturas (`/units*`, `/tables*`, `/measures*`) exigen sesión
y se filtran por unidad; las cargas (`/upload`, `/upload-informes`, KPIs USA)
exigen rol admin.

Puesta en marcha en el VPS:
1. Crear la tabla una vez con un usuario con privilegios (el runtime no tiene
   CREATE): `psql ... -f db/ddl_app_users.sql` y hacer el `GRANT` a `PGUSER`.
2. Definir `SANVEST_AUTH_SECRET` en el `.env` (obligatorio; ver `.env.example`).
3. Crear el primer admin: `python scripts/manage_users.py create --admin <usuario>`.
   Luego más usuarios con `create <usuario> --units RR,USA` (viewer).

**Capa app (legado):** el token compartido `SANVEST_API_TOKEN` (header
`X-API-Token`) sigue disponible pero YA NO es el guard de las cargas (ahora es el
login admin). `/ask` está apagado salvo `SANVEST_ASK_ENABLED=1`; `/docs` se oculta
con `SANVEST_ENV=prod`.

En el `.env` del VPS (systemd `EnvironmentFile`, chmod 600):
```
SANVEST_ENV=prod
SANVEST_AUTH_SECRET=<secreto aleatorio; python -c "import secrets;print(secrets.token_urlsafe(48))">
# SANVEST_API_TOKEN=<opcional, legado>
# SANVEST_ASK_ENABLED=1   # solo cuando haya UI de chat + rate-limit + ANTHROPIC_API_KEY
```

**Capa borde (nginx):** Basic Auth + TLS sobre TODO el sitio (cubre también las
lecturas), límite de tamaño de subida y timeouts largos para cargas/SSE:
```nginx
server {
    listen 443 ssl;                      # certbot/letsencrypt (TLS obligatorio: Basic Auth viaja en claro sobre HTTP)
    server_name TU_DOMINIO;
    ssl_certificate     /etc/letsencrypt/live/TU_DOMINIO/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/TU_DOMINIO/privkey.pem;
    root /ruta/Reportes Sanvest/frontend/dist;
    index index.html;

    auth_basic "Sanvest BI";
    auth_basic_user_file /etc/nginx/.htpasswd;   # htpasswd -c /etc/nginx/.htpasswd usuario
    client_max_body_size 64m;                    # las cargas suben varios Excel

    location /api/ {
        proxy_pass http://127.0.0.1:8077/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;                 # ETL de carga puede tardar
        proxy_buffering off;                     # streaming SSE de /ask
    }
    location / { try_files $uri /index.html; }
}
# listen 80 -> return 301 https://$host$request_uri;
```

**Capa BD (defensa en profundidad):** el usuario de la app es una cuenta personal
dueña de las 57 tablas. Segregar (correr como superusuario/owner de la base):
```sql
-- rol de solo lectura para la API/agente:
CREATE ROLE sanvest_ro LOGIN PASSWORD '<clave_ro>';
GRANT USAGE ON SCHEMA public TO sanvest_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sanvest_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO sanvest_ro;
-- (el ETL sigue con un rol dueño de las tablas; el fix DELETE+INSERT ya NO requiere
--  CREATE, así que el rol de carga solo necesita SELECT/INSERT/DELETE, no DDL).
```
Además: **rotar `PGPASSWORD`** por uno fuerte/aleatorio (el actual es débil y estuvo
en carpeta sincronizada) — actualizar `.env`+`EnvironmentFile` y `systemctl restart`
de forma atómica, verificando `curl -u user:pass https://.../api/units` antes de revocar la vieja.

## Checklist pre-deploy
- [ ] `pip install -r requirements.txt` en el venv del server (con `psycopg2-binary`).
- [ ] `.env` con `PG*` presente y `PGDATABASE=sanvest`.
- [ ] `npm run build` reciente (incluye los últimos cambios de UI/datos).
- [ ] systemd `sanvest-api` activo; `curl 127.0.0.1:8077/health` responde `{"status":"ok"}`.
- [ ] nginx sirviendo `dist` y proxypaseando `/api`.
- [ ] **Seguridad (§5):** `SANVEST_ENV=prod` + `SANVEST_API_TOKEN` en `.env`; front construido con el mismo `VITE_API_TOKEN`; nginx con TLS + `auth_basic` + `client_max_body_size`; `PGPASSWORD` rotado; (opcional) rol `sanvest_ro`.
- [ ] Verificar auth: sin token `POST /api/units/DV/upload-informes` → 401; `GET /api/docs` → 404.
- [ ] `/ask` queda en 503 (agente apagado) hasta tener UI de chat + rate-limit + `ANTHROPIC_API_KEY` (y `anthropic` en requirements).
- [ ] (opcional) CORS: solo si el front se sirve en otro dominio que la API.

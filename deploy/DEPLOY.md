# Deploy demo — Sanvest BI en el VPS

Guía para publicar la app en el mismo VPS del Postgres (`sanvest`), estilo
danacorp: clonar el repo, `git pull` para actualizar. El build del frontend
(`frontend/dist/`) **viaja dentro del repo**, así el VPS no necesita Node.

## 0. Requisitos en el VPS
- Python 3.11+ (`python3 --version`), nginx, git.
- El Postgres ya vive ahí (base `sanvest`) → en el `.env` del servidor `PGHOST=127.0.0.1`.

## 1. Clonar el repo
```bash
sudo mkdir -p /opt/sanvest-bi && sudo chown $USER /opt/sanvest-bi
git clone <URL-DEL-REPO> /opt/sanvest-bi
cd /opt/sanvest-bi
```

## 2. Entorno Python
```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 3. `.env` del servidor (NO se commitea)
Crear `/opt/sanvest-bi/.env`:
```ini
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=sleyton@sanvest.cl
PGPASSWORD=<la clave de Postgres>
PGDATABASE=sanvest
SANVEST_ENV=prod
SANVEST_AUTH_SECRET=<generar uno nuevo: python3 -c "import secrets;print(secrets.token_urlsafe(48))">
```
Notas:
- `SANVEST_ENV=prod` oculta /docs y /openapi.json.
- NO poner `SANVEST_API_TOKEN` (la carga ya la protege el rol admin por JWT).
- NO poner claves de agentes (ANTHROPIC/GEMINI) para la demo.

## 4. API como servicio
```bash
sudo cp deploy/sanvest-api.service /etc/systemd/system/
# revisar User= y rutas si difieren
sudo systemctl daemon-reload
sudo systemctl enable --now sanvest-api
curl -s http://127.0.0.1:8077/health     # → {"ok": true ...}
```

## 5. nginx
```bash
sudo cp deploy/nginx-sanvest.conf /etc/nginx/sites-available/sanvest
sudo ln -s /etc/nginx/sites-available/sanvest /etc/nginx/sites-enabled/
# si hay dominio: editar server_name
sudo nginx -t && sudo systemctl reload nginx
```
HTTPS (muy recomendado si hay dominio apuntando al VPS):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d reportes.sanvest.cl
```

## 6. Firewall
- Abiertos al público: 80 (y 443 con HTTPS).
- El 8077 NO se expone (uvicorn escucha solo en 127.0.0.1).

## 7. Usuarios
La tabla `app_users` ya existe en el Postgres con el admin y los usuarios test.
Gestión: panel Admin ▸ Usuarios, o `scripts/manage_users.py` desde el VPS.
Cada usuario puede cambiar su clave haciendo clic en su nombre (barra superior).

## Actualizar la app (después de cada cambio)
En la máquina de desarrollo: `cd frontend && npm run build`, commit + push
(el dist va en el repo). En el VPS:
```bash
cd /opt/sanvest-bi && git pull
sudo systemctl restart sanvest-api    # solo si cambió el backend
```

## Verificación post-deploy
1. `https://<dominio-o-ip>/` carga el login.
2. Entrar con el admin → saludo "Hola, …" → tarjetas con logos.
3. `curl -s https://<dominio>/api/health` responde.
4. Un viewer test entra y ve SOLO sus unidades; Admin no le aparece.

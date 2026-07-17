"""Habilita el login en la base 'sanvest' de ESTE proyecto (una sola vez).

Contexto: en el clúster, la base/schema 'sanvest' figura a nombre de 'danacorp'
(otro proyecto), y por eso tu usuario runtime (sleyton@sanvest.cl) —dueño de las
57 tablas del reporte— no puede CREAR tablas nuevas en el schema public.

Este script hace el ÚNICO paso que requiere a danacorp: otorgarte permiso de
CREATE sobre el schema public. Acto seguido, con TU propio usuario, crea la tabla
app_users (que queda de TU propiedad) y el primer admin. Después de esto,
danacorp no se necesita nunca más para este proyecto.

La conexión de danacorp se toma del entorno (no se pide por chat ni se guarda).
Recomendado — variables separadas (evita romper la URL si la clave trae $ o @);
reusa PGHOST/PGPORT/PGDATABASE del .env. Ejemplo (PowerShell):

    $env:PG_OWNER_USER = "danacorp"
    $env:PG_OWNER_PASSWORD = "CLAVE_DE_DANACORP"
    python scripts/setup_prod_auth.py --grant-to "sleyton@sanvest.cl" --admin "sleyton@sanvest.cl"

Alternativa: PG_OWNER_URL (solo si la clave no tiene caracteres especiales).
Pide la contraseña del admin por consola (getpass) salvo que uses --password.
Idempotente: se puede correr más de una vez sin romper nada.
"""
from __future__ import annotations

import argparse
import getpass
import os
import sys
from pathlib import Path

from sqlalchemy import URL, create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001
    pass

from api import auth  # noqa: E402


def _qi(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _owner_url():
    """Conexión de danacorp: variables PG_OWNER_USER/PG_OWNER_PASSWORD (recomendado,
    reusa PGHOST/PGPORT/PGDATABASE del .env con escapado seguro) o PG_OWNER_URL."""
    user = os.environ.get("PG_OWNER_USER")
    if user:
        return URL.create(
            "postgresql+psycopg2",
            username=user,
            password=os.environ.get("PG_OWNER_PASSWORD"),
            host=os.environ.get("PGHOST"),
            port=int(os.environ.get("PGPORT", "5432")),
            database=os.environ.get("PGDATABASE") or "sanvest",
        )
    return os.environ.get("PG_OWNER_URL")


def main() -> None:
    p = argparse.ArgumentParser(description="Habilita el login en 'sanvest' (paso danacorp = solo un GRANT)")
    p.add_argument("--grant-to", required=True, help="tu usuario runtime (ej: sleyton@sanvest.cl)")
    p.add_argument("--admin", help="crear este usuario como admin (ve todo, puede cargar)")
    p.add_argument("--password", help="clave del admin (si se omite, se pide por consola)")
    p.add_argument("--full-name", dest="full_name", help="nombre completo del admin")
    a = p.parse_args()

    owner_url = _owner_url()
    if not owner_url:
        sys.exit("Falta la conexión de danacorp: define PG_OWNER_USER/PG_OWNER_PASSWORD "
                 "(o PG_OWNER_URL). Ver cabecera del script.")

    # 1) Como danacorp (dueño del schema): permitir a tu usuario crear tablas.
    owner = create_engine(owner_url, future=True)
    with owner.begin() as con:
        con.execute(text(f'GRANT CREATE ON SCHEMA public TO {_qi(a.grant_to)}'))
    print(f"✓ Otorgado CREATE en schema public a '{a.grant_to}'. (Único paso que usa danacorp.)")

    # 2) Ya con TU usuario (auth usa el engine PG* del .env): crear la tabla + admin.
    #    La tabla queda de tu propiedad; danacorp no vuelve a intervenir.
    auth.init_db()
    print("✓ Tabla app_users creada en 'sanvest' (de tu propiedad).")
    if a.admin:
        pw = a.password
        if not pw:
            p1 = getpass.getpass("Contraseña del admin: ")
            p2 = getpass.getpass("Repetir: ")
            if p1 != p2 or not p1:
                sys.exit("Las contraseñas no coinciden o están vacías.")
            pw = p1
        auth.create_user(a.admin, pw, role="admin", full_name=a.full_name)
        ok = auth.authenticate(a.admin, pw) is not None
        print(f"✓ Admin '{a.admin}' creado en 'sanvest'. Login verificado: {ok}")

    print("Listo. Define SANVEST_AUTH_SECRET en el .env de la API en prod.")


if __name__ == "__main__":
    main()

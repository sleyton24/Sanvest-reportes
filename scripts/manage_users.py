"""Gestión de usuarios de la app Sanvest BI (login + perfilado por rol).

Usa la tabla `app_users` (se crea sola si falta) vía api/auth.py. Cero
dependencias extra. La contraseña se pide de forma interactiva (getpass) si no
se pasa con --password.

Ejemplos:
    # Primer admin (ve todo, puede cargar):
    python scripts/manage_users.py create --admin sleyton --full-name "S. Leyton"

    # Viewer que solo ve Renta Residencial y USA:
    python scripts/manage_users.py create jperez --units RR,USA

    python scripts/manage_users.py list
    python scripts/manage_users.py passwd jperez
    python scripts/manage_users.py set-units jperez RR,USA,Hotel
    python scripts/manage_users.py set-role jperez admin
    python scripts/manage_users.py deactivate jperez
    python scripts/manage_users.py activate jperez
"""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# La consola de Windows suele ser cp1252 y revienta con ✓/✗. Forzamos UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001
    pass

from api import auth  # noqa: E402


def _ensure_table() -> None:
    """Crea la tabla si se puede. En prod el usuario runtime no tiene privilegio
    CREATE (la tabla la crea un DBA con db/ddl_app_users.sql); ahí seguimos y las
    operaciones DML de abajo funcionarán igual."""
    try:
        auth.init_db()
    except Exception as e:  # noqa: BLE001
        print(f"(aviso) no pude crear la tabla app_users ({e}); "
              f"asumo que ya existe.", file=sys.stderr)


def _ask_password(pw: str | None) -> str:
    if pw:
        return pw
    p1 = getpass.getpass("Contraseña: ")
    p2 = getpass.getpass("Repetir: ")
    if p1 != p2:
        sys.exit("Las contraseñas no coinciden.")
    if not p1:
        sys.exit("La contraseña no puede ser vacía.")
    return p1


def _units(csv: str | None) -> list[str]:
    return [u.strip() for u in (csv or "").split(",") if u.strip()]


def cmd_create(a: argparse.Namespace) -> None:
    _ensure_table()
    role = "admin" if a.admin else "viewer"
    username = a.admin or a.username
    if not username:
        sys.exit("Falta el usuario (usa 'create <usuario>' o 'create --admin <usuario>').")
    pw = _ask_password(a.password)
    units = _units(a.units)
    auth.create_user(username, pw, role=role, full_name=a.full_name, units=units)
    scope = "TODAS" if role == "admin" else (", ".join(units) or "—")
    print(f"✓ Usuario '{username}' creado/actualizado (rol={role}, unidades={scope}).")


def cmd_list(_a: argparse.Namespace) -> None:
    _ensure_table()
    users = auth.list_users()
    if not users:
        print("(sin usuarios)")
        return
    print(f"{'usuario':<20} {'rol':<8} {'activo':<7} unidades")
    print("-" * 60)
    for u in users:
        units = "TODAS" if u["is_admin"] else (", ".join(u["units"]) or "—")
        print(f"{u['username']:<20} {u['role']:<8} {'sí' if u['active'] else 'no':<7} {units}")


def cmd_passwd(a: argparse.Namespace) -> None:
    _ensure_table()
    if not auth.get_user(a.username):
        sys.exit(f"El usuario '{a.username}' no existe.")
    pw = _ask_password(a.password)
    auth.set_password(a.username, pw)
    print(f"✓ Contraseña de '{a.username}' actualizada.")


def cmd_set_units(a: argparse.Namespace) -> None:
    _ensure_table()
    if not auth.get_user(a.username):
        sys.exit(f"El usuario '{a.username}' no existe.")
    auth.set_units(a.username, _units(a.units))
    print(f"✓ Unidades de '{a.username}': {_units(a.units) or '—'}")


def cmd_set_role(a: argparse.Namespace) -> None:
    _ensure_table()
    if a.role not in ("admin", "viewer"):
        sys.exit("El rol debe ser 'admin' o 'viewer'.")
    if not auth.get_user(a.username):
        sys.exit(f"El usuario '{a.username}' no existe.")
    auth.set_role(a.username, a.role)
    print(f"✓ Rol de '{a.username}': {a.role}")


def cmd_active(a: argparse.Namespace, active: bool) -> None:
    _ensure_table()
    if not auth.get_user(a.username):
        sys.exit(f"El usuario '{a.username}' no existe.")
    auth.set_active(a.username, active)
    print(f"✓ '{a.username}' {'activado' if active else 'desactivado'}.")


def main() -> None:
    p = argparse.ArgumentParser(description="Gestión de usuarios Sanvest BI")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("create", help="crear/reemplazar usuario")
    c.add_argument("username", nargs="?", help="nombre de usuario (viewer)")
    c.add_argument("--admin", metavar="USER", help="crear como admin (ve todo)")
    c.add_argument("--password", help="clave (si se omite, se pide por consola)")
    c.add_argument("--full-name", dest="full_name", help="nombre completo")
    c.add_argument("--units", help="unidades visibles separadas por coma (solo viewer)")
    c.set_defaults(func=cmd_create)

    sub.add_parser("list", help="listar usuarios").set_defaults(func=cmd_list)

    c = sub.add_parser("passwd", help="cambiar contraseña")
    c.add_argument("username")
    c.add_argument("--password")
    c.set_defaults(func=cmd_passwd)

    c = sub.add_parser("set-units", help="fijar unidades visibles")
    c.add_argument("username")
    c.add_argument("units", help="unidades separadas por coma (ej: RR,USA)")
    c.set_defaults(func=cmd_set_units)

    c = sub.add_parser("set-role", help="fijar rol (admin|viewer)")
    c.add_argument("username")
    c.add_argument("role")
    c.set_defaults(func=cmd_set_role)

    c = sub.add_parser("deactivate", help="desactivar usuario")
    c.add_argument("username")
    c.set_defaults(func=lambda a: cmd_active(a, False))

    c = sub.add_parser("activate", help="reactivar usuario")
    c.add_argument("username")
    c.set_defaults(func=lambda a: cmd_active(a, True))

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

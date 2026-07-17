"""Autenticación y perfilado por rol (login usuario/contraseña + rol por unidad).

Cero dependencias nuevas, en línea con el estilo del proyecto (que ya trae su
propio loader de .env): hashing con hashlib.pbkdf2_hmac (stdlib) y token firmado
con hmac/hashlib (mini-JWT HMAC-SHA256). Comparaciones en tiempo constante con
hmac.compare_digest (mismo criterio que require_write).

Roles:
  - admin : ve TODAS las unidades y puede cargar datos.
  - viewer: ve solo las unidades de su lista `units` (JSON), solo lectura.

La tabla `app_users` (nombre no reservado en Postgres) se crea idempotente con
SQL portable (válido en SQLite dev y Postgres prod), reutilizando el engine de
api/db.py.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException
from sqlalchemy import text

from .db import engine

# ----------------------------- config ---------------------------------------
# Secreto para firmar tokens. En prod DEBE venir de SANVEST_AUTH_SECRET; el
# fallback solo sirve para dev local.
SECRET = (os.environ.get("SANVEST_AUTH_SECRET") or "dev-insecure-secret-change-me").encode()
TOKEN_TTL = int(os.environ.get("SANVEST_AUTH_TTL", str(12 * 3600)))  # segundos (12 h)
PBKDF2_ITERS = 200_000


# ----------------------------- tabla -----------------------------------------
def init_db() -> None:
    """Crea la tabla app_users si no existe. Idempotente y portable."""
    with engine.begin() as con:
        con.execute(text(
            """
            CREATE TABLE IF NOT EXISTS app_users (
              username      TEXT PRIMARY KEY,
              password_hash TEXT NOT NULL,
              full_name     TEXT,
              role          TEXT NOT NULL DEFAULT 'viewer',
              units         TEXT NOT NULL DEFAULT '[]',
              active        INTEGER NOT NULL DEFAULT 1,
              created_at    TEXT
            )
            """
        ))


# ----------------------------- password (pbkdf2) ------------------------------
def hash_password(pw: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, PBKDF2_ITERS)
    return f"pbkdf2${PBKDF2_ITERS}${salt.hex()}${dk.hex()}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        algo, iters, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), bytes.fromhex(salt_hex), int(iters))
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:  # noqa: BLE001 — cualquier formato inválido = no verifica
        return False


# ----------------------------- token (mini-JWT HMAC) -------------------------
def _b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def _b64u_dec(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_token(username: str, role: str, ttl: int = TOKEN_TTL) -> str:
    payload = {"sub": username, "role": role, "exp": int(time.time()) + ttl}
    body = _b64u(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = _b64u(hmac.new(SECRET, body.encode("ascii"), hashlib.sha256).digest())
    return f"{body}.{sig}"


def read_token(token: str) -> dict | None:
    """Devuelve el payload si la firma es válida y no expiró; si no, None."""
    try:
        body, sig = token.split(".")
        expected = _b64u(hmac.new(SECRET, body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(_b64u_dec(body))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:  # noqa: BLE001
        return None


# ----------------------------- almacén de usuarios ---------------------------
def _row_to_user(row: Any) -> dict:
    u = dict(row)
    try:
        u["units"] = json.loads(u.get("units") or "[]")
    except Exception:  # noqa: BLE001
        u["units"] = []
    u["active"] = bool(u.get("active"))
    return u


def get_user(username: str) -> dict | None:
    with engine.connect() as con:
        row = con.execute(
            text("SELECT * FROM app_users WHERE username = :u"), {"u": username}
        ).mappings().first()
    return _row_to_user(row) if row else None


def list_users() -> list[dict]:
    with engine.connect() as con:
        rows = con.execute(
            text("SELECT * FROM app_users ORDER BY username")
        ).mappings().all()
    return [public_user(_row_to_user(r)) for r in rows]


def public_user(u: dict) -> dict:
    """Vista del usuario para el front / respuestas (sin el hash de la clave)."""
    is_admin = u["role"] == "admin"
    return {
        "username": u["username"],
        "full_name": u.get("full_name"),
        "role": u["role"],
        "units": u["units"],       # unidades visibles del viewer (admin ve todo igual)
        "active": u["active"],
        "is_admin": is_admin,
        "can_upload": is_admin,    # decisión de negocio: carga solo admin
    }


def authenticate(username: str, password: str) -> dict | None:
    u = get_user(username)
    if not u or not u["active"]:
        return None
    if not verify_password(password, u["password_hash"]):
        return None
    return u


def create_user(username: str, password: str, *, role: str = "viewer",
                full_name: str | None = None, units: list[str] | None = None) -> None:
    """Crea o reemplaza (upsert manual portable) un usuario."""
    row = {
        "u": username,
        "ph": hash_password(password),
        "fn": full_name,
        "r": role,
        "un": json.dumps(units or []),
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    with engine.begin() as con:
        exists = con.execute(
            text("SELECT 1 FROM app_users WHERE username = :u"), {"u": username}
        ).first()
        if exists:
            con.execute(text(
                "UPDATE app_users SET password_hash=:ph, full_name=:fn, role=:r, "
                "units=:un, active=1 WHERE username=:u"), row)
        else:
            con.execute(text(
                "INSERT INTO app_users (username, password_hash, full_name, role, "
                "units, active, created_at) VALUES (:u, :ph, :fn, :r, :un, 1, :ts)"), row)


def set_password(username: str, password: str) -> bool:
    with engine.begin() as con:
        res = con.execute(text(
            "UPDATE app_users SET password_hash=:ph WHERE username=:u"),
            {"ph": hash_password(password), "u": username})
        return res.rowcount > 0


def set_full_name(username: str, full_name: str | None) -> bool:
    with engine.begin() as con:
        res = con.execute(text("UPDATE app_users SET full_name=:fn WHERE username=:u"),
                          {"fn": full_name, "u": username})
        return res.rowcount > 0


def set_role(username: str, role: str) -> bool:
    with engine.begin() as con:
        res = con.execute(text("UPDATE app_users SET role=:r WHERE username=:u"),
                          {"r": role, "u": username})
        return res.rowcount > 0


def set_units(username: str, units: list[str]) -> bool:
    with engine.begin() as con:
        res = con.execute(text("UPDATE app_users SET units=:un WHERE username=:u"),
                          {"un": json.dumps(units), "u": username})
        return res.rowcount > 0


def set_active(username: str, active: bool) -> bool:
    with engine.begin() as con:
        res = con.execute(text("UPDATE app_users SET active=:a WHERE username=:u"),
                          {"a": 1 if active else 0, "u": username})
        return res.rowcount > 0


def count_users() -> int:
    with engine.connect() as con:
        return con.execute(text("SELECT COUNT(*) FROM app_users")).scalar() or 0


# ----------------------------- perfilado -------------------------------------
def user_can_see(user: dict, unit: str) -> bool:
    """¿El usuario puede ver esta unidad? Admin ve todo; viewer solo su lista."""
    return user["role"] == "admin" or unit in (user.get("units") or [])


def visible_units(user: dict, all_units: list[str]) -> list[str]:
    if user["role"] == "admin":
        return list(all_units)
    allowed = set(user.get("units") or [])
    return [u for u in all_units if u in allowed]


# ----------------------------- dependencias FastAPI --------------------------
def current_user(authorization: str | None = Header(None)) -> dict:
    """Valida el Bearer token y devuelve el usuario (activo). 401 si no."""
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    payload = read_token(token) if token else None
    if not payload:
        raise HTTPException(401, "No autenticado: token ausente, inválido o expirado.")
    u = get_user(str(payload.get("sub", "")))
    if not u or not u["active"]:
        raise HTTPException(401, "Usuario no válido o inactivo.")
    return u


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Acción restringida al rol admin.")
    return user


def require_unit_access(unit: str, user: dict = Depends(current_user)) -> dict:
    """Dependencia para rutas con {unit}: 403 si el usuario no ve esa unidad."""
    if not user_can_see(user, unit):
        raise HTTPException(403, f"Sin acceso a la unidad '{unit}'.")
    return user

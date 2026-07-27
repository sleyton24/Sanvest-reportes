"""Baja a minúsculas los usernames (emails) existentes para que el login sea
case-insensitive de raíz (el código ya normaliza en api/auth.py; esto alinea las
filas ya guardadas). Toca app_users (clave) y, por consistencia, access_log y
comments. Aborta si dos usuarios colapsarían al mismo email en minúscula
(colisión que habría que resolver a mano)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:  # la consola Windows suele ser cp1252 y revienta con acentos/símbolos
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
from etl.db import get_engine
from sqlalchemy import text

def main(apply: bool):
    eng = get_engine()
    with eng.begin() as c:
        rows = c.execute(text("SELECT username FROM app_users")).fetchall()
        upper = [r[0] for r in rows if r[0] != r[0].strip().lower()]
        lowers = {r[0].strip().lower() for r in rows}
        print(f"app_users: {len(rows)} filas · con mayúscula/espacios: {len(upper)}")
        # colisión: el target en minúscula ya existe como OTRA fila
        clash = [u for u in upper if u.strip().lower() in lowers and
                 sum(1 for r in rows if r[0].strip().lower() == u.strip().lower()) > 1]
        if clash:
            print(f"  ¡COLISIÓN! estos colapsarían sobre una fila existente: {clash}")
            print("  aborto: resolver a mano (merge de usuarios)."); return
        for u in upper:
            print(f"  {u!r} -> {u.strip().lower()!r}")
        if not apply:
            # también reporta las otras tablas
            for t in ("access_log", "comments"):
                n = c.execute(text(f'SELECT COUNT(*) FROM {t} WHERE username <> LOWER(TRIM(username))')).scalar()
                print(f"  {t}: filas a normalizar = {n}")
            print("  (dry-run) usar --apply"); return
        for u in upper:
            c.execute(text("UPDATE app_users SET username=:new WHERE username=:old"),
                      {"new": u.strip().lower(), "old": u})
        for t in ("access_log", "comments"):
            n = c.execute(text(f'UPDATE {t} SET username=LOWER(TRIM(username)) WHERE username <> LOWER(TRIM(username))')).rowcount
            print(f"  {t}: {n} filas normalizadas")
        print(f"  app_users: {len(upper)} filas normalizadas OK")

if __name__ == "__main__":
    main("--apply" in sys.argv)

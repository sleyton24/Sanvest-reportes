"""Aviso por correo: los reportes Sanvest ya están cargados.

Envía un mail desde la cuenta SMTP (Office 365 / sofia@sanvest.cl) a los
destinatarios configurados. Sin secretos en código: host, usuario, clave y
lista de correos salen del entorno. El cooldown anti-doble-clic vive en
memoria del proceso (suficiente con 1–2 workers de uvicorn).
"""
from __future__ import annotations

import os
import re
import smtplib
import threading
import time
from datetime import datetime
from email.message import EmailMessage
from zoneinfo import ZoneInfo

# ----------------------------- errores --------------------------------------
class AvisoError(Exception):
    """Error controlado del aviso (el endpoint lo traduce a HTTPException)."""

    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(detail)


# ----------------------------- config ---------------------------------------
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_TZ = ZoneInfo("America/Santiago")
_DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
_MESES = ("enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")

# Cooldown en memoria (anti-doble-clic). Se reserva el slot ANTES de enviar
# para que dos clics simultáneos no disparen dos mails.
_lock = threading.Lock()
_last_sent_mono: float = 0.0


def reset_cooldown_for_tests() -> None:
    """Solo tests: deja el cooldown como si nunca se hubiera enviado."""
    global _last_sent_mono
    with _lock:
        _last_sent_mono = 0.0


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def cooldown_segundos() -> int:
    raw = _env("REPORTES_AVISO_COOLDOWN", "60")
    try:
        return max(0, int(raw))
    except ValueError:
        return 60


def roles_aviso() -> set[str]:
    """Roles que pueden disparar el aviso. Por defecto solo admin."""
    raw = _env("REPORTES_AVISO_ROLES", "admin")
    return {p.strip().lower() for p in raw.split(",") if p.strip()} or {"admin"}


def user_can_avisar(user: dict | None) -> bool:
    if not user or not user.get("active", True):
        return False
    return str(user.get("role") or "").strip().lower() in roles_aviso()


def parse_destinatarios(raw: str | None) -> list[str]:
    """Lista de correos desde 'a@x.cl, b@y.cl'. Descarta vacíos e inválidos."""
    if not raw:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for part in raw.replace(";", ",").split(","):
        mail = part.strip().lower()
        if not mail or mail in seen or not _EMAIL_RE.match(mail):
            continue
        seen.add(mail)
        out.append(mail)
    return out


def destinatarios_desde_env() -> list[str]:
    return parse_destinatarios(_env("REPORTES_AVISO_DESTINATARIOS"))


def public_url() -> str | None:
    url = _env("REPORTES_PUBLIC_URL") or _env("SANVEST_PUBLIC_URL")
    return url.rstrip("/") if url else None


def smtp_config() -> dict[str, str | int]:
    """Config SMTP Office365. La clave NUNCA se loguea ni se devuelve al cliente."""
    user = _env("SMTP_USER") or _env("SMTP_USERNAME")
    password = _env("SMTP_PASSWORD") or _env("SMTP_PASS")
    frm = _env("SMTP_FROM") or user or "sofia@sanvest.cl"
    host = _env("SMTP_HOST") or "smtp.office365.com"
    port_raw = _env("SMTP_PORT", "587")
    try:
        port = int(port_raw)
    except ValueError:
        port = 587
    return {"host": host, "port": port, "user": user, "password": password, "from": frm}


def ahora_santiago(now: datetime | None = None) -> datetime:
    if now is None:
        return datetime.now(_TZ)
    if now.tzinfo is None:
        return now.replace(tzinfo=_TZ)
    return now.astimezone(_TZ)


def formatear_fecha(dt: datetime) -> str:
    local = ahora_santiago(dt)
    return (f"{_DIAS[local.weekday()]} {local.day} de {_MESES[local.month - 1]} "
            f"de {local.year}, {local.strftime('%H:%M')} (America/Santiago)")


def resolver_destinatarios(extra: list[str] | None = None) -> list[str]:
    """Prioriza REPORTES_AVISO_DESTINATARIOS. Si está vacía, admite la lista del cuerpo."""
    env_list = destinatarios_desde_env()
    if env_list:
        return env_list
    if extra:
        # Reusa el parser (acepta ya-lista o vuelve a validar uno a uno)
        return parse_destinatarios(",".join(extra))
    raise AvisoError(
        400,
        "No hay destinatarios. Define REPORTES_AVISO_DESTINATARIOS en el entorno "
        "(correos separados por coma) o envía la lista en el cuerpo de la petición.",
    )


def armar_mensaje(*, destinatarios: list[str], enviado_por: str,
                  ahora: datetime | None = None) -> EmailMessage:
    when = ahora_santiago(ahora)
    fecha = formatear_fecha(when)
    url = public_url()
    asunto = "Sanvest Reportes — los reportes ya están cargados"
    link_txt = f"\nAbrir la app: {url}\n" if url else ""
    link_html = (f'<p><a href="{url}">Abrir la app de reportes Sanvest</a></p>'
                 if url else "")
    texto = (
        "Los reportes Sanvest ya están cargados y disponibles.\n\n"
        f"Fecha y hora: {fecha}\n"
        f"{link_txt}\n"
        "—\n"
        "Aviso enviado desde Reportes Sanvest"
        + (f" por {enviado_por}." if enviado_por else ".")
    )
    html = f"""\
<html>
  <body style="font-family: Avenir Next, Segoe UI, sans-serif; color: #0F1E36;
               background: #FCFAF4; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff;
                border: 1px solid #e4dcc8; border-radius: 12px; padding: 28px 32px;">
      <p style="font-size: 13px; letter-spacing: 1.4px; text-transform: uppercase;
                 color: #A8C813; font-weight: 700; margin: 0 0 12px;">Sanvest</p>
      <h1 style="font-size: 20px; margin: 0 0 16px;">Los reportes Sanvest ya están
          cargados y disponibles</h1>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 8px;">
        Los informes de gestión ya están publicados en la app de Reportes Sanvest.
      </p>
      <p style="font-size: 14px; color: #5f6b7d; margin: 0 0 16px;">
        Fecha y hora: <strong style="color: #0F1E36;">{fecha}</strong>
      </p>
      {link_html}
      <p style="font-size: 12px; color: #5f6b7d; margin: 24px 0 0; border-top:
                 1px solid #e4dcc8; padding-top: 12px;">
        Aviso enviado desde Reportes Sanvest
        {f" por {enviado_por}" if enviado_por else ""}.
      </p>
    </div>
  </body>
</html>
"""
    cfg = smtp_config()
    msg = EmailMessage()
    msg["Subject"] = asunto
    msg["From"] = str(cfg["from"])
    msg["To"] = ", ".join(destinatarios)
    msg.set_content(texto)
    msg.add_alternative(html, subtype="html")
    return msg


def enviar_smtp(msg: EmailMessage, destinatarios: list[str]) -> None:
    cfg = smtp_config()
    if not cfg["user"] or not cfg["password"]:
        raise AvisoError(
            503,
            "Falta SMTP_USER o SMTP_PASSWORD (o SMTP_PASS) en el entorno. "
            "No se envió el aviso.",
        )
    host, port = str(cfg["host"]), int(cfg["port"])
    try:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(str(cfg["user"]), str(cfg["password"]))
            smtp.sendmail(str(cfg["from"]), destinatarios, msg.as_string())
    except AvisoError:
        raise
    except Exception as e:  # noqa: BLE001 — no filtrar al cliente el traceback SMTP
        raise AvisoError(502, f"No se pudo enviar el correo: {type(e).__name__}: {e}") from e


def _reservar_cooldown() -> None:
    """Si el último envío (o intento) fue hace menos de N segundos, 429."""
    global _last_sent_mono
    wait = cooldown_segundos()
    if wait <= 0:
        return
    with _lock:
        now = time.monotonic()
        elapsed = now - _last_sent_mono
        if _last_sent_mono and elapsed < wait:
            queda = int(wait - elapsed) + 1
            raise AvisoError(
                429,
                f"Espera {queda} segundo{'s' if queda != 1 else ''} antes de "
                "volver a enviar el aviso (anti doble clic).",
            )
        _last_sent_mono = now


def disparar_aviso(*, username: str, extra: list[str] | None = None,
                   send=None, ahora: datetime | None = None) -> dict:
    """Resuelve destinatarios, reserva cooldown y envía. `send` es inyectable (tests)."""
    dest = resolver_destinatarios(extra)
    _reservar_cooldown()
    msg = armar_mensaje(destinatarios=dest, enviado_por=username, ahora=ahora)
    (send or enviar_smtp)(msg, dest)
    when = ahora_santiago(ahora)
    return {
        "ok": True,
        "enviados": len(dest),
        "destinatarios": dest,
        "enviado_en": formatear_fecha(when),
        "asunto": str(msg["Subject"]),
    }

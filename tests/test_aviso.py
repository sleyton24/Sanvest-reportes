"""Tests del aviso «reportes cargados»: parser, permisos, SMTP mockeado, HTTP.

Correr desde la raíz del repo:
    python -m unittest tests.test_aviso
"""
from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Entorno de prueba ANTES de importar la API (smtp, destinatarios, roles, cooldown).
os.environ.setdefault("SANVEST_AUTH_SECRET", "test-aviso-secret")
os.environ["SMTP_HOST"] = "smtp.office365.com"
os.environ["SMTP_PORT"] = "587"
os.environ["SMTP_USER"] = "sofia@sanvest.cl"
os.environ["SMTP_PASSWORD"] = "no-es-un-secreto-real"
os.environ["SMTP_FROM"] = "sofia@sanvest.cl"
os.environ["REPORTES_AVISO_DESTINATARIOS"] = "ana@sanvest.cl,  bob@sanvest.cl"
os.environ["REPORTES_PUBLIC_URL"] = "https://reportes.sanvest.cl"
os.environ["REPORTES_AVISO_ROLES"] = "admin"
os.environ["REPORTES_AVISO_COOLDOWN"] = "60"

from api import aviso  # noqa: E402
from api import auth  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from api.main import app  # noqa: E402


ADMIN = {"username": "sebastian@sanvest.cl", "role": "admin", "active": True,
         "units": [], "can_ask": True, "full_name": "Sebastián"}
VIEWER = {"username": "viewer@sanvest.cl", "role": "viewer", "active": True,
          "units": ["DV"], "can_ask": False, "full_name": "Viewer"}


class ParseDestinatarios(unittest.TestCase):
    def test_coma_y_espacios(self):
        self.assertEqual(
            aviso.parse_destinatarios(" ana@sanvest.cl, bob@sanvest.cl ;caro@x.cl "),
            ["ana@sanvest.cl", "bob@sanvest.cl", "caro@x.cl"],
        )

    def test_vacio_e_invalidos(self):
        self.assertEqual(aviso.parse_destinatarios(""), [])
        self.assertEqual(aviso.parse_destinatarios(None), [])
        self.assertEqual(aviso.parse_destinatarios("hola, no-es-mail, a@b.cl"), ["a@b.cl"])

    def test_dedup(self):
        self.assertEqual(
            aviso.parse_destinatarios("a@x.cl, A@x.cl, a@x.cl"),
            ["a@x.cl"],
        )


class Permisos(unittest.TestCase):
    def test_admin_puede(self):
        self.assertTrue(aviso.user_can_avisar(ADMIN))

    def test_viewer_no(self):
        self.assertFalse(aviso.user_can_avisar(VIEWER))

    def test_roles_extra(self):
        with patch.dict(os.environ, {"REPORTES_AVISO_ROLES": "admin,viewer"}):
            self.assertTrue(aviso.user_can_avisar(VIEWER))

    def test_inactivo_no(self):
        self.assertFalse(aviso.user_can_avisar({**ADMIN, "active": False}))


class Mensaje(unittest.TestCase):
    def test_asunto_cuerpo_y_link(self):
        dt = datetime(2026, 9, 10, 10, 44, tzinfo=ZoneInfo("America/Santiago"))
        msg = aviso.armar_mensaje(
            destinatarios=["ana@sanvest.cl"], enviado_por="sebastian@sanvest.cl", ahora=dt)
        self.assertIn("ya están cargados", msg["Subject"])
        self.assertEqual(msg["From"], "sofia@sanvest.cl")
        cuerpo = msg.get_body(preferencelist=("plain",)).get_content()
        self.assertIn("Los reportes Sanvest ya están cargados", cuerpo)
        self.assertIn("America/Santiago", cuerpo)
        self.assertIn("https://reportes.sanvest.cl", cuerpo)
        self.assertIn("10 de septiembre de 2026", cuerpo)


class SmtpMock(unittest.TestCase):
    def test_login_starttls_sendmail(self):
        msg = aviso.armar_mensaje(
            destinatarios=["ana@sanvest.cl"], enviado_por="seba")
        smtp_cm = MagicMock()
        smtp = smtp_cm.__enter__.return_value
        with patch("api.aviso.smtplib.SMTP", return_value=smtp_cm) as ctor:
            aviso.enviar_smtp(msg, ["ana@sanvest.cl"])
        ctor.assert_called_once_with("smtp.office365.com", 587, timeout=30)
        smtp.starttls.assert_called_once()
        smtp.login.assert_called_once_with("sofia@sanvest.cl", "no-es-un-secreto-real")
        smtp.sendmail.assert_called_once()
        args = smtp.sendmail.call_args[0]
        self.assertEqual(args[0], "sofia@sanvest.cl")
        self.assertEqual(args[1], ["ana@sanvest.cl"])

    def test_alias_reportes_smtp(self):
        env = {
            "REPORTES_SMTP_HOST": "smtp.office365.com",
            "REPORTES_SMTP_PORT": "587",
            "REPORTES_SMTP_USER": "sofia@sanvest.cl",
            "REPORTES_SMTP_PASSWORD": "clave-propia-bi",
            "REPORTES_SMTP_FROM": "sofia@sanvest.cl",
            "SMTP_HOST": "", "SMTP_PORT": "", "SMTP_USER": "",
            "SMTP_PASSWORD": "", "SMTP_PASS": "", "SMTP_FROM": "",
            "SMTP_USERNAME": "",
        }
        with patch.dict(os.environ, env, clear=False):
            cfg = aviso.smtp_config()
        self.assertEqual(cfg["user"], "sofia@sanvest.cl")
        self.assertEqual(cfg["password"], "clave-propia-bi")
        self.assertEqual(cfg["host"], "smtp.office365.com")
        self.assertEqual(cfg["port"], 587)

    def test_sin_password_no_toca_smtp(self):
        msg = aviso.armar_mensaje(destinatarios=["ana@sanvest.cl"], enviado_por="seba")
        vacio = {
            "REPORTES_SMTP_USER": "sofia@sanvest.cl", "REPORTES_SMTP_PASSWORD": "",
            "REPORTES_SMTP_FROM": "sofia@sanvest.cl", "REPORTES_SMTP_HOST": "smtp.office365.com",
            "REPORTES_SMTP_PORT": "587",
            "SMTP_USER": "", "SMTP_USERNAME": "", "SMTP_PASSWORD": "", "SMTP_PASS": "",
            "SMTP_FROM": "", "SMTP_HOST": "", "SMTP_PORT": "",
        }
        with patch("api.aviso._env", side_effect=lambda n, d="": vacio.get(n, d)):
            with patch("api.aviso.smtplib.SMTP") as ctor:
                with self.assertRaises(aviso.AvisoError) as ctx:
                    aviso.enviar_smtp(msg, ["ana@sanvest.cl"])
        self.assertEqual(ctx.exception.status, 503)
        ctor.assert_not_called()


class Disparo(unittest.TestCase):
    def setUp(self):
        aviso.reset_cooldown_for_tests()

    def test_envia_a_lista_de_env(self):
        sent = []

        def fake_send(msg, dest):
            sent.append((msg, dest))

        res = aviso.disparar_aviso(username="seba", send=fake_send)
        self.assertTrue(res["ok"])
        self.assertEqual(res["enviados"], 2)
        self.assertEqual(res["origen"], "env")
        self.assertEqual(sent[0][1], ["ana@sanvest.cl", "bob@sanvest.cl"])

    def test_cooldown(self):
        aviso.disparar_aviso(username="seba", send=lambda *_: None)
        with self.assertRaises(aviso.AvisoError) as ctx:
            aviso.disparar_aviso(username="seba", send=lambda *_: None)
        self.assertEqual(ctx.exception.status, 429)

    def test_sin_destinatarios(self):
        with patch.dict(os.environ, {"REPORTES_AVISO_DESTINATARIOS": ""}):
            with self.assertRaises(aviso.AvisoError) as ctx:
                aviso.disparar_aviso(username="seba", extra=None, send=lambda *_: None,
                                     admins=[])
        self.assertEqual(ctx.exception.status, 400)
        self.assertIn("REPORTES_AVISO_DESTINATARIOS", ctx.exception.detail)

    def test_cuerpo_si_env_vacio(self):
        with patch.dict(os.environ, {"REPORTES_AVISO_DESTINATARIOS": ""}):
            res = aviso.disparar_aviso(
                username="seba", extra=["otro@sanvest.cl"], send=lambda *_: None,
                admins=[])
        self.assertEqual(res["destinatarios"], ["otro@sanvest.cl"])
        self.assertEqual(res["origen"], "cuerpo")

    def test_fallback_admins(self):
        with patch.dict(os.environ, {"REPORTES_AVISO_DESTINATARIOS": ""}):
            res = aviso.disparar_aviso(
                username="seba", extra=None, send=lambda *_: None,
                admins=["sleyton@sanvest.cl", "no-es-mail", "sleyton@sanvest.cl"])
        self.assertEqual(res["destinatarios"], ["sleyton@sanvest.cl"])
        self.assertEqual(res["origen"], "admins")

    def test_env_gana_sobre_admins(self):
        res = aviso.disparar_aviso(
            username="seba", send=lambda *_: None,
            admins=["otro@sanvest.cl"])
        self.assertEqual(res["origen"], "env")
        self.assertEqual(res["destinatarios"], ["ana@sanvest.cl", "bob@sanvest.cl"])

    def test_admins_desde_app_users(self):
        fake = [
            {"username": "sleyton@sanvest.cl", "role": "admin", "active": True},
            {"username": "viewer@sanvest.cl", "role": "viewer", "active": True},
            {"username": "old@sanvest.cl", "role": "admin", "active": False},
            {"username": "admin-sin-mail", "role": "admin", "active": True},
        ]
        with patch("api.auth.list_users", return_value=fake):
            self.assertEqual(aviso.destinatarios_desde_admins(), ["sleyton@sanvest.cl"])


class Endpoint(unittest.TestCase):
    def setUp(self):
        aviso.reset_cooldown_for_tests()
        app.dependency_overrides.clear()
        self.client = TestClient(app)
        self.smtp_patch = patch("api.aviso.smtplib.SMTP")
        self.smtp_ctor = self.smtp_patch.start()
        smtp = self.smtp_ctor.return_value.__enter__.return_value
        smtp.sendmail.return_value = {}

    def tearDown(self):
        self.smtp_patch.stop()
        app.dependency_overrides.clear()

    def _as(self, user: dict) -> None:
        app.dependency_overrides[auth.current_user] = lambda: user
        app.dependency_overrides[auth.require_aviso] = lambda: user
        # require_aviso depende de current_user; si no overrideamos require_aviso,
        # FastAPI resuelve current_user. Override de current_user basta SI no
        # pisamos require_aviso. Dejamos ambos alineados.

    def test_401_sin_token_no_envia(self):
        r = self.client.post("/aviso/reportes-cargados", json={})
        self.assertEqual(r.status_code, 401)
        self.smtp_ctor.assert_not_called()

    def test_403_viewer_no_envia(self):
        # Solo override current_user: require_aviso lo usa y debe 403.
        app.dependency_overrides[auth.current_user] = lambda: VIEWER
        r = self.client.post("/aviso/reportes-cargados", json={})
        self.assertEqual(r.status_code, 403)
        self.smtp_ctor.assert_not_called()

    def test_200_admin_envia(self):
        app.dependency_overrides[auth.current_user] = lambda: ADMIN
        r = self.client.post("/aviso/reportes-cargados", json={})
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["enviados"], 2)
        self.assertEqual(data["origen"], "env")
        self.smtp_ctor.assert_called()
        smtp = self.smtp_ctor.return_value.__enter__.return_value
        smtp.login.assert_called()
        smtp.sendmail.assert_called()

    def test_429_doble_clic(self):
        app.dependency_overrides[auth.current_user] = lambda: ADMIN
        r1 = self.client.post("/aviso/reportes-cargados", json={})
        self.assertEqual(r1.status_code, 200, r1.text)
        r2 = self.client.post("/aviso/reportes-cargados", json={})
        self.assertEqual(r2.status_code, 429)
        self.assertEqual(self.smtp_ctor.call_count, 1)

    def test_403_no_cuenta_cooldown(self):
        app.dependency_overrides[auth.current_user] = lambda: VIEWER
        r = self.client.post("/aviso/reportes-cargados", json={})
        self.assertEqual(r.status_code, 403)
        app.dependency_overrides[auth.current_user] = lambda: ADMIN
        r2 = self.client.post("/aviso/reportes-cargados", json={})
        self.assertEqual(r2.status_code, 200, r2.text)


if __name__ == "__main__":
    unittest.main()

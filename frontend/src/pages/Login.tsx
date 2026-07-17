import { FormEvent, useState } from "react";
import { LoginError } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/Button";

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setErr(e instanceof LoginError && e.status === 401
        ? "Usuario o contraseña incorrectos."
        : "El servidor no respondió (no es un problema de tu clave). Vuelve a intentar.");
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <img className="login__logo" src="/sanvest-azul.png" alt="Sanvest" />
        <div className="login__title">Reportes · Inteligencia de Negocios</div>
        <label className="login__field">
          <span>Usuario</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            autoFocus autoComplete="username" />
        </label>
        <label className="login__field">
          <span>Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" />
        </label>
        {err && <div className="login__err">{err}</div>}
        <Button variant="primary" type="submit" disabled={busy || !username || !password}
          className="login__btn">
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

// Modal "Cambiar mi contraseña" (cualquier rol). Se abre al hacer clic en tu
// nombre en la barra superior. Exige la clave actual.
import { FormEvent, useState } from "react";
import { changePassword } from "../api";
import { Button } from "./Button";

export function ChangePassword({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState("");
  const [nu1, setNu1] = useState("");
  const [nu2, setNu2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (nu1 !== nu2) { setErr("Las contraseñas nuevas no coinciden."); return; }
    if (nu1.length < 8) { setErr("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    setBusy(true);
    try {
      await changePassword(cur, nu1);
      setOk(true);
      window.setTimeout(onClose, 1600);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pwmodal" onClick={onClose}>
      <form className="pwmodal__card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="pwmodal__title">Cambiar mi contraseña</div>
        <label className="kpi-in"><span>Contraseña actual</span>
          <input type="password" value={cur} autoFocus autoComplete="current-password"
            onChange={(e) => setCur(e.target.value)} required /></label>
        <label className="kpi-in"><span>Nueva contraseña (mín. 8)</span>
          <input type="password" value={nu1} autoComplete="new-password"
            onChange={(e) => setNu1(e.target.value)} required /></label>
        <label className="kpi-in"><span>Repetir nueva contraseña</span>
          <input type="password" value={nu2} autoComplete="new-password"
            onChange={(e) => setNu2(e.target.value)} required /></label>
        {err && <div className="agent__error">{err}</div>}
        {ok && <div className="upload__msg upload__msg--ok">✓ Contraseña actualizada.</div>}
        <div className="pwmodal__foot">
          <Button variant="primary" type="submit" disabled={busy || ok || !cur || !nu1 || !nu2}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

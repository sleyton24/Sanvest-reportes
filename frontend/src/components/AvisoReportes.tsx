// Botón para avisar por correo que los reportes Sanvest ya están cargados.
// Visible en el header (y opcionalmente en Admin ▸ Carga) para quien tenga
// `can_aviso` (admin por defecto). Confirma en un modal y muestra un toast.
import { useState } from "react";
import { enviarAvisoReportes } from "../api";
import { Button } from "./Button";

type Variant = "nav" | "panel";
type Toast = { kind: "ok" | "err"; text: string } | null;

export function AvisoReportes({ variant = "nav" }: { variant?: Variant }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 6000);
  };

  const enviar = async () => {
    setBusy(true);
    try {
      const res = await enviarAvisoReportes();
      setOpen(false);
      const n = res.enviados;
      showToast("ok", `Aviso enviado a ${n} destinatario${n === 1 ? "" : "s"}.`);
    } catch (e) {
      showToast("err", (e as Error).message || "No se pudo enviar el aviso.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {variant === "nav" ? (
        <button
          className="topnav__pdf topnav__aviso"
          onClick={() => setOpen(true)}
          title="Avisar por correo que los reportes ya están cargados"
        >
          🔔 Avisar
        </button>
      ) : (
        <div className="aviso-panel">
          <div>
            <div className="aviso-panel__title">Aviso de reportes cargados</div>
            <p className="aviso-panel__lead">
              Envía un correo a los destinatarios configurados informando que los
              reportes Sanvest ya están disponibles.
            </p>
          </div>
          <Button variant="primary" onClick={() => setOpen(true)}>
            🔔 Avisar que los reportes están cargados
          </Button>
        </div>
      )}

      {open && (
        <div className="pwmodal" onClick={() => !busy && setOpen(false)}>
          <div className="pwmodal__card aviso-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwmodal__title">¿Enviar el aviso de reportes cargados?</div>
            <p className="aviso-modal__txt">
              Se mandará un correo desde la cuenta configurada (SofIA / Office 365)
              avisando que <strong>los reportes Sanvest ya están cargados y
              disponibles</strong>, con fecha y hora de Chile.
            </p>
            <p className="aviso-modal__txt aviso-modal__txt--muted">
              Los destinatarios salen de la configuración del servidor
              (<code>REPORTES_AVISO_DESTINATARIOS</code>). No se puede deshacer el envío.
            </p>
            <div className="pwmodal__foot">
              <Button variant="primary" onClick={enviar} disabled={busy}>
                {busy ? "Enviando…" : "Enviar aviso"}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={"aviso-toast aviso-toast--" + toast.kind} role="status">
          {toast.kind === "ok" ? "✓ " : "✗ "}{toast.text}
        </div>
      )}
    </>
  );
}

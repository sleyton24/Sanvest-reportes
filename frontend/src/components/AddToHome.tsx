// Botón "Agregar a la pantalla de inicio" para iPhone/iPad. iOS no permite un
// prompt de instalación programático (como Android), así que mostramos las
// instrucciones de Safari (Compartir → Agregar a inicio). Solo se muestra en iOS
// y cuando la app NO está ya instalada (modo standalone).
import { useState } from "react";
import { Button } from "./Button";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se hace pasar por Mac: se detecta por pantalla táctil.
  const iPadOS = navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return iOS || iPadOS;
}
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true);
}
function inSafari(): boolean {
  const ua = navigator.userAgent || "";
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(ua);
}
function isIPad(): boolean {
  return /iPad/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
}

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" /><path d="M8 7l4-4 4 4" />
    <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
    strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 9v6M9 12h6" />
  </svg>
);

export function AddToHome() {
  const [open, setOpen] = useState(false);
  // Solo tiene sentido en iPhone/iPad y si aún no está instalada como app.
  if (!isIOS() || isStandalone()) return null;
  const device = isIPad() ? "iPad" : "iPhone";
  return (
    <>
      <button className="a2hs-btn" onClick={() => setOpen(true)}>
        <PlusIcon /> Agregar a la pantalla de inicio
      </button>
      {open && (
        <div className="a2hs__backdrop" onClick={() => setOpen(false)}>
          <div className="a2hs" onClick={(e) => e.stopPropagation()}>
            <div className="a2hs__head">
              <div className="a2hs__title">Instalar en tu {device}</div>
              <button className="a2hs__close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <p className="a2hs__intro">
              Deja Sanvest BI como una app: un ícono en tu pantalla de inicio que abre a
              pantalla completa, como cualquier aplicación.
            </p>
            <ol className="a2hs__steps">
              <li><span className="a2hs__num">1</span>
                <span>Abre esta página en <strong>Safari</strong> (el ícono azul de brújula).</span></li>
              <li><span className="a2hs__num">2</span>
                <span>Toca el botón <strong>Compartir</strong>
                  <span className="a2hs__share"><ShareIcon /></span>
                  {device === "iPad" ? " (arriba, junto a la barra de direcciones)." : " (en la barra de abajo)."}</span></li>
              <li><span className="a2hs__num">3</span>
                <span>Desliza hacia abajo y elige <strong>«Agregar a pantalla de inicio»</strong>.</span></li>
              <li><span className="a2hs__num">4</span>
                <span>Toca <strong>Agregar</strong> (arriba a la derecha). ¡Listo!</span></li>
            </ol>
            {!inSafari() && (
              <div className="a2hs__warn">
                Estás en otro navegador. En iPhone/iPad, «Agregar a inicio» solo funciona desde
                <strong> Safari</strong>: copia este enlace y ábrelo en Safari.
              </div>
            )}
            <div className="a2hs__foot">
              <Button variant="primary" onClick={() => setOpen(false)}>Entendido</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

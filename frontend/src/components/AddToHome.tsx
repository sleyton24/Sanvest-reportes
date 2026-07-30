// Botón "Agregar a la pantalla de inicio" para iPad/iPhone (y Android). iOS no
// permite un prompt de instalación programático, así que mostramos los pasos de
// Safari (Compartir → Agregar a inicio). Se muestra en CUALQUIER pantalla táctil
// que no esté ya instalada: iPadOS moderno se hace pasar por Mac de escritorio
// (user-agent sin "iPad", navigator.platform poco fiable), así que detectar "es
// iOS" por UA fallaba y el botón no aparecía — el puntero grueso no miente.
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

function isTouch(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(any-pointer: coarse)").matches ||
    (navigator.maxTouchPoints || 0) > 0;
}
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true);
}
function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent || "");
}
// Nota: NO se intenta detectar "es iPad" por user-agent — iPadOS moderno se hace
// pasar por Mac de escritorio. Todo táctil no-Android recibe los pasos de Safari.
function isIPhone(): boolean {
  return /iPhone|iPod/.test(navigator.userAgent || "");
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
  // Cualquier táctil (iPad/iPhone/Android) que no esté ya instalada como app.
  if (!isTouch() || isStandalone()) return null;
  const android = isAndroid();
  const device = android ? "tablet/teléfono" : (isIPhone() ? "iPhone" : "iPad");
  return (
    <>
      <button className="a2hs-btn" onClick={() => setOpen(true)}>
        <PlusIcon /> Agregar a la pantalla de inicio
      </button>
      {/* PORTAL al <body>: el menú anima con transform y en Safari/iPad eso "atrapa"
          al position:fixed (containing block) → el modal quedaba recortado DETRÁS de
          las tarjetas y las instrucciones no se veían. En el body no hay ancestros
          con transform y el modal cubre la pantalla completa siempre. */}
      {open && createPortal(
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
            {android ? (
              <ol className="a2hs__steps">
                <li><span className="a2hs__num">1</span>
                  <span>Abre esta página en <strong>Chrome</strong>.</span></li>
                <li><span className="a2hs__num">2</span>
                  <span>Toca el menú <strong>⋮</strong> (arriba a la derecha).</span></li>
                <li><span className="a2hs__num">3</span>
                  <span>Elige <strong>«Agregar a pantalla principal»</strong> (o «Instalar app»).</span></li>
                <li><span className="a2hs__num">4</span>
                  <span>Confirma con <strong>Agregar</strong>. ¡Listo!</span></li>
              </ol>
            ) : (
              <ol className="a2hs__steps">
                <li><span className="a2hs__num">1</span>
                  <span>Abre esta página en <strong>Safari</strong> (el ícono azul de brújula).</span></li>
                <li><span className="a2hs__num">2</span>
                  <span>Toca el botón <strong>Compartir</strong>
                    <span className="a2hs__share"><ShareIcon /></span>
                    {isIPhone() ? " (en la barra de abajo)." : " (arriba, junto a la barra de direcciones)."}</span></li>
                <li><span className="a2hs__num">3</span>
                  <span>Desliza hacia abajo y elige <strong>«Agregar a pantalla de inicio»</strong>.
                    Si no aparece, toca «Editar acciones» al final de la lista.</span></li>
                <li><span className="a2hs__num">4</span>
                  <span>Toca <strong>Agregar</strong> (arriba a la derecha). ¡Listo!</span></li>
              </ol>
            )}
            <div className="a2hs__foot">
              <Button variant="primary" onClick={() => setOpen(false)}>Entendido</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./auth";
import "./styles.css";

// Escalado "fit-to-width": el panel se diseñó a ~1320px de ancho y, en pantallas
// grandes (1920), a zoom 1.45 (tamaño "directorio"). Para que TODAS las pantallas
// —chicas o cuadradas— muestren EXACTAMENTE el mismo layout sin re-acomodarse ni
// apilar columnas, ajustamos el zoom para que el ancho de layout quede fijo (~1320px)
// y todo se achique/agrande proporcionalmente hasta llenar el ancho de la ventana.
// Cap en 1.45 (no agranda más que el tamaño actual). Los breakpoints que apilaban se
// eliminaron en styles.css: acá el layout es único y solo se escala.
const DESIGN_W = 1320;
const MAX_ZOOM = 1.45;
const MIN_ZOOM = 0.5;
function fitZoom() {
  // clientWidth excluye la barra de scroll vertical → evita scroll horizontal
  const w = document.documentElement.clientWidth || window.innerWidth;
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, w / DESIGN_W));
  (document.body.style as any).zoom = String(Math.round(z * 1000) / 1000);
}
fitZoom();
let rafId = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(fitZoom);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);

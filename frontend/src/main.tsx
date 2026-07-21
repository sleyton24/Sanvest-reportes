import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./auth";
import "./styles.css";

// Escalado "fit-to-width": el panel se diseñó a ~1320px y se escala proporcional al
// ANCHO de la pantalla para CUADRAR con el tamaño del PC — se achica en pantallas
// angostas (sin scroll horizontal) y se agranda en las anchas para llenar el ancho
// (hasta MAX_ZOOM). Cap en 1.6 para que no se vea desproporcionado en monitores muy
// anchos; si igual queda muy grande/chico, ajustar MAX_ZOOM o el zoom del navegador.
const DESIGN_W = 1320;
const MAX_ZOOM = 1.6;
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

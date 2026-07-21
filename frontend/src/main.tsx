import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./auth";
import "./styles.css";

// Escalado "fit-to-width": el panel se diseñó a ~1320px. En pantallas MÁS ANGOSTAS
// que eso se achica proporcionalmente para que quepa sin scroll horizontal ni
// reacomodar columnas. En pantallas más anchas NO magnifica: 100% del navegador =
// tamaño real (MAX_ZOOM = 1.0). Antes el cap era 1.45 (tamaño "directorio"), que se
// veía enorme a 100% y obligaba a bajar el zoom del navegador. Si se quiere el modo
// grande para una TV/presentación, subir MAX_ZOOM o usar el zoom del navegador.
const DESIGN_W = 1320;
const MAX_ZOOM = 1.0;
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

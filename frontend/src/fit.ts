// Escala "fit-to-width" UNIVERSAL: mide el ancho REAL del contenido ya renderizado
// y achica (zoom < 1) solo lo necesario para que quepa sin scroll horizontal, en
// cualquier pantalla. NO magnifica (tope 1.0), así nunca se ve "muy grande".
//
// Antes se escalaba contra un ancho de diseño FIJO (1320): como el contenido real
// (p.ej. .dash max-width 1880, o el topnav con todos los botones) es más ancho que
// eso, al escalar se pasaba del viewport y aparecía scroll horizontal. Medir el
// ancho real evita ese problema para cualquier resolución.
const MAX_ZOOM = 1.0;   // no agrandar: 100% = tamaño real
const MIN_ZOOM = 0.5;   // piso de legibilidad

let raf = 0;

export function applyFit(): void {
  const b = document.body;
  if (!b) return;
  b.style.zoom = "1";                       // medir a escala real
  // ancho natural del contenido (incluye lo que se desbordaría del viewport)
  const need = Math.max(b.scrollWidth, document.documentElement.scrollWidth || 0, 1);
  const avail = document.documentElement.clientWidth || window.innerWidth;
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, avail / need));
  b.style.zoom = String(Math.round(z * 1000) / 1000);
}

export function scheduleFit(): void {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(applyFit);
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", scheduleFit);
}

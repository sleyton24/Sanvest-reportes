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
// Bajo este ancho NO se usa el zoom "fit-to-width": el layout es RESPONSIVE y se
// reacomoda (apila columnas) vía las media queries de styles.css. Encoger un
// diseño de escritorio a 375px lo dejaba minúsculo.
const REFLOW_BELOW = 1024;

// Dispositivo táctil (iPad/iPhone/Android): NUNCA usar el zoom, en ninguna
// orientación. El iPad horizontal mide ~1024-1194px y caía en el régimen de zoom:
// al GIRAR entraba/salía del zoom y el layout se "desconfiguraba" (el zoom de body
// + rotación de Safari recalcula mal). En táctil manda el CSS responsive + el
// pinch-zoom nativo; el fit-to-width queda solo para PC. Criterio = puntero
// PRINCIPAL grueso (pointer: coarse), el MISMO de las media queries de styles.css
// (un notebook con pantalla táctil usa mouse → pointer fino → conserva el zoom).
const IS_TOUCH = typeof window !== "undefined" &&
  !!window.matchMedia?.("(pointer: coarse)").matches;

let raf = 0;

export function applyFit(): void {
  const b = document.body;
  if (!b) return;
  if (IS_TOUCH) { b.style.zoom = "1"; return; }  // táctil: reflow por CSS, sin zoom
  const avail = document.documentElement.clientWidth || window.innerWidth;
  if (avail < REFLOW_BELOW) { b.style.zoom = "1"; return; }  // ventana angosta: reflow por CSS
  b.style.zoom = "1";                       // medir a escala real
  // ancho natural del contenido (incluye lo que se desbordaría del viewport)
  const need = Math.max(b.scrollWidth, document.documentElement.scrollWidth || 0, 1);
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

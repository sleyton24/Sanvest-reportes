// PPT Directorio: visor de PDF propio, dibujado con PDF.js sobre un <canvas>.
//
// Antes el PDF se montaba en un <iframe> con una blob: URL. WebKit (iPad/iPhone)
// NO renderiza PDFs embebidos de esa forma: no da error, simplemente deja el
// marco en blanco. Dibujar nosotros las páginas funciona igual en táctil y en
// escritorio, y mantiene la autenticación (el PDF se baja con el token Bearer,
// no se puede poner un header en el src de un iframe).
//
// Se muestra UNA lámina a la vez, no scroll continuo: la PPT trae ~60 páginas y
// mantener 60 canvas vivos agota la memoria de Safari en iPad.
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { pptMeta, fetchPptBlob, uploadPpt } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/Button";

// PDF.js se carga solo al entrar a esta página (pesa ~350 KB) y en su build
// "legacy", que trae los polyfills que necesitan las versiones viejas de
// Safari/iPadOS (las nuevas usan Promise.withResolvers, que iOS < 17.4 no tiene).
async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  // El `?v=2` no es decorativo: nginx servía este .mjs como
  // application/octet-stream (extensión no declarada en mime.types) y WebKit se
  // niega a ejecutar un worker de módulo así → el visor quedaba en blanco. Ya
  // está corregido en el servidor, pero /assets/ va con `immutable` a un año y el
  // nombre del worker no cambia entre builds: los equipos que ya guardaron la
  // respuesta mala seguirían usándola. Otra URL = otra entrada de caché.
  pdfjs.GlobalWorkerOptions.workerSrc = `${worker.default}?v=2`;
  return pdfjs;
}

const MAX_DPR = 2;     // sobremuestreo: nítido en retina sin inflar la memoria
const SWIPE_PX = 60;   // arrastre mínimo para pasar de lámina en táctil
const BOTTOM_GAP = 16; // aire bajo la lámina, para que no toque el borde
const MIN_H = 240;     // piso: en una ventana muy baja, mejor recortar que desaparecer

export function PptDirectorio() {
  const { user } = useAuth();
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reload, setReload] = useState(0);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const total = doc?.numPages ?? 0;

  // 1) Cargar el documento (una vez por montaje / tras subir uno nuevo).
  useEffect(() => {
    let off = false;
    let task: PDFDocumentLoadingTask | null = null;
    setLoading(true); setError(""); setDoc(null);
    (async () => {
      try {
        const meta = await pptMeta();
        if (!meta.exists || off) return;   // sin PDF: abajo se muestra el aviso
        const buf = await (await fetchPptBlob()).arrayBuffer();
        const pdfjs = await loadPdfjs();
        task = pdfjs.getDocument({ data: buf });
        const pdf = await task.promise;
        if (off) return;
        setDoc(pdf); setPage(1);
      } catch (e) { if (!off) setError((e as Error).message); }
      finally { if (!off) setLoading(false); }
    })();
    // Al desmontar (o al recargar) se libera el worker y la memoria del PDF.
    return () => { off = true; task?.destroy(); };
  }, [reload]);

  // 2) Medir el hueco disponible: ancho del contenedor y alto hasta el borde
  //    inferior de la ventana. El alto importa tanto como el ancho — una lámina
  //    16:9 ajustada solo al ancho del iPad horizontal queda más alta que la
  //    pantalla y obliga a hacer scroll para ver la mitad de abajo.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // La app escala todo con body{zoom} en PC (ver fit.ts; en táctil es 1).
      // clientWidth/offsetWidth van en px propios del elemento y rect en px
      // visuales: su cociente ES el zoom, y con él pasamos innerHeight (visual)
      // al espacio del elemento, que es donde vive el canvas.
      const z = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1;
      const avail = (window.innerHeight - rect.top - BOTTOM_GAP) / (z || 1);
      const w = Math.round(el.clientWidth);
      const h = Math.round(Math.max(MIN_H, avail));
      // Redibujar cambia el alto del stage y vuelve a disparar el observer: sin
      // este corte por valor, cada render pediría otro render.
      setStage((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    // ResizeObserver cubre el giro del iPad y el reflow del layout; el listener
    // de resize, los cambios de alto de ventana (que no mueven el contenedor).
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [doc]);

  // 3) Dibujar la lámina actual entera dentro del hueco disponible ("contain"):
  //    manda la restricción más apretada, así se ve completa en cualquier
  //    orientación sin scroll y sin deformar la proporción.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!doc || !canvas || stage.w <= 0 || stage.h <= 0) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    (async () => {
      try {
        const p = await doc.getPage(page);
        if (cancelled) return;
        const base = p.getViewport({ scale: 1 });
        const scale = Math.min(stage.w / base.width, stage.h / base.height);
        const vp = p.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        canvas.width = Math.floor(vp.width * ratio);
        canvas.height = Math.floor(vp.height * ratio);
        canvas.style.width = `${Math.floor(vp.width)}px`;
        canvas.style.height = `${Math.floor(vp.height)}px`;
        // El canvas se pasa entero (en pdf.js 6 `canvasContext` quedó como
        // compatibilidad); asignarle width/height ya lo dejó limpio.
        task = p.render({
          canvas,
          viewport: vp,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await task.promise;
      } catch (e) {
        // Cambiar de lámina cancela el render en curso: eso no es un error.
        if (!cancelled && (e as Error)?.name !== "RenderingCancelledException") {
          setError((e as Error).message);
        }
      }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [doc, page, stage]);

  const go = useCallback(
    (d: number) => setPage((p) => Math.min(total, Math.max(1, p + d))),
    [total],
  );

  // Teclado: flechas / avance de página, como en cualquier visor.
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, go]);

  // Swipe en táctil. Solo con UN dedo: con dos es pinch-zoom y no debe pasar página.
  const swipeX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    swipeX.current = e.touches.length === 1 ? e.touches[0].clientX : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = swipeX.current;
    swipeX.current = null;
    if (from === null || e.touches.length > 0) return;
    const dx = e.changedTouches[0].clientX - from;
    if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
  };

  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setError("Elige un PDF primero."); return; }
    setUploading(true); setError("");
    try { await uploadPpt(f); setReload((r) => r + 1); }
    catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  };

  return (
    <div className="dash ppt">
      <header className="dash__header">
        <h1>PPT Directorio</h1>
        {user?.can_upload && (
          <div className="dash__slicers ppt__upload">
            <input type="file" accept="application/pdf,.pdf" ref={fileRef} />
            <Button variant="primary" onClick={upload} disabled={uploading}>
              {uploading ? "Subiendo…" : (doc ? "Reemplazar PDF" : "Subir PDF")}
            </Button>
          </div>
        )}
      </header>

      {error && <div className="state state--error">{error}</div>}
      {loading ? (
        <div className="state">Cargando…</div>
      ) : doc ? (
        <div className="ppt__viewer">
          <div className="ppt__nav">
            <Button onClick={() => go(-1)} disabled={page <= 1}>‹ Anterior</Button>
            <span className="ppt__count">Lámina {page} de {total}</span>
            <Button onClick={() => go(1)} disabled={page >= total}>Siguiente ›</Button>
          </div>
          <div className="ppt__stage" ref={stageRef}
               onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <canvas ref={canvasRef} className="ppt__canvas" />
          </div>
        </div>
      ) : !error ? (
        <div className="state">
          Aún no se ha subido la PPT Directorio.
          {user?.can_upload ? " Usa el botón de arriba para subir el PDF." : " Pídele a un administrador que la cargue."}
        </div>
      ) : null}
    </div>
  );
}

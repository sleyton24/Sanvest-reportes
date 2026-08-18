// PPT Directorio: muestra el PDF en línea (sin descargar) lámina a lámina con
// pdf.js (el iframe nativo no pagina bien en iPad). El admin sube versiones
// nuevas —las anteriores se conservan y se eligen en el selector— y abajo va el
// foro de comentarios agrupado por fecha y unidad de negocio.
import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  PptVersion, deletePptVersion, fetchPptBlob, listPptVersions, uploadPpt,
} from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/Button";
import { DirectorioComments } from "../components/DirectorioComments";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const fmtVersionTs = (ts: string) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts
    : d.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Visor paginado: renderiza UNA lámina en un canvas, con Anterior/Siguiente.
// Se re-renderiza al cambiar el ancho disponible (giro de iPad, resize).
function PdfPager({ blob }: { blob: Blob }) {
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<ReturnType<pdfjs.PDFPageProxy["render"]> | null>(null);

  useEffect(() => {
    let off = false;
    // Se destruye el loading task (no solo el doc): eso libera también el Web
    // Worker de pdf.js, incluso cuando la carga falló (PDF corrupto).
    let task: ReturnType<typeof pdfjs.getDocument> | null = null;
    setDoc(null); setError("");
    (async () => {
      const data = await blob.arrayBuffer();
      if (off) return;
      task = pdfjs.getDocument({ data });
      const d = await task.promise;
      if (off) return;                    // el cleanup ya destruyó el task
      setNumPages(d.numPages); setPage(1); setDoc(d);
    })().catch((e) => {
      task?.destroy().catch(() => {});
      if (!off) setError(`No se pudo abrir el PDF: ${(e as Error).message}`);
    });
    return () => { off = true; task?.destroy().catch(() => {}); };
  }, [blob]);

  // Ancho disponible: se observa el contenedor y solo importa el cambio de ancho
  // (el alto cambia con cada render del canvas y volvería a disparar el observer).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      setWidth((prev) => (w && w !== prev ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !canvasRef.current || !width) return;
    let off = false;
    (async () => {
      const p = await doc.getPage(page);
      if (off || !canvasRef.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);   // tope: memoria en iPad
      const scale = width / p.getViewport({ scale: 1 }).width;
      const vp = p.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${Math.floor(vp.height / dpr)}px`;
      renderTaskRef.current?.cancel();
      const task = p.render({ canvasContext: canvas.getContext("2d")!, viewport: vp });
      renderTaskRef.current = task;
      await task.promise;
    })().catch((e) => {
      // El cancel por cambio rápido de lámina/tamaño es normal; el resto se muestra.
      if (!off && (e as Error)?.name !== "RenderingCancelledException")
        setError(`No se pudo dibujar la lámina: ${(e as Error).message}`);
    });
    return () => { off = true; };
  }, [doc, page, width]);

  // Flechas del teclado, salvo cuando se escribe en un campo (p.ej. comentarios).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;
      if (e.key === "ArrowRight") setPage((p) => Math.min(numPages, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages]);

  if (error) return <div className="state state--error">{error}</div>;
  return (
    <div className="ppt__viewer">
      <div className="ppt__pager">
        <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          ‹ Anterior
        </Button>
        <span className="ppt__pageinfo">{doc ? `Lámina ${page} de ${numPages}` : "Cargando…"}</span>
        <Button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={!doc || page >= numPages}>
          Siguiente ›
        </Button>
      </div>
      <div className="ppt__stage" ref={wrapRef}>
        <canvas className="ppt__canvas" ref={canvasRef} />
      </div>
    </div>
  );
}

export function PptDirectorio() {
  const { user } = useAuth();
  const [versions, setVersions] = useState<PptVersion[]>([]);
  const [cur, setCur] = useState("");            // id de la versión mostrada
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Lista las versiones y deja seleccionada `keep` (si sigue existiendo) o la más nueva.
  const loadVersions = async (keep?: string) => {
    setError("");
    try {
      const vs = await listPptVersions();
      setVersions(vs);
      const id = keep && vs.some((v) => v.id === keep) ? keep : vs[0]?.id || "";
      setCur(id);
      if (!id) { setBlob(null); setLoading(false); }
    } catch (e) { setError((e as Error).message); setLoading(false); }
  };
  useEffect(() => { loadVersions(); }, []);

  useEffect(() => {
    if (!cur) return;
    let off = false;
    setLoading(true); setError("");
    fetchPptBlob(cur)
      .then((b) => { if (!off) setBlob(b); })
      .catch((e) => { if (!off) setError((e as Error).message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [cur]);

  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setError("Elige un PDF primero."); return; }
    setUploading(true); setError("");
    try {
      const { id } = await uploadPpt(f);
      if (fileRef.current) fileRef.current.value = "";
      await loadVersions(id);
    } catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  };

  const removeVersion = async () => {
    const v = versions.find((x) => x.id === cur);
    if (!v || deleting) return;
    if (!window.confirm(`¿Eliminar la versión "${v.name}" del ${fmtVersionTs(v.ts)}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true); setError("");
    try { await deletePptVersion(v.id); await loadVersions(); }
    catch (e) { setError((e as Error).message); }
    finally { setDeleting(false); }
  };

  return (
    <div className="dash ppt">
      <header className="dash__header">
        <h1>PPT Directorio</h1>
        {user?.can_upload && (
          <div className="dash__slicers ppt__upload">
            <input type="file" accept="application/pdf,.pdf" ref={fileRef} />
            <Button variant="primary" onClick={upload} disabled={uploading}>
              {uploading ? "Subiendo…" : (versions.length ? "Subir nueva versión" : "Subir PDF")}
            </Button>
          </div>
        )}
      </header>

      {versions.length > 0 && (
        <div className="ppt__bar">
          <label className="ppt__verlabel">
            Versión
            <select className="ppt__versions" value={cur} onChange={(e) => setCur(e.target.value)}>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {fmtVersionTs(v.ts)} — {v.name.replace(/\.pdf$/i, "")}
                </option>
              ))}
            </select>
          </label>
          {user?.is_admin && versions.length > 0 && (
            <button className="ppt__delete" onClick={removeVersion} disabled={deleting}
              title="Eliminar esta versión">
              {deleting ? "Eliminando…" : "🗑 Eliminar versión"}
            </button>
          )}
        </div>
      )}

      {error && <div className="state state--error">{error}</div>}
      {loading ? (
        <div className="state">Cargando…</div>
      ) : blob ? (
        <PdfPager blob={blob} />
      ) : !error ? (
        <div className="state">
          Aún no se ha subido la PPT Directorio.
          {user?.can_upload ? " Usa el botón de arriba para subir el PDF." : " Pídele a un administrador que la cargue."}
        </div>
      ) : null}

      <DirectorioComments />
    </div>
  );
}

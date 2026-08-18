// Directorio: archivo de documentos por período. Una carpeta por año-mes y dentro
// los documentos de ese mes — la PPT (PDF, que se ve lámina a lámina con pdf.js
// porque el <iframe> queda en blanco en WebKit) y el correo a directores (.eml,
// que la API entrega ya parseado y con las imágenes incrustadas).
import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  DirDoc, DirMail, DirPeriodo, deleteDirDoc, fetchDirDoc, fetchDirMail,
  listDirectorio, sugerirPeriodo, uploadDirDoc,
} from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/Button";
import { DirectorioComments } from "../components/DirectorioComments";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const fmtTs = (ts: string) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts
    : d.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

// ---------------------------------------------------------------- visor de PPT
// Renderiza UNA lámina en un canvas (60 canvas vivos agotan la memoria del iPad).
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
    // Se destruye el loading task (no solo el doc): libera también el Web Worker
    // de pdf.js, incluso cuando la carga falló (PDF corrupto).
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

  // Ancho disponible: solo importa el cambio de ANCHO (el alto cambia con cada
  // render del canvas y volvería a disparar el observer).
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

// -------------------------------------------------------------- visor de correo
// El HTML del correo va en un <iframe sandbox> SIN allow-scripts: aísla sus estilos
// (los correos traen CSS que pisaría el panel) y no ejecuta nada. La API ya
// incrustó las imágenes como data: URIs y quitó scripts/handlers.
function MailViewer({ mail }: { mail: DirMail }) {
  const [alto, setAlto] = useState(600);
  const ref = useRef<HTMLIFrameElement>(null);

  const doc = useMemo(() => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:16px;background:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${mail.html}</body></html>`, [mail.html]);

  // El iframe crece con su contenido: un correo largo no debe quedar con scroll
  // propio dentro de la página (queda un scroll dentro de otro, molesto en iPad).
  const ajustar = () => {
    const d = ref.current?.contentDocument;
    if (d?.body) setAlto(Math.max(240, d.body.scrollHeight + 32));
  };

  return (
    <div className="card mail">
      <div className="mail__head">
        <div className="mail__asunto">{mail.asunto || "(sin asunto)"}</div>
        <div className="mail__meta">
          {mail.de && <span><strong>De:</strong> {mail.de}</span>}
          {mail.para && <span><strong>Para:</strong> {mail.para}</span>}
          {mail.fecha && <span>{mail.fecha}</span>}
        </div>
      </div>
      <iframe ref={ref} className="mail__body" title={mail.asunto || "Correo"}
        sandbox="" srcDoc={doc} style={{ height: alto }} onLoad={ajustar} />
    </div>
  );
}

// ------------------------------------------------------------------- la página
export function PptDirectorio() {
  const { user } = useAuth();
  const [periodos, setPeriodos] = useState<DirPeriodo[]>([]);
  const [sel, setSel] = useState<DirDoc | null>(null);      // documento abierto
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mail, setMail] = useState<DirMail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cargandoDoc, setCargandoDoc] = useState(false);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [bajando, setBajando] = useState(false);
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const fileRef = useRef<HTMLInputElement>(null);

  // Carga el árbol y deja abierto/seleccionado el período más reciente.
  const cargar = async (preferir?: string) => {
    setError("");
    try {
      const ps = await listDirectorio();
      setPeriodos(ps);
      const per = ps.find((p) => p.periodo === preferir) || ps[0];
      if (per) {
        setAbiertos((prev) => new Set(prev).add(per.periodo));
        setSel((actual) => {
          const sigue = actual && ps.some((p) => p.docs.some((d) => d.id === actual.id));
          return sigue ? actual : (per.docs.find((d) => d.tipo === "ppt") || per.docs[0] || null);
        });
      } else {
        setSel(null);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  // Trae el documento seleccionado (PDF como blob, correo ya parseado).
  useEffect(() => {
    if (!sel) { setBlob(null); setMail(null); return; }
    let off = false;
    setCargandoDoc(true); setError(""); setBlob(null); setMail(null);
    (sel.tipo === "ppt"
      ? fetchDirDoc(sel.id).then((b) => { if (!off) setBlob(b); })
      : fetchDirMail(sel.id).then((m) => { if (!off) setMail(m); })
    ).catch((e) => { if (!off) setError((e as Error).message); })
      .finally(() => { if (!off) setCargandoDoc(false); });
    return () => { off = true; };
  }, [sel]);

  const togglePeriodo = (p: string) => setAbiertos((prev) => {
    const n = new Set(prev);
    if (n.has(p)) n.delete(p); else n.add(p);
    return n;
  });

  // Al elegir archivo: propone el período leyéndolo del nombre (el admin puede cambiarlo).
  const onFile = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    try {
      const s = await sugerirPeriodo(f.name);
      if (s.anio && s.mes) { setAnio(s.anio); setMes(s.mes); }
    } catch { /* la sugerencia es opcional */ }
  };

  const subir = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setError("Elige un archivo primero (PDF de la PPT o correo .eml)."); return; }
    setSubiendo(true); setError("");
    try {
      const r = await uploadDirDoc(f, anio, mes);
      if (fileRef.current) fileRef.current.value = "";
      await cargar(r.periodo);
      setSel({ id: r.id, tipo: r.tipo, nombre: f.name, ts: new Date().toISOString(), size: r.size });
    } catch (e) { setError((e as Error).message); }
    finally { setSubiendo(false); }
  };

  // Descarga el documento original. El fetch va con el token, así que no se puede
  // apuntar un <a href> a la API: se baja el blob y se dispara la descarga con él.
  const descargar = async () => {
    if (!sel || bajando) return;
    setBajando(true); setError("");
    try {
      const b = sel.tipo === "ppt" && blob ? blob : await fetchDirDoc(sel.id);
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = sel.nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { setError((e as Error).message); }
    finally { setBajando(false); }
  };

  const borrar = async () => {
    if (!sel || borrando) return;
    if (!window.confirm(`¿Eliminar "${sel.nombre}"? Esta acción no se puede deshacer.`)) return;
    setBorrando(true); setError("");
    try { await deleteDirDoc(sel.id); setSel(null); await cargar(); }
    catch (e) { setError((e as Error).message); }
    finally { setBorrando(false); }
  };

  const anios = useMemo(() => {
    const y = new Set<number>([hoy.getFullYear(), hoy.getFullYear() - 1]);
    periodos.forEach((p) => y.add(p.anio));
    return [...y].sort((a, b) => b - a);
  }, [periodos, hoy]);

  return (
    <div className="dash ppt">
      <header className="dash__header">
        <h1>PPT Directorio</h1>
        {user?.can_upload && (
          <div className="dash__slicers ppt__upload">
            <input type="file" accept="application/pdf,.pdf,.eml,message/rfc822"
              ref={fileRef} onChange={onFile} />
            <label className="ppt__verlabel">
              Carpeta
              <select className="ppt__versions" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                {MESES.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select className="ppt__versions" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
                {anios.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <Button variant="primary" onClick={subir} disabled={subiendo}>
              {subiendo ? "Subiendo…" : "Archivar documento"}
            </Button>
          </div>
        )}
      </header>

      {error && <div className="state state--error">{error}</div>}

      <div className="docs">
        {/* carpetas por año-mes; dentro, los documentos del período */}
        <aside className="docs__nav">
          <div className="docs__navtitle">Carpetas por mes</div>
          {loading ? (
            <div className="state">Cargando…</div>
          ) : periodos.length === 0 ? (
            <div className="docs__empty">
              Aún no hay documentos archivados.
              {user?.can_upload ? " Elige un archivo y la carpeta del mes, arriba."
                : " Pídele a un administrador que los cargue."}
            </div>
          ) : periodos.map((p) => {
            const open = abiertos.has(p.periodo);
            return (
              <div key={p.periodo} className="docs__per">
                <button className="docs__perbtn" onClick={() => togglePeriodo(p.periodo)}>
                  <span className="docs__chev">{open ? "▾" : "▸"}</span>
                  <span className="docs__folder">{open ? "📂" : "📁"}</span>
                  {p.etiqueta}
                  <span className="docs__count">{p.docs.length}</span>
                </button>
                {open && p.docs.map((d) => (
                  <button key={d.id} title={`${d.nombre} · ${fmtSize(d.size)} · ${fmtTs(d.ts)}`}
                    className={"docs__doc" + (sel?.id === d.id ? " is-active" : "")}
                    onClick={() => setSel(d)}>
                    <span className="docs__icon">{d.tipo === "ppt" ? "📄" : "✉️"}</span>
                    <span className="docs__name">{d.nombre.replace(/\.(pdf|eml)$/i, "")}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </aside>

        <div className="docs__main">
          {sel && (
            <div className="ppt__bar">
              <span className="docs__selname">
                {sel.tipo === "ppt" ? "📄" : "✉️"} {sel.nombre}
                <span className="docs__selmeta"> · {fmtSize(sel.size)} · archivado {fmtTs(sel.ts)}</span>
              </span>
              <button className="ppt__download" onClick={descargar} disabled={bajando}
                title={sel.tipo === "mail" ? "Descargar el correo (.eml, se abre en Outlook)"
                                           : "Descargar el PDF"}>
                {bajando ? "Descargando…" : "⬇ Descargar"}
              </button>
              {user?.is_admin && (
                <button className="ppt__delete" onClick={borrar} disabled={borrando}
                  title="Eliminar este documento">
                  {borrando ? "Eliminando…" : "🗑 Eliminar"}
                </button>
              )}
            </div>
          )}
          {cargandoDoc ? <div className="state">Cargando documento…</div>
            : blob ? <PdfPager blob={blob} />
            : mail ? <MailViewer mail={mail} />
            : !sel && !loading && periodos.length > 0
              ? <div className="state">Elige un documento en las carpetas de la izquierda.</div>
              : null}
        </div>
      </div>

      <DirectorioComments />
    </div>
  );
}

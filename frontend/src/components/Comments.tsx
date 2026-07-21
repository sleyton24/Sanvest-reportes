// Foro de comentarios por unidad de negocio: los directores hacen preguntas o
// dejan notas. Modal con el hilo (del más antiguo al más nuevo) + caja para
// publicar. Cualquier usuario con acceso a la unidad puede escribir.
import { useEffect, useRef, useState } from "react";
import { Comment, listComments, postComment } from "../api";
import { useAuth } from "../auth";
import { Button } from "./Button";

const fmtTs = (ts: string) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts
    : d.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export function Comments({ unit, unitLabel, onClose }: { unit: string; unitLabel: string; onClose: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await listComments(unit)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [unit]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [items]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setPosting(true); setError("");
    try {
      const c = await postComment(unit, body);
      setItems((prev) => [...prev, c]);
      setText("");
    } catch (e) { setError((e as Error).message); }
    finally { setPosting(false); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
  };

  return (
    <div className="cmodal__backdrop" onClick={onClose}>
      <div className="cmodal" onClick={(e) => e.stopPropagation()}>
        <div className="cmodal__head">
          <span>💬 Comentarios — {unitLabel}</span>
          <button className="cmodal__close" onClick={onClose} title="Cerrar">✕</button>
        </div>
        <div className="cmodal__thread">
          {loading ? <div className="state">Cargando…</div>
            : items.length === 0 ? <div className="cmodal__empty">Aún no hay comentarios. Sé el primero en escribir.</div>
            : items.map((c, i) => {
              const mine = c.username === user?.username;
              return (
                <div key={i} className={"cmt" + (mine ? " cmt--mine" : "")}>
                  <div className="cmt__head">
                    <span className="cmt__author">{c.full_name || c.username}</span>
                    <span className="cmt__ts">{fmtTs(c.ts)}</span>
                  </div>
                  <div className="cmt__body">{c.body}</div>
                </div>
              );
            })}
          <div ref={endRef} />
        </div>
        {error && <div className="cmodal__err">{error}</div>}
        <div className="cmodal__compose">
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
            placeholder="Escribe una pregunta o comentario… (Ctrl+Enter para enviar)" rows={3} />
          <Button variant="primary" onClick={send} disabled={posting || !text.trim()}>
            {posting ? "Enviando…" : "Publicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

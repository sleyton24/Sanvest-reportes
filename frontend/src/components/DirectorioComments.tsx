// Sección de comentarios de la página PPT Directorio: junta los foros de TODAS
// las unidades visibles del usuario y los agrupa por fecha (día) y, dentro de
// cada día, por unidad de negocio. También permite publicar hacia una unidad.
import { useEffect, useMemo, useState } from "react";
import { Comment, listAllComments, postComment } from "../api";
import { useAuth } from "../auth";
import { UNITS } from "../units";
import { Button } from "./Button";

// Acentos por unidad (mismos hex que .app.unit-* en styles.css) para el chip.
const UNIT_COLORS: Record<string, string> = {
  DV: "#A8C813", RR: "#3796AA", Hotel: "#FACF22", USA: "#EF731B",
  ICEMM: "#D83252", Atempora: "#8b6fd6", Grupo: "#5566cc",
};
const UNIT_ORDER = new Map(UNITS.map((u, i) => [u.id, i]));
const unitLabel = (id: string) => UNITS.find((u) => u.id === id)?.label || id;

const fmtTime = (ts: string) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
};

// Clave local AAAA-MM-DD del día del comentario (agrupa en hora del lector).
const dayKey = (ts: string) => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dayLabel = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  const label = new Date(y, m - 1, d).toLocaleDateString("es-CL",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

interface DayGroup { key: string; units: { unit: string; items: Comment[] }[] }

export function DirectorioComments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState("");

  // Unidades donde el usuario puede publicar (admin: todas).
  const myUnits = UNITS.filter((u) => user?.is_admin || user?.units.includes(u.id));
  const [unit, setUnit] = useState(myUnits[0]?.id || "");

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await listAllComments()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // La API entrega del más nuevo al más antiguo → días descendentes (Map conserva
  // el orden de inserción); dentro de cada día+unidad se lee cronológicamente.
  const groups = useMemo<DayGroup[]>(() => {
    const byDay = new Map<string, Map<string, Comment[]>>();
    for (const c of items) {
      const k = dayKey(c.ts);
      if (!byDay.has(k)) byDay.set(k, new Map());
      const byUnit = byDay.get(k)!;
      if (!byUnit.has(c.unit)) byUnit.set(c.unit, []);
      byUnit.get(c.unit)!.push(c);
    }
    return Array.from(byDay, ([key, byUnit]) => ({
      key,
      units: Array.from(byUnit, ([u, arr]) => ({ unit: u, items: arr.slice().reverse() }))
        .sort((a, b) => (UNIT_ORDER.get(a.unit) ?? 99) - (UNIT_ORDER.get(b.unit) ?? 99)),
    }));
  }, [items]);

  const send = async () => {
    const body = text.trim();
    if (!body || !unit || posting) return;   // guard: Ctrl+Enter no pasa por el Button
    setPosting(true); setError("");
    try { await postComment(unit, body); setText(""); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setPosting(false); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
  };

  return (
    <section className="pcom">
      <h2 className="pcom__title">💬 Comentarios por unidad de negocio</h2>

      {myUnits.length > 0 && (
        <div className="pcom__compose">
          <label className="pcom__unitpick">
            Unidad
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {myUnits.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
            placeholder="Escribe una pregunta o comentario… (Ctrl+Enter para enviar)" rows={2} />
          <Button variant="primary" onClick={send} disabled={posting || !text.trim() || !unit}>
            {posting ? "Enviando…" : "Publicar"}
          </Button>
        </div>
      )}

      {error && <div className="state state--error">{error}</div>}
      {loading ? (
        <div className="state">Cargando…</div>
      ) : groups.length === 0 ? (
        <div className="pcom__empty">
          {myUnits.length > 0 ? "Aún no hay comentarios. Sé el primero en escribir." : "Aún no hay comentarios."}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="pcom__day">
            <h3 className="pcom__dayhead">{dayLabel(g.key)}</h3>
            {g.units.map((u) => (
              <div key={u.unit} className="pcom__unit">
                <div className="pcom__unithead">
                  <span className="pcom__chip" style={{ background: UNIT_COLORS[u.unit] || "var(--border-strong)" }} />
                  {unitLabel(u.unit)}
                </div>
                {u.items.map((c, i) => {
                  const mine = c.username === user?.username;
                  return (
                    <div key={i} className={"cmt" + (mine ? " cmt--mine" : "")}>
                      <div className="cmt__head">
                        <span className="cmt__author">{c.full_name || c.username}</span>
                        <span className="cmt__ts">{fmtTime(c.ts)}</span>
                      </div>
                      <div className="cmt__body">{c.body}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}

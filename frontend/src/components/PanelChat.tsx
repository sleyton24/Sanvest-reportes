// SofIA, la asistente del panel (solo administradores): burbuja flotante que sabe QUÉ reporte
// está abierto. Cada dashboard publica su vista con useSetVista (unidad, filtros y
// cifras en pantalla) y acá se manda como contexto, así se puede preguntar "¿por qué
// bajó el EBITDA?" sin repetir activo ni período. Las cifras las verifica el agente
// contra la base con herramientas read-only; no modifica datos.
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { ChatMsg, askAgent } from "../api";
import { useVista } from "../viewctx";
import { Button } from "./Button";

// Sugerencias de arranque: sirven en cualquier unidad (el contexto de la vista ya
// dice activo y período, así que no hace falta nombrarlos en la pregunta).
const SUGERENCIAS = [
  "¿Cómo viene este mes respecto al presupuesto?",
  "Compáralo con el mismo mes del año anterior",
  "¿Qué explica la desviación más grande?",
  "¿Hay algo raro en los datos de este período?",
];

export function PanelChat() {
  const getVista = useVista();
  const [abierto, setAbierto] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState("");
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, activity, abierto]);

  useEffect(() => { if (abierto) taRef.current?.focus(); }, [abierto]);

  // Esc cierra el panel (no interfiere con las flechas del visor de PPT).
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  const vista = getVista();
  const enPanel = !!vista?.unidad;

  // `texto` llega desde las sugerencias; si no viene, se usa lo escrito.
  const send = async (texto?: string) => {
    const text = (texto ?? input).trim();
    if (!text || busy) return;
    const v = getVista();                 // se lee AL ENVIAR: refleja los filtros de ahora
    if (!v?.unidad) { setError("Abre un panel de unidad de negocio para preguntar sobre él."); return; }
    setError("");
    if (texto === undefined) setInput("");
    const base: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages([...base, { role: "assistant", content: "" }]);
    setBusy(true); setActivity("Pensando…");
    try {
      await askAgent(v.unidad, base, {
        onText: (t) => {
          setActivity("");
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + t };
            return copy;
          });
        },
        onTool: (name) => setActivity(`Consultando la base (${name})…`),
      }, v);
    } catch (e) {
      setError((e as Error).message);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last && last.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
    } finally { setBusy(false); setActivity(""); }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!abierto) {
    return (
      <button className="pchat__fab" onClick={() => setAbierto(true)}
        title="Preguntar a SofIA sobre este reporte (solo administradores)">
        <span className="pchat__fabicon">💬</span>
        <span className="pchat__fabtxt">Preguntar a SofIA</span>
      </button>
    );
  }

  const filtros = Object.entries(vista?.filtros || {}).filter(([, v]) => v !== "" && v != null);

  return (
    <div className="pchat">
      <div className="pchat__head">
        <div>
          <div className="pchat__title">💬 SofIA</div>
          <div className="pchat__sub">
            {enPanel ? vista!.titulo : "Abre un panel de unidad de negocio"}
          </div>
        </div>
        <div className="pchat__acts">
          {messages.length > 0 && (
            <button className="pchat__mini" onClick={() => { setMessages([]); setError(""); }}
              title="Vaciar la conversación">Limpiar</button>
          )}
          <button className="pchat__close" onClick={() => setAbierto(false)} title="Cerrar (Esc)">✕</button>
        </div>
      </div>

      {enPanel && filtros.length > 0 && (
        <div className="pchat__ctx" title="El asistente responde con este contexto">
          {filtros.map(([k, v]) => (
            <span key={k} className="pchat__chip">{k}: <b>{String(v)}</b></span>
          ))}
        </div>
      )}

      <div className="pchat__log" ref={logRef}>
        {messages.length === 0 && (
          <div className="pchat__empty">
            {enPanel ? (
              <>
                Pregunta sobre <b>lo que estás viendo</b>, o toca una:
                <div className="pchat__sugs">
                  {SUGERENCIAS.map((q) => (
                    <button key={q} className="pchat__sug" onClick={() => send(q)} disabled={busy}>
                      {q}
                    </button>
                  ))}
                </div>
                Consulta la base y cita de qué tabla y período sale cada cifra. No modifica datos.
              </>
            ) : (
              "Entra a una unidad de negocio (Renta Residencial, Hotel, …) y vuelve a abrir a SofIA."
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`pchat__msg pchat__msg--${m.role}`}>
            <div className="pchat__role">{m.role === "user" ? "Tú" : "SofIA"}</div>
            <div className="pchat__text">
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
        {activity && <div className="pchat__activity">{activity}</div>}
        {error && <div className="pchat__error">{error}</div>}
      </div>

      <div className="pchat__input">
        <textarea ref={taRef} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey} rows={2} disabled={busy}
          placeholder={enPanel ? `Pregúntale a SofIA sobre ${vista!.titulo}…` : "Abre un panel primero…"} />
        <Button variant="primary" onClick={() => send()} disabled={busy || !input.trim() || !enPanel}>
          {busy ? "…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}

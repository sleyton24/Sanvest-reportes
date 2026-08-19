// Asistente del panel (solo administradores): burbuja flotante que sabe QUÉ reporte
// está abierto. Cada dashboard publica su vista con useSetVista (unidad, filtros y
// cifras en pantalla) y acá se manda como contexto, así se puede preguntar "¿por qué
// bajó el EBITDA?" sin repetir activo ni período. Las cifras las verifica el agente
// contra la base con herramientas read-only; no modifica datos.
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { ChatMsg, askAgent } from "../api";
import { useVista } from "../viewctx";
import { Button } from "./Button";

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

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const v = getVista();                 // se lee AL ENVIAR: refleja los filtros de ahora
    if (!v?.unidad) { setError("Abre un panel de unidad de negocio para preguntar sobre él."); return; }
    setError(""); setInput("");
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
        title="Preguntar sobre este reporte (solo administradores)">
        <span className="pchat__fabicon">💬</span>
        <span className="pchat__fabtxt">Preguntar al panel</span>
      </button>
    );
  }

  const filtros = Object.entries(vista?.filtros || {}).filter(([, v]) => v !== "" && v != null);

  return (
    <div className="pchat">
      <div className="pchat__head">
        <div>
          <div className="pchat__title">💬 Asistente del panel</div>
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
                Pregunta sobre <b>lo que estás viendo</b>. Por ejemplo:
                <ul>
                  <li>¿Por qué el EBITDA quedó bajo presupuesto este mes?</li>
                  <li>Compáralo con el mismo mes del año anterior.</li>
                  <li>¿Cuál es la cuenta que más se desvió del ppto?</li>
                </ul>
                Consulta la base y cita de qué tabla y período sale cada cifra. No modifica datos.
              </>
            ) : (
              "Entra a una unidad de negocio (Renta Residencial, Hotel, …) y vuelve a abrir el asistente."
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`pchat__msg pchat__msg--${m.role}`}>
            <div className="pchat__role">{m.role === "user" ? "Tú" : "Asistente"}</div>
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
          placeholder={enPanel ? `Pregunta sobre ${vista!.titulo}…` : "Abre un panel primero…"} />
        <Button variant="primary" onClick={send} disabled={busy || !input.trim() || !enPanel}>
          {busy ? "…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}

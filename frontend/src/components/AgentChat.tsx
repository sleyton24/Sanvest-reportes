// Asistente conversacional (agente Claude, read-only) para diagnosticar cargas
// que quedaron mal: revisa los datos de la unidad y guía cómo corregir. NO modifica
// datos. Requiere que el servidor tenga ANTHROPIC_API_KEY y SANVEST_ASK_ENABLED=1.
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { UNITS } from "../units";
import { askAgent, ChatMsg } from "../api";
import { Button } from "./Button";

export function AgentChat() {
  const [unit, setUnit] = useState(UNITS[0].id);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState("");
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, activity]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setError(""); setInput("");
    const base: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages([...base, { role: "assistant", content: "" }]);
    setBusy(true); setActivity("Pensando…");
    try {
      await askAgent(unit, base, {
        onText: (t) => {
          setActivity("");
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + t };
            return copy;
          });
        },
        onTool: (name) => setActivity(`Consultando datos (${name})…`),
      });
    } catch (e) {
      setError((e as Error).message);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last && last.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
    } finally {
      setBusy(false); setActivity("");
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const unitLabel = UNITS.find((u) => u.id === unit)?.label ?? unit;

  return (
    <div className="agent">
      <div className="agent__bar">
        <label className="agent__unit">Unidad:{" "}
          <select value={unit} onChange={(e) => { setUnit(e.target.value); setMessages([]); setError(""); }}>
            {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <span className="agent__hint">
          Consulta los datos y te guía a corregir la carga. No modifica datos (solo diagnostica).
        </span>
      </div>

      <div className="agent__log" ref={logRef}>
        {messages.length === 0 && (
          <div className="agent__empty">
            Ej: «¿La última carga de {unitLabel} pisó algún mes anterior?» · «¿Faltan meses en {unitLabel} este año?»
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`agent__msg agent__msg--${m.role}`}>
            <div className="agent__role">{m.role === "user" ? "Tú" : "Asistente"}</div>
            <div className="agent__text">
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
        {activity && <div className="agent__activity">{activity}</div>}
        {error && <div className="agent__error">{error}</div>}
      </div>

      <div className="agent__input">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
          placeholder={`Pregunta sobre la carga de ${unitLabel}…`} rows={2} disabled={busy} />
        <Button variant="primary" onClick={send} disabled={busy || !input.trim()}>
          {busy ? "…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}

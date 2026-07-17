// Mantenedor de ETL (F4, solo admin). El agente ajusta el SPEC en staging y hace
// dry-runs; NO aplica. El admin sube el crudo problemático, conversa con el agente,
// revisa el dry-run y luego aprueba con «Aplicar» (promueve el spec + carga a prod).
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { UNITS } from "../units";
import {
  askEtlAgent, ChatMsg, etlApply, etlDiscard, etlRollback, etlStatus, etlUpload,
  EtlStatus, UploadError,
} from "../api";
import { Button } from "./Button";

export function MaintainEtlPanel() {
  const [unit, setUnit] = useState("Grupo");
  const [status, setStatus] = useState<EtlStatus | null>(null);
  const [notice, setNotice] = useState("");        // aviso si la unidad no es spec-driven
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState("");
  const [error, setError] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      setStatus(await etlStatus(unit));
      setNotice("");
    } catch (e) {
      setStatus(null);
      setNotice((e as Error).message);
    }
  };

  useEffect(() => { refresh(); setMessages([]); setError(""); /* eslint-disable-next-line */ }, [unit]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [messages, activity]);

  const upload = async (files: FileList) => {
    setError(""); setBusy(true); setActivity("Subiendo crudo…");
    try {
      await etlUpload(unit, Array.from(files));
      await refresh();
    } catch (e) {
      setError(e instanceof UploadError ? String((e.detail as any)?.message ?? (e.detail ?? e.message)) : String(e));
    } finally { setBusy(false); setActivity(""); }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setError(""); setInput("");
    const base: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages([...base, { role: "assistant", content: "" }]);
    setBusy(true); setActivity("Pensando…");
    try {
      await askEtlAgent(unit, base, {
        onText: (t) => {
          setActivity("");
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + t };
            return copy;
          });
        },
        onTool: (name) => setActivity(`Ejecutando: ${name}…`),
      });
      await refresh();  // el agente pudo dejar un spec en staging
    } catch (e) {
      setError((e as Error).message);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last && last.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
    } finally { setBusy(false); setActivity(""); }
  };

  const doApply = async () => {
    if (!confirm("Aplicar: promueve el spec propuesto a vivo (con backup) y carga los crudos a PRODUCCIÓN. ¿Continuar?")) return;
    setError(""); setBusy(true); setActivity("Aplicando (validando + cargando a prod)…");
    try {
      const r = await etlApply(unit);
      const tablas = Object.entries(r.resultado ?? {})
        .map(([t, v]: [string, any]) => `${t}: ${v.filas_actualizadas ?? 0}↻/${v.filas_insertadas ?? 0}+`).join(", ");
      setMessages((prev) => [...prev, { role: "assistant", content: `✓ Aplicado a producción. ${tablas}` }]);
      await refresh();
    } catch (e) {
      const d = e instanceof UploadError ? e.detail : null;
      setError(typeof d === "object" && d ? `${(d as any).message ?? ""} ${(d as any).error ?? ""}` : (e as Error).message);
    } finally { setBusy(false); setActivity(""); }
  };

  const doDiscard = async () => {
    if (!confirm("Descartar el spec propuesto y los crudos subidos (no aplica nada)?")) return;
    setBusy(true);
    try { await etlDiscard(unit); await refresh(); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const doRollback = async () => {
    if (!confirm("Revertir el spec VIVO al último backup? (no toca los datos ya cargados)")) return;
    setBusy(true);
    try {
      const r = await etlRollback(unit);
      setMessages((prev) => [...prev, { role: "assistant", content: `↩ Spec revertido: ${(r.restaurados || []).join(", ")}` }]);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const hasStaged = (status?.staged_specs.length ?? 0) > 0;
  const rawCount = Object.keys(status?.raw_files ?? {}).length;

  return (
    <div className="agent">
      <div className="agent__bar">
        <label className="agent__unit">Unidad:{" "}
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <span className="agent__hint">
          El agente ajusta el <b>spec</b> del ETL cuando cambia el formato del reporte. No aplica: tú revisas y apruebas.
        </span>
      </div>

      {notice && <div className="agent__error">{notice}</div>}

      {status?.spec_driven && (
        <>
          <div className="upload">
            <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={busy}>
              ⬆ Subir crudo problemático
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xlsm" hidden multiple
              onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />
            <span className="upload__msg">
              {rawCount ? `Crudos: ${Object.values(status!.raw_files).join(", ")}` : "Sube el Balance / E°R° que no cuadra."}
            </span>
          </div>

          <div className="card" style={{ margin: "0 0 8px" }}>
            <div className="card__title">Estado del spec</div>
            <div style={{ padding: "4px 12px 10px", fontSize: 13 }}>
              <div>Spec propuesto (staging): <b>{hasStaged ? status!.staged_specs.join(", ") : "— ninguno —"}</b></div>
              {hasStaged && (
                <>
                  <Button variant="ghost" onClick={() => setShowDiff((v) => !v)}>
                    {showDiff ? "Ocultar diff" : "Ver diff vs vivo"}
                  </Button>
                  {showDiff && (
                    <pre className="etl-diff">
                      {status!.staged_specs.map((s) => (status!.diffs[s] || []).join("\n")).join("\n") || "(sin cambios)"}
                    </pre>
                  )}
                </>
              )}
              <div className="etl-actions">
                <Button variant="primary" onClick={doApply} disabled={busy || !hasStaged || !rawCount}
                  title={!hasStaged ? "El agente aún no propuso un spec" : "Valida, promueve el spec y carga a prod"}>
                  ✓ Aplicar a producción
                </Button>
                <Button variant="secondary" onClick={doDiscard} disabled={busy || (!hasStaged && !rawCount)}>Descartar</Button>
                <Button variant="ghost" onClick={doRollback} disabled={busy || !status!.has_backups}>↩ Rollback spec</Button>
              </div>
              {!status!.agent_enabled && (
                <p className="admin-carga__hint">
                  El chat del mantenedor está deshabilitado (falta ANTHROPIC_API_KEY o SANVEST_ETL_AGENT_ENABLED=1).
                  Igual puedes subir crudos y aplicar un spec ya propuesto.
                </p>
              )}
            </div>
          </div>

          <div className="agent__log" ref={logRef}>
            {messages.length === 0 && (
              <div className="agent__empty">
                Sube el crudo que no cuadra y pide, p. ej.: «El E°R° movió las columnas de valor una a la derecha, ajusta el spec».
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`agent__msg agent__msg--${m.role}`}>
                <div className="agent__role">{m.role === "user" ? "Tú" : "Mantenedor"}</div>
                <div className="agent__text">{m.content || (busy && i === messages.length - 1 ? "…" : "")}</div>
              </div>
            ))}
            {activity && <div className="agent__activity">{activity}</div>}
            {error && <div className="agent__error">{error}</div>}
          </div>

          <div className="agent__input">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
              placeholder={status!.agent_enabled ? "Describe qué cambió en el reporte…" : "Chat deshabilitado (ver arriba)"}
              rows={2} disabled={busy || !status!.agent_enabled} />
            <Button variant="primary" onClick={send} disabled={busy || !input.trim() || !status!.agent_enabled}>
              {busy ? "…" : "Enviar"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

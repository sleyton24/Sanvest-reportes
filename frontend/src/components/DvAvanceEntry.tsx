import { useEffect, useState } from "react";
import { saveDvAvance, UploadError } from "../api";
import { fmtPct } from "../format";
import { Button } from "./Button";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const parse = (s: string): number | null => {
  const t = s.trim().replace("%", "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
};

type St = { k: "idle" | "loading" } | { k: "ok"; res: any } | { k: "err"; msg: string };

// Ingreso manual del avance de construcción (%) del proyecto DV en un período.
// El backend lo escribe en dv_construccion (el gauge toma el máximo entre versiones).
export function DvAvanceEntry({ proyecto, label, defaultYear, defaultMonth, open, onToggle, onSaved }: {
  proyecto: string; label: string; defaultYear?: number; defaultMonth?: number;
  open: boolean; onToggle: () => void; onSaved: () => void;
}) {
  const [anio, setAnio] = useState(String(defaultYear ?? 2026));
  const [mes, setMes] = useState(String(defaultMonth ?? 1));
  const [avance, setAvance] = useState("");
  const [st, setSt] = useState<St>({ k: "idle" });
  useEffect(() => { if (defaultYear) setAnio(String(defaultYear)); if (defaultMonth) setMes(String(defaultMonth)); }, [defaultYear, defaultMonth]);

  async function submit() {
    const a = parse(avance);
    if (a == null) { setSt({ k: "err", msg: "Ingresa el avance (%)." }); return; }
    setSt({ k: "loading" });
    try {
      const res = await saveDvAvance({ proyecto, anio: Number(anio), mes: Number(mes), avance: a });
      setSt({ k: "ok", res });
      onSaved();
    } catch (e) {
      const m = e instanceof UploadError ? (typeof e.detail === "string" ? e.detail : (e.detail as any)?.detail ?? `Error ${e.status}`) : String(e);
      setSt({ k: "err", msg: String(m) });
    }
  }

  return (
    <div className="card kpi-entry">
      <button className="card__title kpi-entry__toggle" onClick={onToggle}>
        {open ? "▾" : "▸"} Actualizar avance de construcción — {label}
      </button>
      {open && (
        <div className="kpi-entry__body">
          <div className="kpi-entry__period">
            <label className="kpi-in"><span>Año</span>
              <input inputMode="numeric" value={anio} onChange={(e) => setAnio(e.target.value)} style={{ width: 80 }} /></label>
            <label className="kpi-in"><span>Mes</span>
              <select value={mes} onChange={(e) => setMes(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{MESES[i + 1]}</option>)}
              </select></label>
            <label className="kpi-in"><span>Avance de construcción (%)</span>
              <input inputMode="decimal" placeholder="ej: 95" value={avance}
                onChange={(e) => setAvance(e.target.value)} style={{ width: 140 }} /></label>
          </div>
          <div className="kpi-entry__foot">
            <Button variant="primary" onClick={submit} disabled={st.k === "loading"}>
              {st.k === "loading" ? "Guardando…" : "Guardar avance"}
            </Button>
            {st.k === "ok" && (
              <span className="upload__msg upload__msg--ok">
                ✓ {label} {MESES[Number(mes)]} {anio} — Avance: <b>{fmtPct(st.res.avance, 1)}</b>
              </span>
            )}
            {st.k === "err" && <span className="upload__msg upload__msg--err">✗ {st.msg}</span>}
          </div>
          <div className="kpi-entry__note">
            Se guarda como el avance del período; el gauge <b>Avance construcción</b> lo toma al
            elegir ese mes/año. Acepta 95 o 0,95.
          </div>
        </div>
      )}
    </div>
  );
}

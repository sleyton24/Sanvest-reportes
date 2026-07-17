import { useEffect, useState } from "react";
import { saveUsaKpis, UsaKpiInput, UploadError } from "../api";
import { Button } from "./Button";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const parse = (s: string): number | null => {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
};
// para $/SQF (decimales chicos) no quitamos el punto de miles
const parseDec = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
};

type St = { k: "idle" | "loading" } | { k: "ok"; msg: string } | { k: "err"; msg: string };

// Ingreso manual de los KPIs mensuales USA que NO vienen del informe Yardi:
// Ocupación Residencial Real (%) y Rent $/SQF Actual (residencial + retail).
// El Budget/Ppto viene del PPTO cargado; el YTD lo calcula el backend.
export function UsaKpiEntry({ activo, defaultYear, defaultMonth, open, onToggle, onSaved }: {
  activo: string; defaultYear?: number; defaultMonth?: number;
  open: boolean; onToggle: () => void; onSaved: () => void;
}) {
  const [anio, setAnio] = useState(String(defaultYear ?? 2026));
  const [mes, setMes] = useState(String(defaultMonth ?? 1));
  const [f, setF] = useState({ occ: "", sqf: "", sqfr: "" });
  const [st, setSt] = useState<St>({ k: "idle" });
  useEffect(() => { if (defaultYear) setAnio(String(defaultYear)); if (defaultMonth) setMes(String(defaultMonth)); }, [defaultYear, defaultMonth]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    const body: UsaKpiInput = {
      activo, anio: Number(anio), mes: Number(mes),
      occ_actual: parse(f.occ),               // acepta 81,4 (%) o 0,814
      sqf_actual: parseDec(f.sqf),
      sqf_retail_actual: parseDec(f.sqfr),
    };
    if (body.occ_actual == null && body.sqf_actual == null && body.sqf_retail_actual == null) {
      setSt({ k: "err", msg: "Ingresa al menos un valor (ocupación o $/SQF)." }); return;
    }
    setSt({ k: "loading" });
    try {
      await saveUsaKpis(body);
      setSt({ k: "ok", msg: `✓ Guardado ${activo} ${MESES[Number(mes)]} ${anio}` });
      onSaved();
    } catch (e) {
      const m = e instanceof UploadError ? (typeof e.detail === "string" ? e.detail : (e.detail as any)?.detail ?? `Error ${e.status}`) : String(e);
      setSt({ k: "err", msg: String(m) });
    }
  }

  const field = (label: string, k: keyof typeof f, ph = "") => (
    <label className="kpi-in">
      <span>{label}</span>
      <input inputMode="decimal" placeholder={ph} value={f[k]} onChange={set(k)} />
    </label>
  );

  return (
    <div className="card kpi-entry">
      <button className="card__title kpi-entry__toggle" onClick={onToggle}>
        {open ? "▾" : "▸"} Ingresar KPIs del mes — {activo}
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
          </div>
          <div className="kpi-entry__grid">
            <div className="kpi-entry__col">
              <div className="kpi-entry__h">Ocupación Residencial</div>
              {field("Real (%)", "occ", "ej: 81,4")}
            </div>
            <div className="kpi-entry__col">
              <div className="kpi-entry__h">Rent $/SQF Residencial</div>
              {field("Actual", "sqf", "ej: 3,36")}
            </div>
            <div className="kpi-entry__col">
              <div className="kpi-entry__h">Rent $/SQF Retail</div>
              {field("Actual", "sqfr", "ej: 2,10")}
            </div>
          </div>
          <div className="kpi-entry__foot">
            <Button variant="primary" onClick={submit} disabled={st.k === "loading"}>
              {st.k === "loading" ? "Guardando…" : "Guardar KPIs"}
            </Button>
            {st.k === "ok" && <span className="upload__msg upload__msg--ok">{st.msg}</span>}
            {st.k === "err" && <span className="upload__msg upload__msg--err">✗ {st.msg}</span>}
          </div>
          <div className="kpi-entry__note">
            Solo el <b>Real/Actual</b> (el Budget viene del PPTO). Ocupación en % (ej: 81,4).
            Alimenta el gauge de Ocupación y las tarjetas Rent KPI's ($/SQF); el <b>YTD</b> se
            calcula solo (promedio de los meses). Para verlo, elegí ese mes y año en el slicer.
          </div>
        </div>
      )}
    </div>
  );
}

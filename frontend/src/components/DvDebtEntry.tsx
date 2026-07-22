import { useEffect, useState } from "react";
import { saveDvDebt, UploadError } from "../api";
import { fmtUF } from "../format";
import { Button } from "./Button";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const parse = (s: string): number | null => {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
};

type St = { k: "idle" | "loading" } | { k: "ok"; res: any } | { k: "err"; msg: string };

// Ingreso manual de la DEUDA (línea de crédito girada) del proyecto DV en un
// período. El backend recalcula el CAPITAL SOCIOS (= egresos − deuda − preventas)
// y escribe en dv_uso_y_fondo, así el pivot Usos y Fondos se actualiza solo.
export function DvDebtEntry({ proyecto, label, defaultYear, defaultMonth, open, onToggle, onSaved }: {
  proyecto: string; label: string; defaultYear?: number; defaultMonth?: number;
  open: boolean; onToggle: () => void; onSaved: () => void;
}) {
  const [anio, setAnio] = useState(String(defaultYear ?? 2026));
  const [mes, setMes] = useState(String(defaultMonth ?? 1));
  const [deuda, setDeuda] = useState("");
  const [amort, setAmort] = useState("");
  const [st, setSt] = useState<St>({ k: "idle" });
  useEffect(() => { if (defaultYear) setAnio(String(defaultYear)); if (defaultMonth) setMes(String(defaultMonth)); }, [defaultYear, defaultMonth]);

  async function submit() {
    const d = parse(deuda);
    const a = parse(amort);
    if (d == null && a == null) { setSt({ k: "err", msg: "Ingresa la línea girada y/o el amortizado." }); return; }
    setSt({ k: "loading" });
    try {
      const res = await saveDvDebt({ proyecto, anio: Number(anio), mes: Number(mes), deuda: d, amortizado: a });
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
        {open ? "▾" : "▸"} Actualizar deuda — {label}
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
            <label className="kpi-in"><span>Línea de crédito girada (UF)</span>
              <input inputMode="decimal" placeholder="ej: 225.597" value={deuda}
                onChange={(e) => setDeuda(e.target.value)} style={{ width: 160 }} /></label>
            <label className="kpi-in"><span>Amortizado acumulado (UF)</span>
              <input inputMode="decimal" placeholder="ej: 176.005" value={amort}
                onChange={(e) => setAmort(e.target.value)} style={{ width: 160 }} /></label>
          </div>
          <div className="kpi-entry__foot">
            <Button variant="primary" onClick={submit} disabled={st.k === "loading"}>
              {st.k === "loading" ? "Guardando…" : "Guardar deuda"}
            </Button>
            {st.k === "ok" && (
              <span className="upload__msg upload__msg--ok">
                ✓ {label} {MESES[Number(mes)]} {anio}
                {st.res.capital_socios != null && <> — Capital socios: <b>{fmtUF(st.res.capital_socios)}</b> UF</>}
                {st.res.saldo_deuda != null && <> — Saldo deuda: <b>{fmtUF(st.res.saldo_deuda)}</b> UF</>}
              </span>
            )}
            {st.k === "err" && <span className="upload__msg upload__msg--err">✗ {st.msg}</span>}
          </div>
          <div className="kpi-entry__note">
            <b>Capital socios</b> se calcula solo = Egresos a la fecha − Deuda − Preventas (identidad
            Usos = Fondos). Se guarda en “Usos y Fondos”, así el cuadro de abajo se actualiza al
            elegir ese mes/año en el slicer.
          </div>
        </div>
      )}
    </div>
  );
}

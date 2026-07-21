// Panel de auditoría de datos (solo admin): corre chequeos deterministas sobre las
// tablas cargadas y muestra alertas (desactualizado, meses faltantes, datos pegados,
// vacío). Bajo demanda — botón "Auditar ahora".
import { useRef, useState } from "react";
import { AuditResult, AuditAlert, AuditCompareResult, runAudit, compareAudit, UploadError } from "../api";
import { UNITS } from "../units";
import { Button } from "./Button";

const UNIT_LABEL: Record<string, string> = Object.fromEntries(UNITS.map((u) => [u.id, u.label]));
const unitLabel = (id: string) => UNIT_LABEL[id] ?? id;
// unidades con comparación Excel-vs-app disponible (transform separable del ETL)
const CMP_UNITS = [{ id: "ICEMM", label: "ICEMM (Construcción)" }, { id: "Hotel", label: "OLÁ Hotel" }];

const SEV: Record<string, { label: string; cls: string }> = {
  error: { label: "Error", cls: "audit-sev--error" },
  warn: { label: "Advertencia", cls: "audit-sev--warn" },
  info: { label: "Info", cls: "audit-sev--info" },
};
const CHECK_LABEL: Record<string, string> = {
  stale: "Desactualizado",
  gaps: "Meses faltantes",
  pegados: "Datos pegados",
  vacio: "Vacío",
  "error-chequeo": "Error de chequeo",
};

export function AuditPanel() {
  const [res, setRes] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true); setError("");
    try { setRes(await runAudit()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  // --- comparación Excel cargado vs app ---
  const [cUnit, setCUnit] = useState(CMP_UNITS[0].id);
  const [cRes, setCRes] = useState<AuditCompareResult | null>(null);
  const [cLoading, setCLoading] = useState(false);
  const [cErr, setCErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const compare = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setCErr("Elige un archivo .xlsx primero."); return; }
    setCLoading(true); setCErr(""); setCRes(null);
    try { setCRes(await compareAudit(cUnit, file)); }
    catch (e) {
      const m = e instanceof UploadError ? (typeof e.detail === "string" ? e.detail : `Error ${e.status}`) : (e as Error).message;
      setCErr(String(m));
    } finally { setCLoading(false); }
  };

  return (
    <div className="audit">
      <div className="audit__bar">
        <span className="audit__hint">
          Revisa los datos cargados: tablas desactualizadas, meses faltantes, datos pegados
          (cargas duplicadas) y tablas vacías. Corre sobre todas las unidades.
        </span>
        <Button variant="primary" onClick={run} disabled={loading} style={{ marginLeft: "auto" }}>
          {loading ? "Auditando…" : "Auditar ahora"}
        </Button>
      </div>

      {error && <div className="state state--error">{error}</div>}

      {res && (
        <>
          <div className="kpi__grid audit__kpis">
            <div className="kpi__item"><div className="kpi__value" style={{ color: res.summary.errores ? "var(--neg)" : undefined }}>{res.summary.errores}</div><div className="kpi__label">Errores</div></div>
            <div className="kpi__item"><div className="kpi__value" style={{ color: res.summary.advertencias ? "#b8860b" : undefined }}>{res.summary.advertencias}</div><div className="kpi__label">Advertencias</div></div>
            <div className="kpi__item"><div className="kpi__value">{res.summary.info}</div><div className="kpi__label">Info</div></div>
            <div className="kpi__item"><div className="kpi__value">{res.alerts.length === 0 ? "✓" : res.alerts.length}</div><div className="kpi__label">{res.alerts.length === 0 ? "Todo en orden" : "Alertas totales"}</div></div>
          </div>

          <div className="card">
            <div className="card__title">Resultado de la auditoría</div>
            {res.alerts.length === 0 ? (
              <div className="state">Sin alertas: los datos cargados se ven correctos. ✓</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Severidad</th><th>Unidad</th><th>Tabla</th><th>Chequeo</th><th>Detalle</th></tr>
                </thead>
                <tbody>
                  {res.alerts.map((a: AuditAlert, i) => (
                    <tr key={i}>
                      <td><span className={"audit-sev " + (SEV[a.severity]?.cls ?? "")}>{SEV[a.severity]?.label ?? a.severity}</span></td>
                      <td>{unitLabel(a.unit)}</td>
                      <td><code>{a.table}</code></td>
                      <td>{CHECK_LABEL[a.check] ?? a.check}</td>
                      <td>{a.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="audit__foot">Generado: {res.generated}. Los chequeos son solo lectura (no modifican datos).</div>
        </>
      )}

      {!res && !error && !loading && (
        <div className="state">Presiona “Auditar ahora” para revisar los datos cargados.</div>
      )}

      {/* ---- Verificar Excel cargado vs app ---- */}
      <div className="card">
        <div className="card__title">Verificar Excel cargado vs app</div>
        <div className="audit__cmpbar">
          <label className="kpi-in"><span>Unidad</span>
            <select value={cUnit} onChange={(e) => setCUnit(e.target.value)}>
              {CMP_UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select></label>
          <label className="kpi-in"><span>Archivo (.xlsx)</span>
            <input type="file" accept=".xlsx,.xlsm" ref={fileRef} /></label>
          <Button variant="primary" onClick={compare} disabled={cLoading}>
            {cLoading ? "Comparando…" : "Comparar"}
          </Button>
        </div>
        <div className="audit__cmphint">
          Re-parsea el archivo con el mismo ETL (sin cargar nada) y lo compara contra lo que
          muestra la app. Útil para confirmar que una carga quedó igual al Excel original.
        </div>
        {cErr && <div className="upload__msg upload__msg--err">✗ {cErr}</div>}
        {cRes && (
          <div style={{ marginTop: 12 }}>
            <div className={"audit__cmpsum " + (cRes.ok ? "audit__cmpsum--ok" : "audit__cmpsum--bad")}>
              {cRes.ok
                ? `✓ El Excel coincide con la app (${cRes.comparadas} filas × ${cRes.columnas_medida} columnas revisadas).`
                : `⚠ ${cRes.n_diferencias} diferencia(s)` + (cRes.n_faltan_en_app ? ` y ${cRes.n_faltan_en_app} fila(s) del Excel que no están en la app` : "") + `. (${cRes.comparadas} filas comparadas)`}
            </div>
            {cRes.n_faltan_en_app > 0 && (
              <div className="audit__cmphint">No están en la app: {cRes.faltan_en_app.join(" · ")}</div>
            )}
            {cRes.diferencias.length > 0 && (
              <table className="admin-table" style={{ marginTop: 8 }}>
                <thead><tr><th>Clave</th><th>Columna</th><th className="num">Excel</th><th className="num">App</th><th className="num">Δ</th></tr></thead>
                <tbody>
                  {cRes.diferencias.map((d, i) => (
                    <tr key={i}>
                      <td><code>{d.clave}</code></td><td>{d.columna}</td>
                      <td className="num">{d.excel.toLocaleString("es-CL")}</td>
                      <td className="num">{d.app.toLocaleString("es-CL")}</td>
                      <td className="num" style={{ color: "var(--neg)" }}>{d.dif.toLocaleString("es-CL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

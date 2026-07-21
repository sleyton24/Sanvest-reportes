// Panel de auditoría de datos (solo admin): corre chequeos deterministas sobre las
// tablas cargadas y muestra alertas (desactualizado, meses faltantes, datos pegados,
// vacío). Bajo demanda — botón "Auditar ahora".
import { useState } from "react";
import { AuditResult, AuditAlert, runAudit } from "../api";
import { UNITS } from "../units";
import { Button } from "./Button";

const UNIT_LABEL: Record<string, string> = Object.fromEntries(UNITS.map((u) => [u.id, u.label]));
const unitLabel = (id: string) => UNIT_LABEL[id] ?? id;

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
    </div>
  );
}

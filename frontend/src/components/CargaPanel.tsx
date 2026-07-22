// Módulo de carga unificado (inline). Un solo componente que, según la unidad,
// arma los paneles de carga correctos + un botón para descargar una plantilla de
// ejemplo con el formato esperado. Solo se muestra a usuarios con permiso de carga
// (admin); para el resto renderiza nada.
//
// Nota: el ingreso MANUAL de KPIs de USA (formulario, no archivo) es una sección
// aparte que vive en USADashboard; acá cubrimos las cargas de archivos.
import { useState } from "react";
import { InformeUploadPanel } from "./InformeUploadPanel";
import { UploadPanel } from "./UploadPanel";
import { fetchExample, refreshRrEdificios, UploadError } from "../api";
import { useAuth } from "../auth";
import { Button } from "./Button";

// "informe" = upsert mensual con histórico; "excel" = reemplazo completo;
// "sqllar" = recálculo en vivo de KPIs por edificio desde la BD operativa.
type PanelCfg =
  | { kind: "informe"; label?: string }
  | { kind: "excel" }
  | { kind: "sqllar"; label?: string };

const CARGA: Record<string, PanelCfg[]> = {
  DV: [{ kind: "informe", label: "⬆ Cargar Informes de Ventas" }, { kind: "excel" }],
  RR: [{ kind: "informe" }, { kind: "informe", label: "⬆ Cargar LAR Group (consolidado)" },
       { kind: "sqllar", label: "⟳ Actualizar KPIs por edificio (SQLLAR)" }],
  Hotel: [{ kind: "informe", label: "⬆ Cargar CCPP" }],
  USA: [{ kind: "informe", label: "⬆ Cargar Informe Yardi" }],
  ICEMM: [{ kind: "informe", label: "⬆ Cargar Informe ICEMM" }],
  Atempora: [{ kind: "informe", label: "⬆ Cargar Civitas (FC / KPIs / Morosidad)" }, { kind: "excel" }],
  Grupo: [{ kind: "informe", label: "⬆ Cargar Balance + E°R° (crudos)" }],
};

// Botón de recálculo en vivo (RR: KPIs por edificio desde SQLLAR).
function SqllarRefresh({ label, onLoaded }: { label: string; onLoaded: () => void }) {
  const [st, setSt] = useState<{ k: "idle" | "loading" } | { k: "ok"; n: number } | { k: "err"; msg: string }>({ k: "idle" });
  const run = async () => {
    setSt({ k: "loading" });
    try {
      const res = await refreshRrEdificios();
      const r = Object.values(res.resultado ?? {})[0] as any;
      setSt({ k: "ok", n: r?.edificios ?? 0 });
      onLoaded();
    } catch (e) {
      const m = e instanceof UploadError ? (typeof e.detail === "string" ? e.detail : (e.detail as any)?.detail ?? `Error ${e.status}`) : String(e);
      setSt({ k: "err", msg: String(m) });
    }
  };
  return (
    <div className="upload">
      <Button variant="primary" onClick={run} disabled={st.k === "loading"}>
        {st.k === "loading" ? "Actualizando…" : label}
      </Button>
      {st.k === "ok" && <span className="upload__msg upload__msg--ok">✓ {st.n} edificios actualizados</span>}
      {st.k === "err" && <span className="upload__msg upload__msg--err">✗ {st.msg}</span>}
    </div>
  );
}

export function CargaPanel({ unit, onLoaded }: { unit: string; onLoaded: () => void }) {
  const { user } = useAuth();
  const [dl, setDl] = useState<"idle" | "loading" | "error">("idle");
  const cfg = CARGA[unit];
  if (!user?.can_upload || !cfg) return null;

  const descargarEjemplo = async () => {
    setDl("loading");
    try {
      const blob = await fetchExample(unit);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ejemplo_${unit}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDl("idle");
    } catch {
      setDl("error");
    }
  };

  return (
    <>
      {cfg.map((p, i) =>
        p.kind === "excel"
          ? <UploadPanel key={i} unit={unit} onLoaded={onLoaded} />
          : p.kind === "sqllar"
            ? <SqllarRefresh key={i} label={p.label ?? "⟳ Actualizar KPIs por edificio"} onLoaded={onLoaded} />
            : <InformeUploadPanel key={i} unit={unit} label={p.label} onLoaded={onLoaded} />,
      )}
      <div className="upload">
        <Button variant="ghost" onClick={descargarEjemplo} disabled={dl === "loading"}
          title="Descarga un Excel con las hojas y columnas esperadas">
          {dl === "loading" ? "Generando…" : "⬇ Descargar ejemplo"}
        </Button>
        {dl === "error" && <span className="upload__msg upload__msg--err">No se pudo generar el ejemplo.</span>}
      </div>
    </>
  );
}

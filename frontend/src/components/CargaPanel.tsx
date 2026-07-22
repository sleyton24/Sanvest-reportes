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
import { fetchExample } from "../api";
import { useAuth } from "../auth";
import { Button } from "./Button";

// "informe" = upsert mensual con histórico; "excel" = reemplazo completo.
type PanelCfg =
  | { kind: "informe"; label?: string }
  | { kind: "excel" };

const CARGA: Record<string, PanelCfg[]> = {
  DV: [{ kind: "informe", label: "⬆ Cargar Informes de Ventas" }, { kind: "excel" }],
  RR: [{ kind: "informe" }, { kind: "informe", label: "⬆ Cargar LAR Group (consolidado)" }],
  Hotel: [{ kind: "informe", label: "⬆ Cargar CCPP" }],
  USA: [{ kind: "informe", label: "⬆ Cargar Informe Yardi" }],
  ICEMM: [{ kind: "informe", label: "⬆ Cargar Informe ICEMM" }],
  Atempora: [{ kind: "informe", label: "⬆ Cargar Flujo de Caja (EERR arriendo)" }, { kind: "excel" }],
  Grupo: [{ kind: "informe", label: "⬆ Cargar Balance + E°R° (crudos)" }],
};

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

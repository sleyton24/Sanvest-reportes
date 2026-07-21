// Panel de administración (solo admin): carga centralizada de todas las unidades
// + gestión de usuarios. Se llega desde la pestaña "Admin" del topnav.
import { useState } from "react";
import { UNITS } from "../units";
import { CargaPanel } from "../components/CargaPanel";
import { UsersAdmin } from "../components/UsersAdmin";
import { AgentChat } from "../components/AgentChat";
import { MaintainEtlPanel } from "../components/MaintainEtlPanel";
import { AccessStats } from "../components/AccessStats";
import { AuditPanel } from "../components/AuditPanel";
import { Button } from "../components/Button";

type Section = "carga" | "usuarios" | "accesos" | "auditoria" | "asistente" | "etl";

export function AdminPage() {
  const [section, setSection] = useState<Section>("carga");
  return (
    <div className="dash admin">
      <header className="dash__header">
        <h1>Administración</h1>
        <div className="viewtoggle">
          <Button variant="toggle" active={section === "carga"} onClick={() => setSection("carga")}>Carga</Button>
          <Button variant="toggle" active={section === "usuarios"} onClick={() => setSection("usuarios")}>Usuarios</Button>
          <Button variant="toggle" active={section === "accesos"} onClick={() => setSection("accesos")}>Accesos</Button>
          <Button variant="toggle" active={section === "auditoria"} onClick={() => setSection("auditoria")}>Auditoría</Button>
          <Button variant="toggle" active={section === "asistente"} onClick={() => setSection("asistente")}>Asistente</Button>
          <Button variant="toggle" active={section === "etl"} onClick={() => setSection("etl")}>Mantener ETL</Button>
        </div>
      </header>
      {section === "carga" && <CargaCentral />}
      {section === "usuarios" && <UsersAdmin />}
      {section === "accesos" && <AccessStats />}
      {section === "auditoria" && <AuditPanel />}
      {section === "asistente" && <AgentChat />}
      {section === "etl" && <MaintainEtlPanel />}
    </div>
  );
}

function CargaCentral() {
  return (
    <div className="admin-carga">
      <p className="admin-carga__intro">
        Sube los archivos de cada unidad. Corre el ETL y actualiza los dashboards.
      </p>
      {UNITS.map((u) => (
        <div key={u.id} className="card admin-carga__block">
          <div className="card__title">{u.label}</div>
          <CargaPanel unit={u.id} onLoaded={() => {}} />
          {u.id === "USA" && (
            <p className="admin-carga__hint">
              El ingreso manual de KPIs de USA (ocupación, $/SQF) está en el dashboard de USA,
              porque depende de la propiedad y el mes seleccionados.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

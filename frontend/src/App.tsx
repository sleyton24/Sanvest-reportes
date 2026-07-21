import { useEffect, useState } from "react";
import { PrintLabelsProvider } from "./print";
import { DVDashboard } from "./pages/DVDashboard";
import { HotelDashboard } from "./pages/HotelDashboard";
import { RRDashboard } from "./pages/RRDashboard";
import { USADashboard } from "./pages/USADashboard";
import { ICEMMDashboard } from "./pages/ICEMMDashboard";
import { AtemporaDashboard } from "./pages/AtemporaDashboard";
import { GrupoDashboard } from "./pages/GrupoDashboard";
import { MainMenu } from "./pages/MainMenu";
import { Login } from "./pages/Login";
import { AdminPage } from "./pages/AdminPage";
import { PptDirectorio } from "./pages/PptDirectorio";
import { ChangePassword } from "./components/ChangePassword";
import { Comments } from "./components/Comments";
import { useAuth } from "./auth";
import { UNITS } from "./units";
import { logUnitAccess } from "./api";

const UNIT_IDS = new Set(UNITS.map((u) => u.id));

export function App() {
  const { user, loading, logout } = useAuth();
  const [unit, setUnit] = useState("menu");
  // Reporte PDF: mientras está activo, los gráficos dibujan sus etiquetas de datos.
  const [printLabels, setPrintLabels] = useState(false);
  const [showPw, setShowPw] = useState(false);   // modal "cambiar mi contraseña"
  const [showComments, setShowComments] = useState(false);  // modal foro de la unidad

  // Al cerrar el diálogo de impresión (afterprint) apagamos las etiquetas.
  useEffect(() => {
    const off = () => setPrintLabels(false);
    window.addEventListener("afterprint", off);
    return () => window.removeEventListener("afterprint", off);
  }, []);

  // Enciende las etiquetas, espera un re-render (~400ms) y lanza la impresión.
  const exportPDF = () => {
    setPrintLabels(true);
    window.setTimeout(() => window.print(), 400);
  };

  // Bitácora: al abrir el dashboard de una unidad de negocio, registra el acceso
  // (una vez por apertura). No cuenta "menu" ni "admin".
  useEffect(() => {
    if (user && UNIT_IDS.has(unit)) logUnitAccess(unit);
  }, [unit, user]);

  // Gate de sesión: mientras rehidrata, spinner; sin usuario, pantalla de login.
  if (loading) return <div className="state">Cargando…</div>;
  if (!user) return <Login />;

  // Solo las unidades visibles para el usuario (admin ve todas).
  const units = UNITS.filter((u) => user.is_admin || user.units.includes(u.id));
  const currentUnit = UNITS.find((u) => u.id === unit);   // para el foro de comentarios

  return (
    <PrintLabelsProvider value={printLabels}>
      <div className={`app unit-${unit}`}>
        <nav className="topnav">
          <button className="brand brand--btn" onClick={() => setUnit("menu")} title="Menú principal">
            <img className="brand__logo" src="/sanvest-blanco.png" alt="Sanvest" />
          </button>
          {units.map((u) => (
            <button
              key={u.id}
              className={"topnav__tab" + (unit === u.id ? " topnav__tab--active" : "")}
              onClick={() => setUnit(u.id)}
            >
              {u.label}
            </button>
          ))}
          {/* PPT Directorio: PDF visible en línea para todos */}
          <button
            className={"topnav__tab" + (unit === "ppt" ? " topnav__tab--active" : "")}
            onClick={() => setUnit("ppt")}
          >
            PPT Directorio
          </button>
          {/* pestaña Admin: carga centralizada + gestión de usuarios (solo admin) */}
          {user.is_admin && (
            <button
              className={"topnav__tab topnav__tab--admin" + (unit === "admin" ? " topnav__tab--active" : "")}
              onClick={() => setUnit("admin")}
            >
              Admin
            </button>
          )}
          {/* comentarios de la unidad abierta (foro de directores) */}
          {currentUnit && (
            <button className="topnav__pdf topnav__comments" onClick={() => setShowComments(true)}
              title={`Comentarios de ${currentUnit.label}`}>
              💬 Comentarios
            </button>
          )}
          {/* a la derecha: exporta la vista actual a PDF con etiquetas de datos */}
          <button className="topnav__pdf" onClick={exportPDF} title="Exportar a PDF / imprimir">
            🖨 PDF
          </button>
          {/* menú de usuario: nombre + cerrar sesión */}
          <div className="usermenu">
            <button className="usermenu__name usermenu__name--btn" onClick={() => setShowPw(true)}
              title="Cambiar mi contraseña">
              <span className="usermenu__fullname">{user.full_name || user.username}</span>
              {user.is_admin && <span className="usermenu__role">admin</span>}
            </button>
            <button className="usermenu__logout" onClick={logout} title="Cerrar sesión">
              Salir
            </button>
          </div>
        </nav>
        {showPw && <ChangePassword onClose={() => setShowPw(false)} />}
        {showComments && currentUnit && (
          <Comments unit={currentUnit.id} unitLabel={currentUnit.label} onClose={() => setShowComments(false)} />
        )}
        {unit === "menu" && <MainMenu onPick={setUnit} />}
        {unit === "DV" && <DVDashboard />}
        {unit === "RR" && <RRDashboard />}
        {unit === "Hotel" && <HotelDashboard />}
        {unit === "USA" && <USADashboard />}
        {unit === "ICEMM" && <ICEMMDashboard />}
        {unit === "Atempora" && <AtemporaDashboard />}
        {unit === "Grupo" && <GrupoDashboard />}
        {unit === "ppt" && <PptDirectorio />}
        {unit === "admin" && user.is_admin && <AdminPage />}
      </div>
    </PrintLabelsProvider>
  );
}

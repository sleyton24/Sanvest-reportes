// Menú principal (landing): saludo "Hola, <nombre>" que tras un rato da paso al
// logo Sanvest (crossfade), + tarjetas por unidad de negocio con su color de marca.
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth";

// Cuánto dura el saludo antes de ceder el lugar al logo Sanvest.
const HELLO_MS = 7_000; // 7 segundos

type Tile = { id: string; label: string; sub: string; color: string; desc: string; icon: ReactNode; logo?: string };

const I = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
    strokeLinecap="round" strokeLinejoin="round" width="26" height="26"><path d={d} /></svg>
);
const ICON: Record<string, ReactNode> = {
  // edificio (inmobiliario)
  DV: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-4h4v4" /></svg>,
  // bloques residenciales (multifamily)
  RR: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M3 21V9l6-4 6 4M15 21V11l3-2 3 2v10M3 21h18M6 13h0M6 17h0" /></svg>,
  // cama (hotelería)
  Hotel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M3 18v-6h18v6M3 18v-9M21 18v-3M3 12V9a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3" /></svg>,
  // dólar (USA)
  USA: I("M12 2v20M16 6.5C16 4.6 14.2 4 12 4S8 4.8 8 7s2 2.8 4 3 4 1 4 3.2-1.8 3-4 3-4-.6-4-2.5"),
  // grúa torre (construcción)
  ICEMM: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M4 21h6M7 21V5M2 5h19M7 5V3M7 3l8 2M7 3L2 5M18 5v5M19.5 10a1.5 1.5 0 1 1-3 0" /></svg>,
  // torre mixta (Atémpora / Civitas)
  Atempora: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <rect x="6" y="3" width="12" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h6v6" /></svg>,
  // barras (estados financieros)
  EF: I("M5 21V11M12 21V4M19 21v-7M3 21h18"),
};

const TILES: Tile[] = [
  { id: "DV", label: "Desarrollo para la Venta", sub: "Inmobiliario", color: "#A8C813",
    desc: "Millalongo · Sta. Victoria 99 · Sta. Victoria 155", icon: ICON.DV, logo: "/sanvest-azul.png" },
  { id: "RR", label: "Renta Residencial", sub: "Multifamily — LAR Group", color: "#3796AA",
    desc: "Holding LAR · SOHO · PARK", icon: ICON.RR, logo: "/logos/lar.png" },
  { id: "Hotel", label: "OLÁ Hotel", sub: "Hotelería", color: "#FACF22",
    desc: "OLÁ Providencia", icon: ICON.Hotel, logo: "/logos/ola.png" },
  { id: "USA", label: "USA", sub: "Estados Unidos", color: "#EF731B",
    desc: "Bemiston · Mila · St Grand", icon: ICON.USA, logo: "/logos/double-eagle.png" },
  { id: "ICEMM", label: "Construcción", sub: "ICEMM", color: "#D83252",
    desc: "Indicadores Financieros · Flujo de Caja", icon: ICON.ICEMM, logo: "/logos/emm.png" },
  // Atémpora no tiene logo limpio aún (ver logos/README.txt) → mantiene su ícono
  { id: "Atempora", label: "Atémpora", sub: "Multi-uso — Civitas", color: "#8b6fd6",
    desc: "Oficinas · Locales · Arriendos · Morosidad", icon: ICON.Atempora },
  { id: "Grupo", label: "Estados Financieros", sub: "Grupo Sanvest", color: "#5566cc",
    desc: "Balance · EERR", icon: ICON.EF, logo: "/sanvest-azul.png" },
];

const ARROW = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export function MainMenu({ onPick }: { onPick: (id: string) => void }) {
  const { user } = useAuth();
  // Primer nombre para el saludo: full_name si existe; si no, el usuario sin el @dominio.
  const firstName = (user?.full_name?.trim() || user?.username.split("@")[0] || "")
    .split(/\s+/)[0];
  // Tras HELLO_MS, el saludo sale con animación y entra el logo Sanvest.
  const [showLogo, setShowLogo] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowLogo(true), HELLO_MS);
    return () => window.clearTimeout(t);
  }, []);
  // Solo las unidades visibles para el usuario (admin ve todas).
  const canSee = (id: string) => !!user && (user.is_admin || user.units.includes(id));
  const visible = TILES.filter((t) => canSee(t.id));
  // "Estados Financieros" (Grupo) es el consolidado del directorio: va destacado
  // arriba al centro (solo si el usuario lo ve); el resto queda en la grilla.
  const featured = visible.find((t) => t.id === "Grupo") ?? null;
  const units = visible.filter((t) => t.id !== "Grupo");

  return (
    <div className="menu">
      <div className="menu__glow" />
      <header className="menu__hero">
        {/* Mismo espacio para saludo y logo: crossfade sin salto de layout. */}
        <div className={`menu__swap${showLogo ? " menu__swap--logo" : ""}`}>
          <div className="menu__hello">
            Hola{firstName ? <>, <span className="menu__hello-name">{firstName}</span></> : ""}
          </div>
          <img className="menu__logo" src="/sanvest-azul.png" alt="Sanvest" />
        </div>
        <div className="menu__rule menu__anim menu__anim--3" />
        <div className="menu__title menu__anim menu__anim--3">Reportes · Inteligencia de Negocios</div>
        <div className="menu__subtitle menu__anim menu__anim--4">Selecciona una unidad de negocio</div>
      </header>

      {featured && (
        <div className="menu__featured menu__anim menu__anim--5">
          <button className="tile tile--featured" style={{ ["--tile" as any]: featured.color }}
            onClick={() => onPick(featured.id)}>
            {featured.logo
              ? <img className="tile__logo" src={featured.logo} alt={featured.label} />
              : <span className="tile__icon">{featured.icon}</span>}
            <span className="tile__body">
              <span className="tile__sub">{featured.sub}</span>
              <span className="tile__label">{featured.label}</span>
              <span className="tile__desc">{featured.desc}</span>
            </span>
            <span className="tile__go">Abrir{ARROW}</span>
          </button>
        </div>
      )}

      <div className="menu__grid menu__anim menu__anim--6">
        {units.map((t) => (
          <button key={t.id} className="tile" style={{ ["--tile" as any]: t.color }}
            onClick={() => onPick(t.id)}>
            {t.logo
              ? <img className="tile__logo" src={t.logo} alt={t.label} />
              : <span className="tile__icon">{t.icon}</span>}
            <span className="tile__sub">{t.sub}</span>
            <span className="tile__label">{t.label}</span>
            <span className="tile__desc">{t.desc}</span>
            <span className="tile__go">Abrir{ARROW}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

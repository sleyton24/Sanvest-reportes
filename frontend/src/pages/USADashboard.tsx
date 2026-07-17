import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { fetchRows, num, Row } from "../api";
import { CardSpec } from "../config";
import { last12 } from "../data";
import { fmtNum, fmtPct, fmtInt, fmtRatio, periodKey } from "../format";
import { Slicer } from "../components/Slicer";
import { Gauge } from "../components/Gauge";
import { KpiCard } from "../components/KpiCard";
import { PnLMatrix, PnLCol, PnLHeaderGroup } from "../components/PnLMatrix";
import { UsaKpiEntry } from "../components/UsaKpiEntry";
import { Button } from "../components/Button";
import { useAuth } from "../auth";
import { BarsLineChart, MultiLineChart } from "../components/charts/Charts";

// Operating Statements (Seccion > Linea) con columnas Mensual | YTD fusionadas
const STMT_LEVELS = ["Seccion", "Linea"];
const STMT_COLS: PnLCol[] = [
  { key: "Real", label: "Real" },
  { key: "Ppto", label: "Ppto" },
  { delta: ["Real", "Ppto"], label: "Δ", color: true },
  { key: "YTD", label: "Real", sep: true },
  { key: "YTD_Ppto", label: "Ppto" },
  { delta: ["YTD", "YTD_Ppto"], label: "Δ", color: true },
];
const STMT_GROUPS: PnLHeaderGroup[] = [{ label: "Mensual", cols: 3 }, { label: "YTD", cols: 3 }];

// Mapeo de nombre de propiedad por tabla (vienen con ortografías distintas).
const PROPS = [
  { id: "Bemiston", pnl: "Bemiston", graf: "Bemiston", ocup: "Bemiston", kpis: "Bemiston" },
  { id: "Mila", pnl: "Mila", graf: "Mila", ocup: "Mila", kpis: "Mila" },
  { id: "St Grand", pnl: "St Grand", graf: "St Grand", ocup: "St. Grand", kpis: "ST grand" },
];
const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const usd = (v: number | null) => fmtNum(v, 0);
const card = (title: string, labels: string[], fmt = "num"): CardSpec => ({
  title, fields: labels.map((l) => ({ table: "", col: "", agg: "max" as const, label: l, fmt: fmt as any })),
});
const isoOf = (r: Row, c: string) => String(r[c] ?? "").slice(0, 10);

// Bandera de EE.UU. simplificada (SVG inline: Windows no renderiza los emoji de
// bandera). 7 franjas rojas/blancas + cantón azul con 3 puntos; esquinas
// redondeadas vía clipPath para que las franjas no sobresalgan del borde.
const UsaFlag = () => (
  <svg width={26} height={18} viewBox="0 0 26 18" aria-hidden="true"
    style={{ verticalAlign: "-2px", marginRight: 8, flexShrink: 0 }}>
    <clipPath id="usa-flag-clip"><rect width="26" height="18" rx="2" /></clipPath>
    <g clipPath="url(#usa-flag-clip)">
      <rect width="26" height="18" fill="#fff" />
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} y={(i * 18) / 7} width="26" height={18 / 7} fill="#B22234" />
      ))}
      <rect width="11" height={(4 * 18) / 7} fill="#3C3B6E" />
      <circle cx="3.7" cy="3.5" r="0.9" fill="#fff" />
      <circle cx="7.3" cy="3.5" r="0.9" fill="#fff" />
      <circle cx="5.5" cy="6.8" r="0.9" fill="#fff" />
    </g>
    {/* contorno sutil para que se lea bien sobre fondos claros u oscuros */}
    <rect x="0.5" y="0.5" width="25" height="17" rx="1.6" fill="none" stroke="rgba(128,128,128,.35)" />
  </svg>
);

export function USADashboard() {
  const { user } = useAuth();
  const [prop, setProp] = useState("Bemiston");
  // dos vistas como las dos páginas por propiedad del BI: "X Gestión" y "USA X KPIS"
  const [view, setView] = useState<"gestion" | "ev">("gestion");
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [pnl, setPnl] = useState<Row[]>([]);
  const [graf, setGraf] = useState<Row[]>([]);
  const [ocup, setOcup] = useState<Row[]>([]);
  const [kpis, setKpis] = useState<Row[]>([]);
  const [modelo, setModelo] = useState<Row[]>([]);   // usa_modelo_original_bemiston (términos por propiedad)
  const [gplp, setGplp] = useState<Row[]>([]);       // bemiston_gp_and_lp_information (estructura Project/GP/LP)
  const [propInfo, setPropInfo] = useState<Row[]>([]); // bemiston_property_info (ficha del inmueble)
  const [tipol, setTipol] = useState<Row[]>([]);     // usa_bemiston_tipologias (Unit Summary por tipología)
  const [usos, setUsos] = useState<Row[]>([]);       // uso_y_fondo_bemiston (Uses & Sources)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [kpiOpen, setKpiOpen] = useState(false);
  const kpiRef = useRef<HTMLDivElement>(null);
  const P = PROPS.find((p) => p.id === prop)!;

  // --- Ventana móvil "últimos 12 meses" ---
  // La ventana termina en el mes elegido; si sólo hay año, en diciembre; si no hay
  // año, en el último mes con Real. En TODOS los casos se topa en el último mes con
  // dato REAL (los meses futuros solo traen Ppto/Budget y no deben mostrarse). El
  // filtro de filas se amplía al año anterior (regla FechaID: fid > selFid-100 && <=)
  // para que la ventana cruce de año. Los YTD (combos) se acumulan y luego last12 recorta.
  const lastRealFid = useMemo(() => {
    const f = pnl.filter((r) => r["Activo"] === P.pnl && num(r["Real"]) != null && num(r["Real"]) !== 0)
      .map((r) => num(r["FechaID"])!).filter((x) => !isNaN(x));
    return f.length ? Math.max(...f) : null;
  }, [pnl, P]);
  const rawEnd = year === "" ? lastRealFid : year * 100 + (month === "" ? 12 : month);
  const selFid = rawEnd == null ? lastRealFid
    : (lastRealFid != null ? Math.min(rawEnd, lastRealFid) : rawEnd);
  const winEndKey = selFid == null ? undefined
    : `${Math.floor(selFid / 100)}-${String(selFid % 100).padStart(2, "0")}`;
  const inWindow = (fid: number | null) =>
    fid == null ? false : selFid == null ? true : fid > selFid - 100 && fid <= selFid;

  // al abrir el panel de KPIs, traerlo a la vista (el botón está en la cabecera
  // y el panel quedaba fuera de pantalla → parecía que "no hacía nada")
  useEffect(() => {
    if (kpiOpen) kpiRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [kpiOpen]);

  useEffect(() => {
    let off = false; setLoading(true); setError(null);
    Promise.all([fetchRows("USA", "usa_pnl"), fetchRows("USA", "usa_graficos"),
                 fetchRows("USA", "ocupacion_ppto"), fetchRows("USA", "usa_kpis_gestion"),
                 fetchRows("USA", "usa_modelo_original_bemiston"),
                 fetchRows("USA", "bemiston_gp_and_lp_information"),
                 fetchRows("USA", "bemiston_property_info"),
                 fetchRows("USA", "usa_bemiston_tipologias"),
                 fetchRows("USA", "uso_y_fondo_bemiston")])
      .then(([a, b, c, d, mo, gl, pi, tp, us]) => { if (!off) { setPnl(a); setGraf(b); setOcup(c); setKpis(d); setModelo(mo); setGplp(gl); setPropInfo(pi); setTipol(tp); setUsos(us); } })
      .catch((e) => !off && setError(String(e))).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [refresh]);

  const years = useMemo(() => [...new Set(pnl.filter((r) => r["Activo"] === P.pnl)
    .map((r) => num(r["Anio"])).filter((v): v is number => v != null))].sort((a, b) => a - b), [pnl, P]);

  // al abrir / cambiar de propiedad: caer en el último mes cargado (Real ≠ 0)
  useEffect(() => {
    const f = pnl.filter((r) => r["Activo"] === P.pnl && num(r["Real"]) != null && num(r["Real"]) !== 0)
      .map((r) => num(r["FechaID"])!).filter((x) => !isNaN(x));
    if (f.length) { const mx = Math.max(...f); setYear(Math.floor(mx / 100)); setMonth(mx % 100); }
  }, [pnl, P]);

  // --- P&L (Operating Statements) por sección ---
  const pnlRows = useMemo(() => pnl.filter((r) => r["Activo"] === P.pnl), [pnl, P]);
  const pnlPoint = useMemo(() => {
    let rs = pnlRows.filter((r) => num(r["Real"]) != null);
    if (year !== "") rs = rs.filter((r) => num(r["Anio"]) === year);
    if (month !== "") rs = rs.filter((r) => num(r["Mes"]) === month);
    if (month === "" && rs.length) { const mx = Math.max(...rs.map((r) => num(r["FechaID"])!)); rs = rs.filter((r) => num(r["FechaID"]) === mx); }
    return rs;
  }, [pnlRows, year, month]);
  // detalle del estado: excluye líneas de total del origen (Seccion nula) y la
  // sección OTHER EXPENSES (el estado operativo termina en NOI)
  const stmtRows = useMemo(() => pnlPoint.filter((r) =>
    r["Seccion"] != null && String(r["Seccion"]).trim() !== ""
    && String(r["Seccion"]).trim().toUpperCase() !== "OTHER EXPENSES"), [pnlPoint]);

  // NOI = Revenue + OpEx (gastos en negativo), para cada medida Mensual/YTD
  const stmtResult = useMemo(() => {
    const sumSec = (sec: string, k: string) => stmtRows
      .filter((r) => String(r["Seccion"]).trim().toUpperCase() === sec)
      .reduce((a, r) => a + (num(r[k]) ?? 0), 0);
    const vals: Record<string, number> = {};
    for (const k of ["Real", "Ppto", "YTD", "YTD_Ppto"]) vals[k] = sumSec("REVENUE", k) + sumSec("OPERATING EXPENSES", k);
    return { label: "NET OPERATING INCOME (NOI)", values: vals };
  }, [stmtRows]);

  // último elemento por columna-id (para tomar el mes más reciente reportado)
  const lastBy = (rs: Row[], idCol: string) =>
    rs.length ? rs.reduce((a, b) => ((num(a[idCol]) ?? 0) >= (num(b[idCol]) ?? 0) ? a : b)) : undefined;

  // --- Ocupación (gauge + línea) --- (ventana móvil de 12 meses)
  const ocupRows = useMemo(() => ocup.filter((r) => String(r["Activo "]).trim() === P.ocup
    && inWindow(num(r["Fecha ID"]))), [ocup, P, year, month]);
  // gauge: mes elegido, o el último REPORTADO (Occupied % R no nulo; los futuros traen solo Ppto)
  const ocupSel = month === "" ? ocupRows : ocupRows.filter((r) => (num(r["Fecha ID"]) ?? 0) % 100 === month);
  const ocupRep = ocupSel.filter((r) => num(r["Occupied % R"]) != null);
  const ocupPoint = lastBy(ocupRep.length ? ocupRep : ocupSel, "Fecha ID");
  const ocupSeries = ocupRows.map((r) => ({ key: isoOf(r, "Fecha"), iso: isoOf(r, "Fecha"),
    "Real": num(r["Occupied % R"]), "Original": num(r["Ocupacion O"]), "Ppto": num(r["Occupied %"]) }));

  // --- Rent KPIs ($/SQF) --- (ventana móvil de 12 meses)
  const kpiRows = useMemo(() => kpis.filter((r) => String(r["Activo"]).trim() === P.kpis
    && inWindow(num(r["DateID"]))), [kpis, P, year, month]);
  // cards: mes elegido, o el último REPORTADO ($/SQF AC no nulo)
  const kpiSel = month === "" ? kpiRows : kpiRows.filter((r) => num(r["Month"]) === month);
  const kpiRep = kpiSel.filter((r) => num(r["Dólar SQF AC MONTH"]) != null);
  const kpiPoint = lastBy(kpiRep.length ? kpiRep : kpiSel, "DateID");
  const kv = (r: Row | undefined, c: string) => (r ? num(r[c]) : null);
  const rentSeries = kpiRows.map((r) => ({ key: `${num(r["YEAR"])}-${String(num(r["Month"])).padStart(2, "0")}`, iso: `${num(r["YEAR"])}-${String(num(r["Month"])).padStart(2, "0")}-01`,
    "Actual": num(r["Dólar SQF AC MONTH"]), "Ppto": num(r["Dólar SQF BD MONTH"]) }));

  // --- Revenue/OpEx/NOI (combos) desde usa_graficos ---
  // Trae años COMPLETOS (elegido + anterior) para que el YTD acumule desde enero;
  // la ventana de 12 meses se recorta con last12 DESPUÉS del acumulado.
  const grafRows = useMemo(() => graf.filter((r) => String(r["Activo"]).trim() === P.graf
    && (year === "" || num(r["año"]) === year || num(r["año"]) === year - 1)), [graf, P, year]);
  const comboByItem = (item: string, aCol: string, bCol: string) => {
    const m = new Map<string, any>();
    for (const r of grafRows.filter((r) => String(r["Item"]) === item)) {
      const k = periodKey(isoOf(r, "Fecha"));
      m.set(k, { key: k, iso: isoOf(r, "Fecha"), Actual: num(r[aCol]), Ppto: num(r[bCol]) });
    }
    return [...m.values()].sort((a, b) => a.key.localeCompare(b.key));
  };
  // NOI = Revenue + Operating Expenses (gastos en negativo); EXCLUYE Other Expenses
  // (sumar todo daría Net Income, no NOI).
  const noiCombo = (aCol: string, bCol: string) => {
    const m = new Map<string, any>();
    for (const r of grafRows.filter((r) => String(r["Item"]) !== "Other Expenses")) {
      const k = periodKey(isoOf(r, "Fecha"));
      const e = m.get(k) ?? { key: k, iso: isoOf(r, "Fecha"), Actual: 0, Ppto: 0, _a: false, _p: false };
      const a = num(r[aCol]), b = num(r[bCol]);
      if (a != null) { e.Actual += a; e._a = true; }
      if (b != null) { e.Ppto += b; e._p = true; }
      m.set(k, e);
    }
    // si un mes no tiene ningún componente con dato, queda null (sin punto) en vez de 0
    return [...m.values()]
      .map((e) => ({ key: e.key, iso: e.iso, Actual: e._a ? e.Actual : null, Ppto: e._p ? e.Ppto : null }))
      .sort((a, b) => a.key.localeCompare(b.key));
  };

  if (error) return <div className="state state--error">Error: {error}</div>;
  if (loading) return <div className="state">Cargando USA…</div>;

  const combo = (title: string, data: any[]) => (
    <BarsLineChart title={title} data={data} bars={[{ key: "Actual", label: "Actual" }]}
      line={{ key: "Ppto", label: "Budget" }} tipFmt={usd} />
  );
  // muestra gastos como magnitud positiva (vienen en negativo)
  const pos = (data: any[]) => data.map((d) => ({
    ...d, Actual: d.Actual == null ? null : -d.Actual, Ppto: d.Ppto == null ? null : -d.Ppto,
  }));
  // YTD acumulado a partir de los meses (la columna "YTD" del origen está mala);
  // resetea en cada año. `data` debe venir ordenado por período.
  const cumulative = (data: any[]) => {
    let ca = 0, cp = 0, cy = "";
    return data.map((d) => {
      const y = String(d.iso).slice(0, 4);
      if (y !== cy) { ca = 0; cp = 0; cy = y; }
      ca += d.Actual ?? 0; cp += d.Ppto ?? 0;
      return { ...d, Actual: ca, Ppto: cp };
    });
  };

  // --- Evaluación de Proyecto & Terms (no dependen del período) ---
  // Cada tabla trae columna Activo con las 3 propiedades (ortografías distintas):
  // normalizamos (trim + minúsculas) y filtramos por la propiedad del slicer.
  const nrm = (s: unknown) => String(s ?? "").trim().toLowerCase();
  const mdl = modelo.find((r) => nrm(r["Activo"]) === nrm(P.id));
  const gpRows = gplp.filter((r) => nrm(r["Activo"]) === nrm(P.id))
    .sort((a, b) => (num(a["Indice"]) ?? 0) - (num(b["Indice"]) ?? 0));
  // Equity Sanvest APARTE del EV (estructura del BI: card propio, no una fila más
  // del pivot de partners — en esa fila solo viene Equity, sin retornos modelados)
  const isSanvest = (r: Row) => /sanvest/i.test(String(r["Categ"] ?? ""));
  const sanvestEquity = (() => { const r = gpRows.find(isSanvest); return r ? num(r["Equity"]) : null; })();
  const partnerRows = gpRows.filter((r) => !isSanvest(r));
  const propRows = propInfo.filter((r) => nrm(r["Activo"]) === nrm(P.id));
  // Unit Summary (tipologías) del proyecto
  const tipolRows = tipol.filter((r) => nrm(r["Activo"]) === nrm(P.id));
  // Uses & Sources: agrupado por Tipo (Uses / Source) con subtotal, del proyecto
  const usosRows = usos.filter((r) => nrm(r["Activo"]) === nrm(P.id));
  const usosGroup = (tipo: string) => usosRows
    .filter((r) => nrm(r["Tipo "] ?? r["Tipo"]) === nrm(tipo))
    .map((r) => ({ cat: String(r["Category"] ?? "").trim(), monto: num(r["Monto"]) ?? 0 }));
  const usosBloques = [
    { titulo: "Uses", filas: usosGroup("Uses") },
    { titulo: "Sources", filas: usosGroup("Source") },
  ].filter((b) => b.filas.length);
  // términos financieros/valorización del modelo original (formato por fila)
  const terms: [string, string][] = [
    ["Loan", usd(kv(mdl, "Loan"))],
    ["Loan Rate", fmtPct(kv(mdl, "Loan Rate "), 2)],
    ["Loan Rate (actual)", fmtPct(kv(mdl, "Loan rate AC"), 2)],
    ["Rent Growth", fmtPct(kv(mdl, "Rent growth"), 1)],
    ["Valuation", usd(kv(mdl, "Valuation"))],
    ["Gross Value", usd(kv(mdl, "Gross Value"))],
    ["Terminal NOI", usd(kv(mdl, "Terminal NOI"))],
    ["Maturity", mdl && mdl["Maturity"] ? isoOf(mdl, "Maturity") : "—"],
  ];

  return (
    <div className="dash">
      <header className="dash__header">
        <h1><UsaFlag /><img className="dash__logo" src="/logos/double-eagle.png" alt="Double Eagle Development" />USA · <b className="dash__proj">{prop}</b></h1>
        <div className="dash__slicers">
          {/* botón Gestión / EV (reunión JMB): replica las dos páginas por propiedad del BI */}
          <div className="viewtoggle">
            {([["gestion", "Gestión"], ["ev", "Ev. Proyecto & Terms"]] as const).map(([v, l]) => (
              <Button key={v} variant="toggle" active={view === v} onClick={() => setView(v)}>{l}</Button>
            ))}
          </div>
          <Slicer label="Propiedad" value={prop} allowEmpty={false} options={PROPS.map((p) => ({ value: p.id, label: p.id }))} onChange={(x) => x && setProp(x)} />
          {/* Año/Mes y cargas solo aplican a gestión (los datos EV no dependen del período) */}
          {view === "gestion" && (
            <>
              <Slicer label="Año" value={year} options={years.map((y) => ({ value: y, label: String(y) }))} onChange={setYear} />
              <Slicer label="Mes" value={month} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MESES[i + 1] }))} onChange={setMonth} />
              {user?.can_upload && (
                <Button variant="primary" onClick={() => setKpiOpen((o) => !o)}>
                  ✎ Cargar KPIs del mes
                </Button>
              )}
            </>
          )}
        </div>
      </header>

      {view === "gestion" && (<>
      {/* Ingreso manual de KPIs del mes (alimenta Revenues/OpEx/NOI) — se abre con
          el botón "Cargar KPIs del mes" de la cabecera; va arriba para que sea visible */}
      {kpiOpen && user?.can_upload && (
        <section className="row" style={{ gridTemplateColumns: "1fr" }} ref={kpiRef}>
          <UsaKpiEntry activo={prop}
            defaultYear={typeof year === "number" ? year : undefined}
            defaultMonth={typeof month === "number" ? month : undefined}
            open={kpiOpen} onToggle={() => setKpiOpen((o) => !o)}
            onSaved={() => setRefresh((r) => r + 1)} />
        </section>
      )}

      {/* Operating Statements (Mensual + YTD fusionados, termina en NOI) */}
      <section className="row" style={{ gridTemplateColumns: "1fr" }}>
        <PnLMatrix title="Operating Statements — Mensual y YTD (USD)" rows={stmtRows}
          levels={STMT_LEVELS} cols={STMT_COLS} headerGroups={STMT_GROUPS} fmt={usd} result={stmtResult} />
      </section>

      {/* Rent KPIs (izquierda) + Ocupación (derecha) — mismo formato que Hotel y SOHO/PARK */}
      <section className="row row--usa-kpis">
        <KpiCard spec={card("Rent KPI's — Month ($/SQF)", ["$/SQF Actual", "$/SQF Budget", "$/SQF Retail Act", "$/SQF Retail Bud"])}
          values={[kv(kpiPoint, "Dólar SQF AC MONTH"), kv(kpiPoint, "Dólar SQF BD MONTH"), kv(kpiPoint, "Dólar SQF Retail AC MONTH"), kv(kpiPoint, "Dólar SQF Retail BD MONTH")]} />
        <KpiCard spec={card("Rent KPI's — YTD ($/SQF)", ["$/SQF Actual YTD", "$/SQF Budget YTD", "$/SQF Retail Act YTD", "$/SQF Retail Bud YTD"])}
          values={[kv(kpiPoint, "Dólar SQF AC YTD"), kv(kpiPoint, "Dólar SQF BD YTD"), kv(kpiPoint, "Dólar SQF Retail AC YTD"), kv(kpiPoint, "Dólar SQF Retail BD YTD")]} />
        <Gauge title="Residential Occupancy %" value={kv(ocupPoint, "Occupied % R")} target={kv(ocupPoint, "Occupied %")} colorByTarget />
      </section>

      <section className="row row--two">
        <MultiLineChart title="Occupancy (%)" data={last12(ocupSeries, winEndKey) as any}
          lines={[{ key: "Real", label: "Real" }, { key: "Original", label: "Original" }, { key: "Ppto", label: "Budget" }]}
          tipFmt={(x) => fmtPct(x, 1)} tickFmt={(x) => fmtPct(x, 0)} />
        <MultiLineChart title="Average Rent (USD/SqF)" data={last12(rentSeries, winEndKey) as any}
          lines={[{ key: "Actual", label: "Actual" }, { key: "Ppto", label: "Budget" }]}
          tipFmt={(x) => fmtNum(x, 2)} tickFmt={(x) => fmtNum(x, 2)} />
      </section>

      {/* Revenues / OpEx / NOI (Monthly + YTD) */}
      <section className="row row--two">
        {combo("Monthly Revenues (USD)", last12(comboByItem("Revenue", "Actual", "Budget"), winEndKey))}
        {combo("Revenues YTD (USD)", last12(cumulative(comboByItem("Revenue", "Actual", "Budget")), winEndKey))}
      </section>
      <section className="row row--two">
        {combo("Monthly Operating Expenses (USD)", last12(pos(comboByItem("Operathing Expenses", "Actual", "Budget")), winEndKey))}
        {combo("Operating Expenses YTD (USD)", last12(pos(cumulative(comboByItem("Operathing Expenses", "Actual", "Budget"))), winEndKey))}
      </section>
      <section className="row row--two">
        {combo("Monthly NOI (USD)", last12(noiCombo("Actual", "Budget"), winEndKey))}
        {combo("Net Operating Income YTD (USD)", last12(cumulative(noiCombo("Actual", "Budget")), winEndKey))}
      </section>
      </>)}

      {view === "ev" && (<>
      {/* ===== Ev. Proyecto & Terms (página "USA {prop} KPIS" del BI) ===== */}
      <section className="row row--two">
        {/* Ficha del inmueble */}
        <div className="card pivot">
          <div className="card__title">Ficha del Inmueble</div>
          <div className="pivot__scroll">
            {propRows.length ? (
              <table className="pivot__table">
                <thead>
                  <tr>
                    <th>Uso</th>
                    <th className="num">GSF</th>
                    <th className="num">Unidades</th>
                    <th className="num">Parking</th>
                    <th className="num">RSF</th>
                  </tr>
                </thead>
                <tbody>
                  {propRows.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r["Property Information"] ?? "").trim()}</td>
                      <td className="num">{fmtInt(num(r["Gross Square Feet (GSF)"]))}</td>
                      <td className="num">{fmtInt(num(r["Number of Units"]))}</td>
                      <td className="num">{fmtInt(num(r["Parking"]))}</td>
                      <td className="num">{fmtInt(num(r["Rentable Square Feet (RSF)"]))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="kpi-entry__note">Sin ficha para esta propiedad.</div>}
          </div>
        </div>
        {/* Unit Summary Original Model (tipologías) */}
        <div className="card pivot">
          <div className="card__title">Unit Summary — Modelo Original</div>
          <div className="pivot__scroll">
            {tipolRows.length ? (
              <table className="pivot__table">
                <thead>
                  <tr>
                    <th>Floor Plan</th>
                    <th className="num">Unidades</th>
                    <th className="num">Avg SF/Unit</th>
                    <th className="num">Avg Rent/Unit</th>
                    <th className="num">Avg Rent PSF</th>
                  </tr>
                </thead>
                <tbody>
                  {tipolRows.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r["Floor Plan"] ?? "").trim()}</td>
                      <td className="num">{fmtInt(num(r["Unit Count"]))}</td>
                      <td className="num">{fmtInt(num(r["Avg SF/Unit"]))}</td>
                      <td className="num">{usd(num(r["Avg Rent/Unit"]))}</td>
                      <td className="num">{fmtNum(num(r["Avg Rent PSF"]), 2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="strong">Total</td>
                    <td className="num strong">{fmtInt(tipolRows.reduce((a, r) => a + (num(r["Unit Count"]) ?? 0), 0))}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            ) : <div className="kpi-entry__note">Sin tipologías para esta propiedad.</div>}
          </div>
        </div>
      </section>

      <section className="row row--two">
        {/* Modelo original: retornos (todos en %) */}
        <KpiCard
          spec={card("Modelo Original — Retornos",
            ["TIR GP", "TIR LP", "Yield to Cost", "Cap Rate", "Cash on Cash", "Calc LTV"], "pct")}
          values={[kv(mdl, "TIR GP "), kv(mdl, "TIR LP "), kv(mdl, "Yield to cost"),
                   kv(mdl, "Cap Rate "), kv(mdl, "Cash on Cash"), kv(mdl, "Calc LTV")]} />
        {/* Modelo original: financiamiento y valorización (USD, tasas, vencimiento) */}
        <div className="card pivot">
          <div className="card__title">Modelo Original — Financiamiento &amp; Valorización</div>
          <div className="pivot__scroll">
            <table className="pivot__table">
              <tbody>
                {terms.map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Equity Sanvest APARTE (card propio, como el BI) + Partner Level Returns */}
      <section className="row" style={{ gridTemplateColumns: "0.55fr 2.45fr" }}>
        <div className="card">
          <div className="card__title">Equity Sanvest (USD)</div>
          <div className="kpi__grid">
            <div className="kpi__item">
              <div className="kpi__value">{usd(sanvestEquity)}</div>
              <div className="kpi__label">Equity aportado por Sanvest</div>
            </div>
          </div>
        </div>
        {/* Estructura de capital: Project (EV) / GP / LP / Partners — sin la fila Sanvest */}
        <div className="card pivot">
          <div className="card__title">Partner Level Returns — Modelo Original (USD)</div>
          <div className="pivot__scroll">
            {partnerRows.length ? (
              <table className="pivot__table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th className="num">Equity</th>
                    <th className="num">Distributions</th>
                    <th className="num">Net CF</th>
                    <th className="num">EM</th>
                    <th className="num">XIRR</th>
                    <th className="num">Promote</th>
                    <th className="num">Structure Fee</th>
                    <th className="num">AM Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerRows.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r["Categ"] ?? "")}</td>
                      <td className="num">{usd(num(r["Equity"]))}</td>
                      <td className="num">{usd(num(r["Distributions"]))}</td>
                      <td className="num">{usd(num(r["Net Cash Flow"]))}</td>
                      <td className="num">{fmtRatio(num(r["EM"]))}</td>
                      <td className="num">{fmtPct(num(r["XIRR"]), 1)}</td>
                      <td className="num">{usd(num(r["Promote"]))}</td>
                      <td className="num">{usd(num(r["Structure Fee"]))}</td>
                      <td className="num">{usd(num(r["AM Fees"]))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="kpi-entry__note">Sin datos de estructura para esta propiedad.</div>}
          </div>
        </div>
      </section>

      <section className="row row--two">
        {/* Uses and Sources Original Model */}
        <div className="card pivot">
          <div className="card__title">Uses &amp; Sources — Modelo Original (USD)</div>
          <div className="pivot__scroll">
            {usosBloques.length ? (
              <table className="pivot__table">
                <tbody>
                  {usosBloques.map((b) => (
                    <Fragment key={b.titulo}>
                      <tr className="pnl__group"><td>{b.titulo}</td>
                        <td className="num strong">{usd(b.filas.reduce((a, x) => a + x.monto, 0))}</td></tr>
                      {b.filas.map((f, i) => (
                        <tr key={b.titulo + i}>
                          <td style={{ paddingLeft: 22 }}>{f.cat}</td>
                          <td className="num">{usd(f.monto)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            ) : <div className="kpi-entry__note">Sin usos y fuentes para esta propiedad.</div>}
          </div>
        </div>
      </section>
      </>)}

      <footer className="dash__footer">
        Replica las dos páginas por propiedad del Power BI — <strong>Gestión</strong>: Operating
        Statements (mensual+YTD), Occupancy, Rent KPIs $/SQF y combos Revenues/OpEx/NOI;
        <strong> Ev. Proyecto &amp; Terms</strong>: ficha, unit summary, modelo original, Equity
        Sanvest (aparte del EV) y partner level returns. "Cargar Informe Yardi" actualiza con histórico.
      </footer>
    </div>
  );
}

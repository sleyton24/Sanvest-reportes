import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchRows, num, Row } from "../api";
import { CardSpec } from "../config";
import { last12 } from "../data";
import { fmtNum, fmtUF, fmtCLP, fmtPct } from "../format";
import { Slicer } from "../components/Slicer";
import { Gauge } from "../components/Gauge";
import { KpiCard } from "../components/KpiCard";
import { HoldingPnLMulti, PnLMultiRow } from "../components/HoldingPnL";
import { PivotTable } from "../components/PivotTable";
import { ColumnLinesChart } from "../components/charts/Charts";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const card = (title: string, fields: [string, "uf" | "pct" | "num" | "int"][]): CardSpec => ({
  title, fields: fields.map(([label, fmt]) => ({ table: "", col: "", agg: "max" as const, label, fmt })),
});
const CARD_OF = card("KPIs Oficinas", [["Ocup. Venta", "pct"], ["Ocup. Renta", "pct"],
  ["m² vendidos", "num"], ["m² arrendados", "num"], ["UF/m² venta", "num"], ["UF/m² arriendo", "num"],
  ["Uds. vendidas", "int"], ["Uds. arrendadas", "int"], ["Uds. disponibles", "int"]]);
const CARD_LC = card("KPIs Locales", [["Ocup. Venta", "pct"], ["Ocup. Renta", "pct"],
  ["m² vendidos", "num"], ["m² arrendados", "num"], ["UF/m² venta", "num"], ["UF/m² arriendo", "num"],
  ["Uds. vendidas", "int"], ["Uds. arrendadas", "int"], ["Uds. disponibles", "int"]]);
// Fecha corta dd-mm-aaaa a partir de un ISO ("YYYY-MM-DD..."); "—" si viene vacía.
const fmtFecha = (iso: string | null): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}-${m}-${y}` : "—";
};

export function AtemporaDashboard() {
  const [eerr, setEerr] = useState<Row[]>([]);
  const [kpis, setKpis] = useState<Row[]>([]);
  const [deuda, setDeuda] = useState<Row[]>([]);
  const [arr, setArr] = useState<Row[]>([]);
  const [mor, setMor] = useState<Row[]>([]);
  const [ven, setVen] = useState<Row[]>([]);
  const [edi, setEdi] = useState<Row[]>([]);   // kpis_atempora_edificio (estado comercialización)
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh] = useState(0);

  useEffect(() => {
    let off = false; setLoading(true);
    Promise.all([fetchRows("Atempora", "eerr_civitas"), fetchRows("Atempora", "kpis_atempora"),
      fetchRows("Atempora", "deuda_civitas"), fetchRows("Atempora", "detalle_arriendo_civitas"),
      fetchRows("Atempora", "morosidad"), fetchRows("Atempora", "ventas_civitas"),
      fetchRows("Atempora", "kpis_atempora_edificio").catch(() => [])])
      .then(([e, k, d, a, m, v, ed]) => { if (!off) { setEerr(e); setKpis(k); setDeuda(d); setArr(a); setMor(m); setVen(v); setEdi(ed); } })
      .catch((er) => !off && setError(String(er))).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [refresh]);

  // Años del slicer: derivados de fechaID (clave ASCII fiable) — la columna "año "
  // llega con el encabezado doble-codificado en el origen y no calza por nombre.
  const years = useMemo(() => [...new Set(eerr.map((r) => {
    const f = num(r["fechaID"]); return f != null ? Math.floor(f / 100) : null;
  }).filter((v): v is number => v != null))].sort((a, b) => a - b), [eerr]);

  // al abrir: último mes reportado (Monto ≠ 0)
  useEffect(() => {
    const f = eerr.filter((r) => num(r["Monto"]) !== 0 && num(r["Monto"]) != null).map((r) => num(r["fechaID"])!).filter((x) => !isNaN(x));
    if (f.length) { const mx = Math.max(...f); setYear(Math.floor(mx / 100)); setMonth(mx % 100); }
  }, [eerr]);

  const fid = year !== "" && month !== "" ? (year as number) * 100 + (month as number) : null;
  // último mes con dato REAL (Monto ≠ 0): tope de la ventana para que los meses
  // futuros —que solo traen Ppto— nunca aparezcan en los combos
  const lastRealFid = useMemo(() => {
    const fs = eerr.filter((r) => num(r["Monto"]) != null && num(r["Monto"]) !== 0)
      .map((r) => num(r["fechaID"])!).filter((x) => !isNaN(x));
    return fs.length ? Math.max(...fs) : null;
  }, [eerr]);
  // Ventana móvil "últimos 12 meses" para los combos: termina en el período elegido
  // (fid) o, si no hay mes elegido, en diciembre del año elegido; sin selección, en el
  // último mes con dato — pero SIN pasar del último mes con Real (evita meses de solo
  // Ppto). La serie fuente se acota por fechaID (fid > end-100 && <= end).
  const endFid = useMemo(() => {
    const raw = fid != null ? fid : (year !== "" ? (year as number) * 100 + 12 : lastRealFid);
    if (raw == null) return lastRealFid;
    return lastRealFid != null ? Math.min(raw, lastRealFid) : raw;
  }, [fid, year, lastRealFid]);
  const endKey = endFid != null
    ? `${Math.floor(endFid / 100)}-${String(endFid % 100).padStart(2, "0")}` : undefined;
  // EERR del mes (para el Informe de Gestión)
  const eerrPoint = useMemo(() => {
    let rs = eerr;
    if (fid != null) rs = rs.filter((r) => num(r["fechaID"]) === fid);
    return rs;
  }, [eerr, fid]);
  // Informe de Gestión (HoldingPnL, como la vista holding de RR): "Nivel 2 " = grupo,
  // "Nivel 1 " = cuenta. "Indice " trae 1/2/3 (Ingresos / Gastos Op. / Otros gastos);
  // HoldingPnL trata índice >2 como línea de total, así que se acota a 2 para que
  // "Otros gastos" muestre detalle + subtotal. EBITDA y Resultado se calculan como
  // en los combos (Ingresos − Gastos Op. − Otros gastos).
  // Informe de Gestión UNIFICADO Mes | YTD (una sola tabla, como RR/ICEMM):
  // cada fila trae los dos grupos de columnas. EBITDA/Resultado al cierre.
  const civPnLMulti = (): PnLMultiRow[] => {
    const sum = (ix: number, col: string) =>
      eerrPoint.filter((r) => num(r["Indice "]) === ix).reduce((a, r) => a + (num(r[col]) ?? 0), 0);
    if (!eerrPoint.length) return [];
    // detalle por sección real (Indice 1=Ingresos, 2=Gastos Op., 3=Otros gastos)
    const detail = (ix: number): PnLMultiRow[] =>
      eerrPoint.filter((r) => num(r["Indice "]) === ix).map((r) => ({
        nivel1: String(r["Nivel 2 "] ?? "").trim(), nivel2: String(r["Nivel 1 "] ?? "").trim(),
        vals: [
          { real: num(r["Monto"]), ppto: num(r["ppto"]) },       // Mes
          { real: num(r["YTD Real"]), ppto: num(r["YTD PPTO"]) }, // YTD
        ],
      }));
    // Gastos vienen con SIGNO NEGATIVO en el dato, así que los subtotales se SUMAN.
    const line = (nombre: string, f: (c: string) => number): PnLMultiRow => ({
      nivel1: "", nivel2: nombre, result: true,
      vals: [{ real: f("Monto"), ppto: f("ppto") }, { real: f("YTD Real"), ppto: f("YTD PPTO") }],
    });
    const noi = (c: string) => sum(1, c) + sum(2, c);              // NOI = Ingresos + Gastos Op.
    // Sólo hasta NOI: evaluamos la operación de arriendo (sin Otros gastos ni Resultado,
    // que incluyen intereses/corrección monetaria ajenos a la operación).
    return [
      ...detail(1),          // Ingresos
      ...detail(2),          // Gastos Operacionales
      line("NOI", noi),      // subtotal operativo — cierre de la tabla
    ];
  };

  // KPIs = snapshot de comercialización (ocupación/m²/unidades); NO se carga todos los
  // meses. Se toma el snapshot del mes elegido si existe; si ese mes no tiene, el ÚLTIMO
  // snapshot disponible (estado de comercialización vigente). Así nunca queda en blanco
  // por desalineación de mes entre el FC (informe de gestión) y el Excel de KPIs, y se
  // ve siempre el snapshot más reciente cargado.
  const kpiPoint = useMemo(() => {
    const sorted = kpis.filter((r) => num(r["Fecha ID"]) != null)
      .sort((a, b) => num(a["Fecha ID"])! - num(b["Fecha ID"])!);
    if (!sorted.length) return undefined;
    if (fid != null) {
      const exact = sorted.find((r) => num(r["Fecha ID"]) === fid);
      if (exact) return exact;
    }
    return sorted[sorted.length - 1];
  }, [kpis, fid]);
  const kv = (c: string) => (kpiPoint ? num(kpiPoint[c]) : null);
  // mes del snapshot mostrado (para rotular cuando no coincide con el mes elegido)
  const kpiFid = kpiPoint ? num(kpiPoint["Fecha ID"]) : null;
  const kpiMesLabel = kpiFid ? `${MESES[kpiFid % 100]}-${Math.floor(kpiFid / 100)}` : null;
  const ofVals = [kv("Ocupacion Ventas OF"), kv("Ocupacion Renta OF"), kv("M2 vendidos OF"), kv("m2 arrendados OF"),
    kv("uf/m2 venta OF"), kv("uf/m2 arriendo OF"), kv("Unidades Vendidas OF"), kv("Unidades Arrendadas OF"), kv("Unidades Disponibles OF")];
  const lcVals = [kv("Ocupacion Ventas LC"), kv("Ocupacion Renta LC"), kv("M2 vendidos LC"), kv("m2 arrendados LC"),
    kv("uf/m2 venta LC"), kv("uf/m2 arriendo LC"), kv("Unidades Vendidas LC"), kv("Unidades Arrendadas LC"), kv("Unidades Disponibles LC")];

  // Ocupación total por m²: ocupados / (ocupados + disponibles), en vez de la columna
  // manual "Ocupacion total". VERIFICADO abr-2026: 7.628,39 / 9.626,55 = 79,2%.
  const m2Occ = kv("M2 occ totales");
  const m2Disp = kv("Disponible OF");
  const m2Tot = m2Occ != null && m2Disp != null ? m2Occ + m2Disp : null;
  const ocupM2 = m2Tot ? m2Occ! / m2Tot : null;
  const ocupM2Sub = m2Tot != null
    ? `${fmtNum(m2Occ, 0)} / ${fmtNum(m2Tot, 0)} m²${kpiMesLabel ? ` · KPIs al ${kpiMesLabel}` : ""}` : null;

  // Estado de comercialización del EDIFICIO completo (bloque 'Total edificio'): cuadro por
  // estado (m² + %) y ocupación GENERAL del gauge = (Superficie − Disponible) / Superficie.
  // Snapshot por período: el del mes elegido si existe, si no el último disponible.
  const EDI_ORDER = ["Disponible", "Res. Arriendo", "Arrendado", "Res. Compra", "Promesado", "Escriturado"];
  const ediFids = useMemo(() => [...new Set(edi.map((r) => num(r["Fecha ID"]))
    .filter((x): x is number => x != null))].sort((a, b) => a - b), [edi]);
  const ediFid = fid != null && ediFids.includes(fid) ? fid : (ediFids.length ? ediFids[ediFids.length - 1] : null);
  const ediRows = useMemo(() => edi.filter((r) => num(r["Fecha ID"]) === ediFid)
    .sort((a, b) => EDI_ORDER.indexOf(String(a["Estado"]).trim()) - EDI_ORDER.indexOf(String(b["Estado"]).trim())), [edi, ediFid]);
  const ediTotal = ediRows.reduce((a, r) => a + (num(r["Superficie"]) ?? 0), 0);
  const ediDisp = num(ediRows.find((r) => String(r["Estado"]).trim() === "Disponible")?.["Superficie"]) ?? 0;
  const ediOcup = ediTotal ? (ediTotal - ediDisp) / ediTotal : null;
  const ediMesLabel = ediFid ? `${MESES[ediFid % 100]}-${Math.floor(ediFid / 100)}` : null;
  const ediSub = ediTotal ? `${fmtNum(ediTotal - ediDisp, 0)} / ${fmtNum(ediTotal, 0)} m²${ediMesLabel ? ` · al ${ediMesLabel}` : ""}` : null;

  // Deuda: saldo (Capital) del cronograma AL MES MOSTRADO. Se topa en fid/endFid
  // porque la tabla trae meses futuros —incluida la fila de extinción del crédito
  // con Capital negativo (202610), que antes se mostraba como "-5.001 UF"— y dentro
  // del mes se toma la ÚLTIMA fila: Capital es un saldo, sumarlo duplica (hay meses
  // con 2-3 filas de saldos sucesivos).
  const deudaUF = useMemo(() => {
    const top = fid ?? endFid ?? Infinity;
    const elig = deuda.map((r) => num(r["FechaID"])!).filter((x) => !isNaN(x) && x <= top);
    if (!elig.length) return null;
    const mx = Math.max(...elig);
    const delMes = deuda.filter((r) => num(r["FechaID"]) === mx);
    return delMes.length ? num(delMes[delMes.length - 1]["Capital"]) : null;
  }, [deuda, fid, endFid]);

  // series mensuales por macro (para combos) — ventana móvil de 12 meses acotada por
  // fechaID (fid > endFid-100 && <= endFid), que cruza al año anterior.
  const series = useMemo(() => {
    const rs = endFid != null
      ? eerr.filter((r) => { const f = num(r["fechaID"]); return f != null && f > endFid - 100 && f <= endFid; })
      : eerr;
    const m = new Map<number, any>();
    for (const r of rs) {
      const f = num(r["fechaID"]); if (f == null) continue;
      const macro = String(r["Nivel 2 "] ?? "").trim();
      const e = m.get(f) ?? { fid: f, iso: String(r["Fecha "]).slice(0, 10),
        ingR: 0, ingP: 0, gopR: 0, gopP: 0, otrR: 0, otrP: 0,
        ingRY: 0, ingPY: 0, gopRY: 0, gopPY: 0, otrRY: 0, otrPY: 0 };
      const re = num(r["Monto"]) ?? 0, pp = num(r["ppto"]) ?? 0;
      const rey = num(r["YTD Real"]) ?? 0, ppy = num(r["YTD PPTO"]) ?? 0;
      if (macro === "Ingresos") { e.ingR += re; e.ingP += pp; e.ingRY += rey; e.ingPY += ppy; }
      else if (macro === "Gastos Operacionales") { e.gopR += re; e.gopP += pp; e.gopRY += rey; e.gopPY += ppy; }
      else { e.otrR += re; e.otrP += pp; e.otrRY += rey; e.otrPY += ppy; }
      m.set(f, e);
    }
    return [...m.values()].sort((a, b) => a.fid - b.fid);
  }, [eerr, endFid]);
  // combo: key "YYYY-MM" (para last12) e iso para el eje; recorte final a los 12
  // meses que terminan en el período elegido.
  const combo = (real: (e: any) => number, ppto: (e: any) => number) =>
    last12(series.map((e) => ({ key: e.iso.slice(0, 7), iso: e.iso, bar: real(e), l0: ppto(e) })), endKey);

  // Cuadro de Arriendos (réplica del BI): agrupa detalle_arriendo_civitas por Usuario
  // con 4 medidas — Superficie [m²] (sum), Valor arriendo [UF] (sum), Valor arriendo
  // [UF/m²] (PROMEDIO, como el BI: antes se sumaba y daba tarifas absurdas tipo 6,3
  // UF/m² en usuarios con muchas filas) y Fecha término (mínima). Total al pie.
  const arriendos = useMemo(() => {
    const g = new Map<string, { sup: number; uf: number; ufm2: number; n: number; term: string | null }>();
    for (const r of arr) {
      const u = String(r["Usuario"] ?? "").trim();
      if (!u) continue;
      if (!g.has(u)) g.set(u, { sup: 0, uf: 0, ufm2: 0, n: 0, term: null });
      const e = g.get(u)!;
      e.sup += num(r["Superficie [m²]"]) ?? 0;
      e.uf += num(r["Valor arriendo [UF]"]) ?? 0;
      const um = num(r["Valor arriendo [UF/m²]"]);
      if (um != null) { e.ufm2 += um; e.n += 1; }
      const t = r["Fecha término"] ? String(r["Fecha término"]).slice(0, 10) : null;
      if (t && (e.term == null || t < e.term)) e.term = t;
    }
    const filas = [...g.entries()].map(([usuario, v]) => ({
      usuario, sup: v.sup, uf: v.uf, term: v.term,
      ufm2: v.n ? v.ufm2 / v.n : 0,
    })).sort((a, b) => a.usuario.localeCompare(b.usuario, "es"));
    const acc = [...g.values()].reduce((a, v) => ({
      sup: a.sup + v.sup, uf: a.uf + v.uf, ufm2: a.ufm2 + v.ufm2, n: a.n + v.n,
    }), { sup: 0, uf: 0, ufm2: 0, n: 0 });
    const tot = { sup: acc.sup, uf: acc.uf, ufm2: acc.n ? acc.ufm2 / acc.n : 0 };
    return { filas, tot };
  }, [arr]);

  // Cuadro de Ventas a la Fecha (réplica del BI): jerarquía Comprador ▸ Oficinas con
  // Venta Neta (sum), subtotal por comprador y Total general.
  const ventas = useMemo(() => {
    const g = new Map<string, { of: string; venta: number }[]>();
    for (const r of ven) {
      const c = String(r["Comprador"] ?? "").trim();
      if (!c) continue;
      if (!g.has(c)) g.set(c, []);
      g.get(c)!.push({ of: String(r["Oficinas"] ?? "").trim(), venta: num(r["Venta Neta"]) ?? 0 });
    }
    const compradores = [...g.entries()].map(([comprador, ofs]) => ({
      comprador,
      ofs: ofs.sort((a, b) => a.of.localeCompare(b.of, "es")),
      subtotal: ofs.reduce((a, o) => a + o.venta, 0),
    })).sort((a, b) => a.comprador.localeCompare(b.comprador, "es"));
    return { compradores, total: compradores.reduce((a, c) => a + c.subtotal, 0) };
  }, [ven]);

  if (error) return <div className="state state--error">Error: {error}</div>;
  if (loading) return <div className="state">Cargando Atémpora…</div>;

  const COMBO = (title: string, real: (e: any) => number, ppto: (e: any) => number) => (
    <ColumnLinesChart title={title} data={combo(real, ppto)}
      bar={{ key: "bar", label: "Real" }} lines={[{ key: "l0", label: "Ppto" }]} tipFmt={fmtUF} />
  );

  return (
    <div className="dash">
      <header className="dash__header">
        <h1><img className="dash__logo dash__logo--tile" src="/logos/atempora.png" alt="Atémpora" />Atémpora · <b className="dash__proj">Civitas</b></h1>
        <div className="dash__slicers">
          <Slicer label="Año" value={year} options={years.map((y) => ({ value: y, label: String(y) }))} onChange={setYear} />
          <Slicer label="Mes" value={month} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MESES[i + 1] }))} onChange={setMonth} />
        </div>
      </header>

      {/* Informe de Gestión (EERR Civitas): Mes | YTD unificado, como RR/ICEMM */}
      <section style={{ marginBottom: 22 }}>
        <HoldingPnLMulti title="Informe de Gestión (UF)" rows={civPnLMulti()} groups={["Mes", "YTD"]} />
      </section>

      {/* Ocupación GENERAL del edificio (gauge + cuadro por estado) + Unidades/Deuda */}
      <section className="row row--hotel-kpis">
        <Gauge title="Ocupación total" value={ediOcup ?? ocupM2} sub={ediSub ?? ocupM2Sub} />
        {/* Estado de comercialización del edificio (bloque 'Total edificio') */}
        <div className="card pivot">
          <div className="card__title">Estado de comercialización — Edificio</div>
          <div className="pivot__scroll">
            <table className="pivot__table">
              <thead><tr><th>Estado</th><th className="num">Superficie [m²]</th><th className="num">%</th></tr></thead>
              <tbody>
                {ediRows.map((r) => (
                  <tr key={String(r["Estado"])}>
                    <td>{String(r["Estado"])}</td>
                    <td className="num">{fmtNum(num(r["Superficie"]), 2)}</td>
                    <td className="num">{fmtPct(num(r["Pct"]), 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td className="strong">Superficie [m²]</td>
                  <td className="num strong">{fmtNum(ediTotal, 2)}</td>
                  <td className="num strong">100%</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
        <KpiCard spec={card("Unidades & Deuda", [["Total Oficinas", "int"], ["Total Locales", "int"], ["Gasto Común", "num"], ["Deuda (UF)", "uf"]])}
          values={[kv("Of total"), kv("LC Total"), kv("Gasto Comun"), deudaUF]} />
      </section>

      {/* KPIs Oficinas / Locales */}
      <section className="row row--two">
        <KpiCard spec={CARD_OF} values={ofVals} />
        <KpiCard spec={CARD_LC} values={lcVals} />
      </section>

      {/* Operación (hasta NOI): mensual a la izquierda, YTD a la derecha, mismo orden
          Ingresos / Gastos Operacionales / NOI. Gastos vienen negativos → NOI se SUMA. */}
      <section className="row row--two">
        {COMBO("Ingresos mensual (UF)", (e) => e.ingR, (e) => e.ingP)}
        {COMBO("Ingresos YTD (UF)", (e) => e.ingRY, (e) => e.ingPY)}
      </section>
      {/* Gastos: en el DATO vienen negativos; en los gráficos se muestran como
          magnitud POSITIVA (barras hacia arriba). La tabla y el NOI mantienen el
          signo original (NOI = Ingresos + Gastos). */}
      <section className="row row--two">
        {COMBO("Gastos Operacionales mensual (UF)", (e) => -e.gopR, (e) => -e.gopP)}
        {COMBO("Gastos Operacionales YTD (UF)", (e) => -e.gopRY, (e) => -e.gopPY)}
      </section>
      <section className="row row--two">
        {COMBO("NOI mensual (UF)", (e) => e.ingR + e.gopR, (e) => e.ingP + e.gopP)}
        {COMBO("NOI YTD (UF)", (e) => e.ingRY + e.gopRY, (e) => e.ingPY + e.gopPY)}
      </section>

      {/* Cuadros */}
      <section className="row row--two">
        {/* Cuadro de Arriendos: réplica del BI — filas por Usuario, 4 medidas. */}
        <div className="card pivot">
          <div className="card__title">Cuadro de Arriendos</div>
          <div className="pivot__scroll">
            <table className="pivot__table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th className="num">Superficie [m²]</th>
                  <th className="num">Valor arriendo [UF]</th>
                  <th className="num">Valor arriendo [UF/m²]</th>
                  <th>Fecha término</th>
                </tr>
              </thead>
              <tbody>
                {arriendos.filas.map((f) => (
                  <tr key={f.usuario}>
                    <td>{f.usuario}</td>
                    <td className="num">{fmtNum(f.sup, 2)}</td>
                    <td className="num">{fmtUF(f.uf)}</td>
                    <td className="num">{fmtNum(f.ufm2, 2)}</td>
                    <td>{fmtFecha(f.term)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="strong">Total</td>
                  <td className="num strong">{fmtNum(arriendos.tot.sup, 2)}</td>
                  <td className="num strong">{fmtUF(arriendos.tot.uf)}</td>
                  <td className="num strong">{fmtNum(arriendos.tot.ufm2, 2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Cuadro de Ventas a la Fecha: réplica del BI — Comprador ▸ Oficinas. */}
        <div className="card pivot">
          <div className="card__title">Cuadro de Ventas a la Fecha</div>
          <div className="pivot__scroll">
            <table className="pivot__table">
              <thead>
                <tr><th>Comprador</th><th className="num">Venta Neta</th></tr>
              </thead>
              <tbody>
                {ventas.compradores.map((c) => (
                  <Fragment key={c.comprador}>
                    <tr className="pnl__group">
                      <td>{c.comprador}</td>
                      <td className="num strong">{fmtUF(c.subtotal)}</td>
                    </tr>
                    {c.ofs.map((o, i) => (
                      <tr key={c.comprador + "|" + o.of + i}>
                        <td style={{ paddingLeft: 22 }}>{o.of}</td>
                        <td className="num">{fmtUF(o.venta)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="pnl__grandtotal">
                  <td className="strong">Total general</td>
                  <td className="num strong">{fmtUF(ventas.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
      <section className="row" style={{ gridTemplateColumns: "1fr" }}>
        <PivotTable title="Cuadro de Morosidad" rows={mor} rowField="}" rowLabel="Cliente" colField="Clasif" valueField="SALDO PENDIENTE" rowTotals fmt={fmtCLP} />
      </section>

      <footer className="dash__footer">
        Gestión Atémpora (Civitas): resultado de la operación de arriendo hasta NOI (Ingresos + Gastos
        Operacionales, sin ingresos/costos por ventas), KPIs de Oficinas y Locales, ocupación, deuda, y
        cuadros de arriendos, ventas y morosidad. Los gastos vienen con signo negativo, por eso NOI = Ingresos + Gastos Op.
      </footer>
    </div>
  );
}

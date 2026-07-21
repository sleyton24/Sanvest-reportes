import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchRows, num, Row } from "../api";
import { CardSpec } from "../config";
import { last12 } from "../data";
import { fmtNum, fmtUF, fmtCLP } from "../format";
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
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh] = useState(0);

  useEffect(() => {
    let off = false; setLoading(true);
    Promise.all([fetchRows("Atempora", "eerr_civitas"), fetchRows("Atempora", "kpis_atempora"),
      fetchRows("Atempora", "deuda_civitas"), fetchRows("Atempora", "detalle_arriendo_civitas"),
      fetchRows("Atempora", "morosidad"), fetchRows("Atempora", "ventas_civitas")])
      .then(([e, k, d, a, m, v]) => { if (!off) { setEerr(e); setKpis(k); setDeuda(d); setArr(a); setMor(m); setVen(v); } })
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
    const rows: PnLMultiRow[] = eerrPoint.map((r) => ({
      nivel1: String(r["Nivel 2 "] ?? "").trim(), nivel2: String(r["Nivel 1 "] ?? "").trim(),
      indice: Math.min(num(r["Indice "]) ?? 2, 2),
      vals: [
        { real: num(r["Monto"]), ppto: num(r["ppto"]) },       // Mes
        { real: num(r["YTD Real"]), ppto: num(r["YTD PPTO"]) }, // YTD
      ],
    }));
    if (!rows.length) return [];
    // Gastos vienen con SIGNO NEGATIVO en el dato (Gastos Op. y Otros gastos), así
    // que EBITDA/Resultado se SUMAN (no se restan): Ingresos + Gastos + Otros.
    // Antes se restaban y, al restar negativos, inflaban el resultado (bug de signo).
    const ebitda = (c: string) => sum(1, c) + sum(2, c);
    const result = (c: string) => sum(1, c) + sum(2, c) + sum(3, c);
    rows.push({ nivel1: "Gastos Operacionales", nivel2: "EBITDA", indice: 4, vals: [
      { real: ebitda("Monto"), ppto: ebitda("ppto") },
      { real: ebitda("YTD Real"), ppto: ebitda("YTD PPTO") }] });
    rows.push({ nivel1: "", nivel2: "Resultado", indice: 5, vals: [
      { real: result("Monto"), ppto: result("ppto") },
      { real: result("YTD Real"), ppto: result("YTD PPTO") }] });
    return rows;
  };

  // KPIs del mes
  const kpiPoint = useMemo(() => {
    if (fid != null) return kpis.find((r) => num(r["Fecha ID"]) === fid);
    return [...kpis].sort((a, b) => (num(a["Fecha ID"]) ?? 0) - (num(b["Fecha ID"]) ?? 0)).pop();
  }, [kpis, fid]);
  const kv = (c: string) => (kpiPoint ? num(kpiPoint[c]) : null);
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
  const ocupM2Sub = m2Tot != null ? `${fmtNum(m2Occ, 0)} / ${fmtNum(m2Tot, 0)} m²` : null;

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
      const e = m.get(f) ?? { fid: f, iso: String(r["Fecha "]).slice(0, 10), ingR: 0, ingP: 0, gopR: 0, gopP: 0, otrR: 0, otrP: 0 };
      const re = num(r["Monto"]) ?? 0, pp = num(r["ppto"]) ?? 0;
      if (macro === "Ingresos") { e.ingR += re; e.ingP += pp; }
      else if (macro === "Gastos Operacionales") { e.gopR += re; e.gopP += pp; }
      else { e.otrR += re; e.otrP += pp; }
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
        <h1>Atémpora · <b className="dash__proj">Civitas</b></h1>
        <div className="dash__slicers">
          <Slicer label="Año" value={year} options={years.map((y) => ({ value: y, label: String(y) }))} onChange={setYear} />
          <Slicer label="Mes" value={month} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MESES[i + 1] }))} onChange={setMonth} />
        </div>
      </header>

      {/* Informe de Gestión (EERR Civitas): Mes | YTD unificado, como RR/ICEMM */}
      <section style={{ marginBottom: 22 }}>
        <HoldingPnLMulti title="Informe de Gestión (UF)" rows={civPnLMulti()} groups={["Mes", "YTD"]} />
      </section>

      {/* Ocupación + Deuda */}
      <section className="row row--hotel-kpis">
        <Gauge title="Ocupación total" value={ocupM2} sub={ocupM2Sub} />
        <KpiCard spec={card("Ocupación", [["Venta Oficinas", "pct"], ["Renta Oficinas", "pct"], ["Renta Locales", "pct"], ["Venta Locales", "pct"]])}
          values={[kv("Ocupacion Ventas OF"), kv("Ocupacion Renta OF"), kv("Ocupacion Renta LC"), kv("Ocupacion Ventas LC")]} />
        <KpiCard spec={card("Unidades & Deuda", [["Total Oficinas", "int"], ["Total Locales", "int"], ["Gasto Común", "num"], ["Deuda (UF)", "uf"]])}
          values={[kv("Of total"), kv("LC Total"), kv("Gasto Comun"), deudaUF]} />
      </section>

      {/* KPIs Oficinas / Locales */}
      <section className="row row--two">
        <KpiCard spec={CARD_OF} values={ofVals} />
        <KpiCard spec={CARD_LC} values={lcVals} />
      </section>

      {/* Resultado: combos */}
      <section className="row row--two">
        {COMBO("Ingresos (UF)", (e) => e.ingR, (e) => e.ingP)}
        {COMBO("Gastos Operacionales (UF)", (e) => e.gopR, (e) => e.gopP)}
      </section>
      <section className="row row--two">
        {/* gastos vienen negativos → EBITDA/Resultado se SUMAN (ver civPnLMulti) */}
        {COMBO("EBITDA (UF)", (e) => e.ingR + e.gopR, (e) => e.ingP + e.gopP)}
        {COMBO("Resultado (UF)", (e) => e.ingR + e.gopR + e.otrR, (e) => e.ingP + e.gopP + e.otrP)}
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
        Gestión Atémpora (Civitas): EERR (Ingresos / Gastos Operacionales / Otros gastos), KPIs de
        Oficinas y Locales, ocupación, deuda, y cuadros de arriendos, ventas y morosidad. Datos del
        Excel CIVITAS; los gastos vienen con signo negativo, por eso EBITDA = Ingresos + Gastos Op. y Resultado = + Otros gastos.
      </footer>
    </div>
  );
}

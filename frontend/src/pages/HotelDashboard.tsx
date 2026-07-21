import { useEffect, useMemo, useState } from "react";
import { fetchRows, num, Row } from "../api";
import { aggregate, groupByPeriod, last12, PeriodPoint } from "../data";
import { periodKey, fmtUF, fmtUSD, fmtRatio, fmtPct, fmtNum, axisCompact } from "../format";
import { Slicer } from "../components/Slicer";
import { Gauge } from "../components/Gauge";
import { IndicatorTableMY, IndicatorRowMY } from "../components/IndicatorTable";
import { BarsLineChart, MultiLineChart } from "../components/charts/Charts";

const REAL = "hotel_real", PPTO = "hotel_ppto", FULL = "hotel_full";
const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Métricas UF: combo mensual (Real + LY barras, Ppto línea; LY = columna precalc)
// APAREADO con su acumulado anual (Hotel FULL por Item) en la misma fila, como RR.
const METRICS = [
  { title: "Ingresos (UF)", real: "Ingresos totales", ly: "Ingresos totales LY", ytdItem: "Ingresos totales" },
  { title: "Costos (UF)", real: "Costos operacionales UF", ly: "Costos operacionales LY", ytdItem: "Costos operacionales UF" },
  { title: "GOP / EBITDA (UF)", real: "EBITDA UF", ly: "EBITDA UF LY", ytdItem: "EBITDA UF" },
  { title: "Flujo (UF)", real: "Flujo (Resultado) UF", ly: "Flujo (Resultado) UF LY", ytdItem: " Flujo Caja Consolidado" },
];
const LINES = [
  { title: "Ocupación (%)", real: "Ocupación pago 2024 (%)", ly: "Ocupación pago 2024 (%) LY",
    tip: (v: number) => fmtPct(v, 1), tick: (v: number) => fmtPct(v, 0) },
  { title: "ADR (USD)", real: "ADR Room (USD)", ly: "ADR Room (USD) LY",
    tip: fmtUSD, tick: axisCompact },
  { title: "EBITDA / Cuota Banco", real: "EBITDA/CUOTA BANCO", ly: "EBITDA/CUOTA BANCO LY",
    tip: fmtRatio, tick: (v: number) => fmtNum(v, 1) },
  { title: "REVPAR (USD)", real: "REVPAR USD", ly: "REVPAR USD LY",
    tip: fmtUSD, tick: axisCompact },
];

// Indicadores ADR/REVPAR en tabla estilo SOHO (Item | Mensual R/P/Δ | YTD R/P/Δ):
// [colMensual, colYTD] por fila; USD con 2 decimales, CLP sin decimales.
const IND_USD = [
  { item: "ADR", mes: "ADR Room (USD)", ytd: "ADR Room (USD) YTD" },
  { item: "REVPAR", mes: "REVPAR USD", ytd: "REVPAR (USD) YTD" },
];
const IND_CLP = [
  { item: "ADR", mes: "ADR Room (CLP)", ytd: "ADR Room (CLP) YTD" },
  { item: "REVPAR", mes: "REVPAR (CLP)", ytd: "REVPAR (CLP) YTD" },
];

function mergeSeries(lists: PeriodPoint[][]): PeriodPoint[] {
  const map = new Map<string, PeriodPoint>();
  for (const list of lists)
    for (const p of list) {
      const e = map.get(p.key) ?? { key: p.key, iso: p.iso };
      Object.assign(e, p);
      map.set(p.key, e);
    }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function HotelDashboard() {
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [deuda, setDeuda] = useState<Row[]>([]);   // deuda_activos (opcional)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([REAL, PPTO, FULL].map((s) => fetchRows("Hotel", s).then((r) => [s, r] as const)))
      .then((p) => !cancelled && setData(Object.fromEntries(p)))
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    // deuda_activos opcional (tabla nueva; puede no existir aún en prod) → tolerante a error
    fetchRows("Hotel", "deuda_activos").then((d) => { if (!cancelled) setDeuda(d); }).catch(() => { if (!cancelled) setDeuda([]); });
    return () => { cancelled = true; };
  }, [refresh]);

  const years = useMemo(
    () => [...new Set((data[REAL] ?? []).map((r) => num(r["anio"])).filter((v): v is number => v != null))].sort((a, b) => a - b),
    [data],
  );
  const months = useMemo(
    () => [...new Set((data[REAL] ?? []).map((r) => num(r["mes"])).filter((v): v is number => v != null))].sort((a, b) => a - b),
    [data],
  );

  // al abrir: caer en el último mes cargado (con ADR real)
  useEffect(() => {
    const rows = (data[REAL] ?? []).filter((r) => num(r["ADR Room (USD)"]) != null);
    const fids = rows.map((r) => (num(r["anio"]) ?? 0) * 100 + (num(r["mes"]) ?? 0)).filter((x) => x > 100);
    if (fids.length) { const mx = Math.max(...fids); setYear(Math.floor(mx / 100)); setMonth(mx % 100); }
  }, [data]);

  // "a la fecha" = último mes con dato REAL operativo (ADR), no el último mes del
  // archivo (que llega a 2026-12 con proyección/ppto y ADR/REVPAR vacíos).
  const asOfKey = useMemo(() => {
    let rows = data[REAL] ?? [];
    if (year !== "") rows = rows.filter((r) => num(r["anio"]) === year);
    const withReal = rows.filter((r) => num(r["ADR Room (USD)"]) != null);
    const src = withReal.length ? withReal : rows;
    const keys = src.map((r) => periodKey(String(r["Periodo"]))).sort();
    return keys.length ? keys[keys.length - 1] : "";
  }, [data, year]);

  // filas puntuales (a la fecha): mes elegido, o el asOfKey (último real)
  const pointRows = useMemo(() => {
    const out: Record<string, Row[]> = {};
    for (const s of [REAL, PPTO, FULL]) {
      let rows = data[s] ?? [];
      if (year !== "") rows = rows.filter((r) => num(r["anio"]) === year);
      if (month !== "") rows = rows.filter((r) => num(r["mes"]) === month);
      else if (asOfKey) rows = rows.filter((r) => periodKey(String(r["Periodo"])) === asOfKey);
      out[s] = rows;
    }
    return out;
  }, [data, year, month, asOfKey]);

  // filas del año seleccionado (para promedios / gauge); si no, todo
  const yearRows = (s: string) =>
    year === "" ? data[s] ?? [] : (data[s] ?? []).filter((r) => num(r["anio"]) === year);

  // fin de la ventana móvil de 12 meses: mes/año elegidos, o el último mes reportado
  const endKey = useMemo(() => {
    const y = year !== "" ? year : Number(asOfKey.slice(0, 4)) || 0;
    if (month !== "" && y) return `${y}-${String(month).padStart(2, "0")}`;
    return asOfKey;
  }, [year, month, asOfKey]);

  // filas para gráficos: ventana móvil de 12 meses que termina en endKey,
  // cruzando al año anterior (regla FechaID: fid > selFid-100 && fid <= selFid)
  const chartRows = (s: string) => {
    if (!endKey) return data[s] ?? [];
    const selFid = Number(endKey.slice(0, 4)) * 100 + Number(endKey.slice(5, 7));
    return (data[s] ?? []).filter((r) => {
      const fid = (num(r["anio"]) ?? 0) * 100 + (num(r["mes"]) ?? 0);
      return fid > selFid - 100 && fid <= selFid;
    });
  };

  if (error) return <div className="state state--error">Error: {error}</div>;
  if (loading) return <div className="state">Cargando Hotel…</div>;

  // KPIs ADR/REVPAR (USD y CLP), mensual y YTD, del mes de punto. Los valores los
  // carga el ETL desde la hoja "Informe gestión" del CCPP; 0 = sin dato → "—"
  // (ADR/REVPAR de un hotel operativo nunca son 0), para no mostrar ceros espurios.
  const hv = (slug: string, col: string) => {
    const x = aggregate(pointRows[slug], col, "max");
    return x === 0 ? null : x;
  };
  const indRows = (defs: { item: string; mes: string; ytd: string }[]): IndicatorRowMY[] =>
    defs.map((d) => ({
      item: d.item,
      real: hv(REAL, d.mes), ppto: hv(PPTO, d.mes),
      ytdReal: hv(REAL, d.ytd), ytdPpto: hv(PPTO, d.ytd),
    }));

  // Gauges: ocupación Real del mes elegido (o del último mes reportado si el mes
  // no tiene dato) + Ppto del mismo mes como meta, y a su lado el gauge YTD
  // (promedio simple de los meses con dato > 0 del año hasta el mes seleccionado,
  // Real vs Ppto) — reunión JMB jul-2026.
  const OCC = "Ocupación pago 2024 (%)";
  const occHasMonth = aggregate(pointRows[REAL], OCC, "max") != null;
  const occRowsAt = (s: string) => occHasMonth
    ? pointRows[s]
    : yearRows(s).filter((r) => periodKey(String(r["Periodo"])) === asOfKey);
  const occValue = aggregate(occRowsAt(REAL), OCC, "max");
  const occTarget = aggregate(occRowsAt(PPTO), OCC, "max");
  const occLimit = month !== "" ? month : Number(asOfKey.slice(5)) || 12;
  const occYtdOf = (s: string) => {
    const vals = yearRows(s)
      .filter((r) => (num(r["mes"]) ?? 99) <= occLimit)
      .map((r) => num(r[OCC]))
      .filter((v): v is number => v != null && v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const occYtd = occYtdOf(REAL), occYtdP = occYtdOf(PPTO);

  // Deuda del hotel (créditos Ola + Hotel Ola) al mes de reporte: última fila del
  // cronograma con FechaId ≤ período mostrado, por crédito. Opcional (tabla nueva).
  const deudaFid = (() => {
    const ek = endKey || asOfKey;
    return ek ? Number(ek.slice(0, 4)) * 100 + Number(ek.slice(5, 7)) : 999912;
  })();
  const deudaHotel = (() => {
    const byLoan = new Map<string, Row>();
    for (const r of deuda.filter((r) => String(r["Unidad"]) === "Hotel" && (num(r["FechaId"]) ?? 0) <= deudaFid)
      .sort((a, b) => (num(a["FechaId"]) ?? 0) - (num(b["FechaId"]) ?? 0)))
      byLoan.set(String(r["Activo"]), r);
    return [...byLoan.values()];
  })();
  const deudaTot = deudaHotel.reduce((a: { saldo: number; total: number }, r) => ({
    saldo: a.saldo + (num(r["por pagar"]) ?? 0), total: a.total + (num(r["Deuda total"]) ?? 0),
  }), { saldo: 0, total: 0 });

  const indItems = [...new Set((pointRows[FULL] ?? []).map((r) => String(r["Item"])))];
  const indRowMY = (item: string): IndicatorRowMY => {
    const rows = (pointRows[FULL] ?? []).filter((r) => String(r["Item"]) === item);
    return {
      item: item.trim(),
      real: aggregate(rows, "Versión_Real", "max"), ppto: aggregate(rows, "Versión_Ppto", "max"),
      ytdReal: aggregate(rows, "Versión_Real YTD", "max"), ytdPpto: aggregate(rows, "Versión_Ppto YTD", "max"),
    };
  };

  return (
    <div className="dash">
      <header className="dash__header">
        <h1><img className="dash__logo" src="/logos/ola.png" alt="OLÁ Hotel" />OLÁ Hotel</h1>
        <div className="dash__slicers">
          <Slicer label="Año" value={year} options={years.map((y) => ({ value: y, label: String(y) }))} onChange={setYear} />
          <Slicer label="Mes" value={month} options={months.map((m) => ({ value: m, label: MESES[m] ?? String(m) }))} onChange={setMonth} />
        </div>
      </header>

      <section className="row" style={{ gridTemplateColumns: "1fr" }}>
        <IndicatorTableMY title="Informe de Gestión (Mensual y YTD)"
          rows={indItems.map((it) => indRowMY(it))} />
      </section>
      <section className="row row--hotel-kpis">
        {/* tablas apiladas a lo ancho (7 columnas no caben a media página) */}
        <div className="stack">
          <IndicatorTableMY title="Indicadores (USD)" dec={2} rows={indRows(IND_USD)} />
          <IndicatorTableMY title="Indicadores (CLP)" rows={indRows(IND_CLP)} />
        </div>
        <Gauge title="Ocupación (mes)" value={occValue} target={occTarget} colorByTarget />
        <Gauge title="Ocupación YTD" value={occYtd} target={occYtdP} colorByTarget />
      </section>

      {/* Deuda en tarjetas estilo SOHO (una por crédito + total si hay varios),
          tras los indicadores — mismo lugar que en RR */}
      {deudaHotel.length > 0 && (
        <section className="row" style={{
          gridTemplateColumns: `repeat(${deudaHotel.length + (deudaHotel.length > 1 ? 1 : 0)}, 1fr)`,
        }}>
          {deudaHotel.map((r) => {
            const saldo = num(r["por pagar"]), total = num(r["Deuda total"]);
            const amort = total && saldo != null ? (total - saldo) / total : null;
            return (
              <div className="card" key={String(r["Activo"])}>
                <div className="card__title">Deuda — {String(r["Activo"])}</div>
                <div className="kpi__grid">
                  <div className="kpi__item"><div className="kpi__value">{fmtUF(saldo)}</div><div className="kpi__label">Saldo por pagar (UF)</div></div>
                  <div className="kpi__item"><div className="kpi__value">{fmtUF(total)}</div><div className="kpi__label">Deuda total (UF)</div></div>
                  <div className="kpi__item"><div className="kpi__value">{amort != null ? fmtPct(amort, 1) : "—"}</div><div className="kpi__label">% Amortizado</div></div>
                </div>
              </div>
            );
          })}
          {deudaHotel.length > 1 && (
            <div className="card">
              <div className="card__title">Deuda — Total OLÁ</div>
              <div className="kpi__grid">
                <div className="kpi__item"><div className="kpi__value">{fmtUF(deudaTot.saldo)}</div><div className="kpi__label">Saldo por pagar (UF)</div></div>
                <div className="kpi__item"><div className="kpi__value">{fmtUF(deudaTot.total)}</div><div className="kpi__label">Deuda total (UF)</div></div>
                <div className="kpi__item"><div className="kpi__value">{deudaTot.total ? fmtPct((deudaTot.total - deudaTot.saldo) / deudaTot.total, 1) : "—"}</div><div className="kpi__label">% Amortizado</div></div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Por métrica: mensual | acumulado en la MISMA fila (patrón RR) */}
      {METRICS.map((m) => {
        const realPts = groupByPeriod(chartRows(REAL), "Periodo", [
          { col: m.real, agg: "sum", outKey: "Real" },
          { col: m.ly, agg: "sum", outKey: "Año anterior" },
        ]);
        const pptoPts = groupByPeriod(chartRows(PPTO), "Periodo", [{ col: m.real, agg: "sum", outKey: "Ppto" }]);
        const ytdPts = groupByPeriod(
          chartRows(FULL).filter((r) => String(r["Item"]) === m.ytdItem), "Periodo", [
            { col: "Versión_Real YTD", agg: "sum", outKey: "Real YTD" },
            { col: "Versión_Ppto YTD", agg: "sum", outKey: "Ppto YTD" },
          ]);
        return (
          <section key={m.title} className="row row--two">
            <BarsLineChart title={`${m.title} — mensual`}
              data={last12(mergeSeries([realPts, pptoPts]), endKey)}
              bars={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }]}
              line={{ key: "Ppto", label: "Ppto" }} tipFmt={fmtUF} />
            <BarsLineChart title={`${m.title} — acumulado`} data={last12(ytdPts, endKey)}
              bars={[{ key: "Real YTD", label: "Real YTD" }]}
              line={{ key: "Ppto YTD", label: "Ppto YTD" }} tipFmt={fmtUF} />
          </section>
        );
      })}

      <section className="row row--two">
        {LINES.map((l) => {
          const realPts = groupByPeriod(chartRows(REAL), "Periodo", [
            { col: l.real, agg: "max", outKey: "Real" },
            { col: l.ly, agg: "max", outKey: "Año anterior" },
          ]);
          const pptoPts = groupByPeriod(chartRows(PPTO), "Periodo", [{ col: l.real, agg: "max", outKey: "Ppto" }]);
          return (
            <MultiLineChart key={l.title} title={l.title}
              data={last12(mergeSeries([realPts, pptoPts]), endKey)}
              lines={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }, { key: "Ppto", label: "Ppto" }]}
              tipFmt={l.tip} tickFmt={l.tick} />
          );
        })}
      </section>

      <footer className="dash__footer">
        Reconstruido del layout del .pbix (página "OLÁ Hotel"). Real / Ppto / Año anterior
        desde las tablas Hotel Real, Hotel PPTO y columnas LY precalculadas. La deuda sale del
        cronograma de amortización del crédito Hotel Ola (deuda oficial del hotel).
      </footer>
    </div>
  );
}

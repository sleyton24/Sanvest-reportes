import { useEffect, useMemo, useState } from "react";
import { fetchRows, num, Row } from "../api";
import { last12 } from "../data";
import { fmtUF, fmtPct, fmtNum, fmtInt, periodKey } from "../format";
import { Slicer } from "../components/Slicer";
import { Gauge } from "../components/Gauge";
import { IndicatorTableMY, IndicatorRowMY } from "../components/IndicatorTable";
import { BarsLineChart, MultiLineChart } from "../components/charts/Charts";
import { HoldingPnLMulti, PnLMultiRow } from "../components/HoldingPnL";

// columnas de real_ppto_ly usadas por los visuales originales (página SOHO/PARK)
const C = {
  ebR: "EBITDA UF R", ebP: "EBITDA UF p", ebLY: "EBITDA UF R LY",
  ebYtdR: "EBITDA UF YTD R", ebYtdP: "EBITDA UF YTD p",
  // holding (LAR Group): Ingresos / Costos (mensual + YTD)
  ingR: "Ingresos totales UF R", ingP: "Ingresos totales UF p", ingLY: "Ingresos totales UF R LY",
  ingYtdR: "Ingresos totales UF YTD R", ingYtdP: "Ingresos totales UF YTD p",
  cosR: "Costos operacionales UF R", cosP: "Costos operacionales UF p", cosLY: "Costos operacionales UF LY",
  cosYtdR: "Costos operacionales UF YTD R", cosYtdP: "Costos operacionales UF YTD p",
  fluR: "Flujo UF R", fluP: "Flujo UF p", fluLY: "Flujo UF R LY",
  fluYtdR: "Flujo UF YTD R", fluYtdP: "Flujo UF YTD p",
  ocR: "Ocupación departamentos 2022 (%) R", ocP: "Ocupación departamentos 2022 (%) p",
  ocLY: "Ocupación departamentos 2022 (%) R7 LY",
  ebCuotaR: "EBITDA UF/CUOTA BANCO R", ebCuotaP: "EBITDA UF/CUOTA BANCO p", ebCuotaLY: "EBITDA UF/CUOTA BANCO R LY",
  tarR: "UF/M2_DEPARTAMENTOS R ", tarP: "UF/M2_DEPARTAMENTOS p", tarLY: "Tarifa LY",
  gcR: "Gastos Comunes (UF/M2) R", gcP: "Gastos Comunes (UF/M2) P", gcLY: "Gasto comun LY",
  // cards UF/M2 (mes / YTD), Real + Ppto
  m2DeptoR: "UF/M2_DEPARTAMENTOS R ", m2EstacR: "UF/ESTACIONAMIENTO R", m2TotR: "UF/M2 (DEPTO+ESTAC.) R",
  m2DeptoP: "UF/M2_DEPARTAMENTOS p", m2EstacP: "UF/ESTACIONAMIENTO p", m2TotP: "UF/M2 (DEPTO+ESTAC.) p",
  m2YtdDeptoR: "UF/M2_YTD R", m2YtdEstacR: "UF/ESTACIONAMIENTO_YTD R", m2YtdTotR: "UF/M2 (DEPTO+ESTAC.)_YTD R",
  m2YtdDeptoP: "UF/M2_YTD p", m2YtdEstacP: "UF/ESTACIONAMIENTO_YTD p", m2YtdTotP: "UF/M2 (DEPTO+ESTAC.)_YTD p",
};

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// tabla simple (KPIs Grupo / KPIs por Edificios de la página LAR Group)
type Col = { key: string; label: string; fmt?: (v: any) => string; num?: boolean };
function KpiTable({ title, cols, rows }: { title: string; cols: Col[]; rows: any[] }) {
  return (
    <div className="card pivot">
      <div className="card__title">{title}</div>
      <div className="pivot__scroll">
        <table className="pivot__table">
          <thead><tr>{cols.map((c) => <th key={c.key} className={c.num ? "num" : ""}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.key} className={c.num ? "num" : ""}>
                    {c.fmt ? c.fmt(r[c.key]) : (r[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RRDashboard() {
  const [data, setData] = useState<Row[]>([]);     // real_ppto_ly
  const [ind, setInd] = useState<Row[]>([]);       // indicadores_financieros (por activo)
  const [lar, setLar] = useState<Row[]>([]);       // indicadores_financieros_lar (holding)
  const [tipo, setTipo] = useState<Row[]>([]);     // tipologia (KPIs Grupo)
  const [edif, setEdif] = useState<Row[]>([]);     // rr_edificios_lar (KPIs por Edificios)
  const [deuda, setDeuda] = useState<Row[]>([]);   // deuda_activos (SOHO/PARK) — opcional
  const [activo, setActivo] = useState("SOHO");
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh] = useState(0);

  useEffect(() => {
    let off = false; setLoading(true);
    Promise.all([fetchRows("RR", "real_ppto_ly"), fetchRows("RR", "indicadores_financieros"),
                 fetchRows("RR", "indicadores_financieros_lar"), fetchRows("RR", "tipologia"),
                 fetchRows("RR", "rr_edificios_lar")])
      .then(([r, i, l, t, e]) => { if (!off) { setData(r); setInd(i); setLar(l); setTipo(t); setEdif(e); } })
      .catch((e) => !off && setError(String(e))).finally(() => !off && setLoading(false));
    // deuda_activos es opcional (tabla nueva; puede no existir aún en prod) → fetch
    // aparte y tolerante a error para no romper el dashboard si falta.
    fetchRows("RR", "deuda_activos").then((d) => { if (!off) setDeuda(d); }).catch(() => { if (!off) setDeuda([]); });
    return () => { off = true; };
  }, [refresh]);

  // ¿es la vista del holding? (LAR Group tiene su propia página, como en el BI)
  const isHolding = /group|grupo/i.test(activo);

  const activos = useMemo(
    () => [...new Set(data.map((r) => String(r["Activo"])))].filter(Boolean).sort(), [data]);
  const years = useMemo(
    () => [...new Set(data.filter((r) => r["Activo"] === activo).map((r) => num(r["Año"])).filter((v): v is number => v != null))].sort((a, b) => a - b),
    [data, activo]);

  // al abrir / cambiar de activo: caer en el último mes cargado (reportado)
  useEffect(() => {
    // Período por defecto = último mes con dato REAL en real_ppto_ly (la fuente de los
    // gráficos), así el holding nunca queda con gráficos vacíos aunque falte cargar un
    // mes. Fallback a indicadores_financieros_lar solo si real_ppto_ly no trae nada
    // para el activo (p. ej. consolidado del mes aún no cargado).
    const rpl = data.filter((r) => r["Activo"] === activo && (num(r["Mes"]) ?? 0) <= 12
      && num(r[C.ebR]) != null && num(r[C.ebR]) !== 0)
      .map((r) => num(r["Fecha ID"])!).filter((x) => !isNaN(x));
    let fid: number | null = rpl.length ? Math.max(...rpl) : null;
    if (fid == null && isHolding) {
      const f = lar.filter((r) => num(r["Versión_Real"]) !== 0).map((r) => num(r["FechaID"])!).filter((x) => !isNaN(x));
      fid = f.length ? Math.max(...f) : null;
    }
    if (fid) { setYear(Math.floor(fid / 100)); setMonth(fid % 100); }
  }, [data, lar, activo, isHolding]);

  // serie temporal de real_ppto_ly (para combos y líneas)
  const rows = useMemo(
    () => data.filter((r) => r["Activo"] === activo)
      .sort((a, b) => num(a["Fecha ID"])! - num(b["Fecha ID"])!), [data, activo]);

  // fila "a la fecha" de real_ppto_ly: mes elegido, o último mes REPORTADO
  // (los meses futuros traen solo Ppto: EBITDA Real = 0/null → se excluyen)
  const point = useMemo(() => {
    let rs = rows;
    if (year !== "") rs = rs.filter((r) => num(r["Año"]) === year);
    if (month !== "") rs = rs.filter((r) => num(r["Mes"]) === month);
    if (year === "" && month === "") {
      const rep = rs.filter((r) => { const e = num(r[C.ebR]); return e != null && e !== 0; });
      if (rep.length) return rep[rep.length - 1];
    }
    return rs.length ? rs[rs.length - 1] : undefined;
  }, [rows, year, month]);
  const v = (col: string) => (point ? num(point[col]) : null);

  // Ocupación YTD (gauge propio, Real vs Ppto): promedio simple de la ocupación
  // de los meses con dato del año elegido hasta el mes seleccionado (fallback:
  // período mostrado en `point` si no hay selección)
  const ocYtd = useMemo(() => {
    const y = year !== "" ? year : (point ? num(point["Año"]) : null);
    const m = month !== "" ? month : (point ? num(point["Mes"]) ?? 12 : 12);
    if (y == null) return { real: null, ppto: null };
    const avg = (col: string) => {
      const vals = rows
        .filter((r) => num(r["Año"]) === y && (num(r["Mes"]) ?? 0) >= 1 && (num(r["Mes"]) ?? 0) <= m)
        .map((r) => num(r[col]))
        .filter((x): x is number => x != null && x !== 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return { real: avg(C.ocR), ppto: avg(C.ocP) };
  }, [rows, year, month, point]);

  // tablas Indicadores Financieros (Mes / YTD) — indicadores_financieros por activo, periodo puntual
  const indPoint = useMemo(() => {
    let rs = ind.filter((r) => String(r["Nombre activo"]) === activo && num(r["Versión_Real"]) != null);
    if (year !== "") rs = rs.filter((r) => num(r["anio"]) === year);
    if (month !== "") rs = rs.filter((r) => num(r["mes"]) === month);
    // FechaID a mostrar: el elegido, o el último REPORTADO (algún Item con Real ≠ 0)
    const reported = new Set(rs.filter((r) => num(r["Versión_Real"]) !== 0).map((r) => num(r["FechaID"])!));
    const fids = (year === "" && month === "" ? [...reported] : rs.map((r) => num(r["FechaID"])!)).filter((x) => !isNaN(x));
    if (!fids.length) return [];
    const mx = Math.max(...fids);
    return rs.filter((r) => num(r["FechaID"]) === mx)
      .sort((a, b) => (num(a["Indice"]) ?? 99) - (num(b["Indice"]) ?? 99));
  }, [ind, activo, year, month]);
  const indMY: IndicatorRowMY[] = indPoint.map((r) => ({
    item: String(r["Item"]),
    real: num(r["Versión_Real"]), ppto: num(r["Versión_Ppto"]),
    ytdReal: num(r["YTD REAL"]), ytdPpto: num(r["YTD PPTO"]),
  }));

  // P&L del holding (Lar Group): filas del periodo REPORTADO (Nivel 1 / Nivel 2)
  const larPoint = useMemo(() => {
    let rs = lar.filter((r) => num(r["Versión_Real"]) != null);
    if (year !== "") rs = rs.filter((r) => num(r["Año"]) === year);
    if (month !== "") rs = rs.filter((r) => num(r["Mes"]) === month);
    const reported = new Set(rs.filter((r) => num(r["Versión_Real"]) !== 0).map((r) => num(r["FechaID"])!));
    const fids = (year === "" && month === "" ? [...reported] : rs.map((r) => num(r["FechaID"])!)).filter((x) => !isNaN(x));
    if (!fids.length) return [];
    const mx = Math.max(...fids);
    return rs.filter((r) => num(r["FechaID"]) === mx);
  }, [lar, year, month]);
  // Informe de Gestión LAR unificado: grupos de columnas Mes | YTD, secciones con
  // montos en la línea del grupo (sin filas Total) y EBITDA/Resultado al cierre.
  const larMulti: PnLMultiRow[] = larPoint.map((r) => ({
    nivel1: String(r["Nivel 1 "] ?? r["Nivel 1"] ?? ""), nivel2: String(r["Nivel 2"] ?? ""),
    indice: num(r["Indice"]) ?? 9,
    vals: [
      { real: num(r["Versión_Real"]), ppto: num(r["Versión_Ppto"]) },
      { real: num(r["YTD REAL"]), ppto: num(r["YTD PPTO"]) },
    ],
  })).sort((a, b) => (a.indice ?? 9) - (b.indice ?? 9));

  // KPIs Grupo (tipología): unidades administradas por tipología/métrica [Max]
  const tipoRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of tipo) {
      const k = String(r["TIPOLOGIAS/MÉTRICA"] ?? "").trim();
      const u = num(r["UNIDADES ADMINISTRADAS"]);
      if (k && u != null) m.set(k, Math.max(m.get(k) ?? -Infinity, u));
    }
    return [...m].map(([metrica, unidades]) => ({ metrica, unidades }));
  }, [tipo]);

  // KPIs por Edificios: último periodo cargado, edificios con deptos
  const edifRows = useMemo(() => {
    const fids = edif.map((r) => num(r["Fecha ID"])!).filter((x) => !isNaN(x));
    if (!fids.length) return [];
    const mx = Math.max(...fids);
    return edif.filter((r) => num(r["Fecha ID"]) === mx && num(r["Cantidad Deptos"]) != null)
      .map((r) => ({
        edificio: String(r["Activo"] ?? ""),
        ocup: num(r["Ocupación Deptos (%)"]),
        ufm2: num(r["Arriendo Deptos (UF/m2)(**)"]),
        deptos: num(r["Cantidad Deptos"]),
      }));
  }, [edif]);


  // último mes con dato REAL (EBITDA Real ≠ 0) del activo: tope de la ventana para
  // que los meses futuros —que traen solo Ppto— nunca aparezcan en los gráficos
  const lastRealFid = useMemo(() => {
    const f = rows.filter((r) => (num(r["Mes"]) ?? 0) >= 1 && (num(r["Mes"]) ?? 0) <= 12
      && num(r[C.ebR]) != null && num(r[C.ebR]) !== 0).map((r) => num(r["Fecha ID"])!);
    return f.length ? Math.max(...f) : null;
  }, [rows]);

  // series de gráficos: solo meses reales (1–12; descarta agregados trimestrales
  // del holding Mes 13–16), en ventana móvil de últimos 12 meses que termina en el
  // mes/año elegido (cruzando al año anterior) pero SIN pasar del último mes con
  // Real (los meses futuros solo tienen Ppto y no deben mostrarse)
  const chartRows = useMemo(() => {
    let rs = rows.filter((r) => (num(r["Mes"]) ?? 0) >= 1 && (num(r["Mes"]) ?? 0) <= 12);
    const sel = year !== "" ? year * 100 + (month !== "" ? month : 12) : Infinity;
    const selFid = Math.min(sel, lastRealFid ?? Infinity);
    if (isFinite(selFid)) {
      rs = rs.filter((r) => { const fid = num(r["Fecha ID"]) ?? 0; return fid > selFid - 100 && fid <= selFid; });
    }
    return rs;
  }, [rows, year, month, lastRealFid]);
  // last12 DESPUÉS de mapear: los YTD vienen precalculados por fila, así que la
  // ventana no altera su reseteo anual
  const series = (cols: Record<string, string>) =>
    last12(chartRows.map((r) => {
      const pt: any = { key: periodKey(String(r["Periodo"])), iso: String(r["Periodo"]).slice(0, 10) };
      for (const [k, col] of Object.entries(cols)) pt[k] = num(r[col]);
      return pt;
    }));

  // Para ratios (EBITDA/Cuota): un 0 almacenado = "sin dato" (PARK trae ceros
  // literales pre-operación 2021-2023), no un valor real — se anula para que la
  // línea no caiga a cero ni arrastre la escala del eje.
  const noZero = (pts: ReturnType<typeof series>) =>
    pts.map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) =>
      [k, typeof v === "number" && v === 0 ? null : v])) as typeof p);

  // Deuda del activo (SOHO/PARK) al mes de reporte: fila del cronograma con FechaId
  // ≤ período mostrado (última disponible). Opcional: si no hay tabla, no se muestra.
  const deudaPt = useMemo(() => {
    if (isHolding) return null;
    const fid = point ? (num(point["Año"]) ?? 0) * 100 + (num(point["Mes"]) ?? 0) : (lastRealFid ?? 999912);
    const rs = deuda.filter((r) => String(r["ActivoNorm"]) === activo && (num(r["FechaId"]) ?? 0) <= fid)
      .sort((a, b) => (num(a["FechaId"]) ?? 0) - (num(b["FechaId"]) ?? 0));
    return rs.length ? rs[rs.length - 1] : null;
  }, [deuda, activo, point, lastRealFid, isHolding]);

  if (error) return <div className="state state--error">Error: {error}</div>;
  if (loading) return <div className="state">Cargando Renta Residencial…</div>;

  return (
    <div className="dash">
      <header className="dash__header">
        <h1>
          {/* logo según el activo: SOHO/PARK con su marca; holding LAR Group */}
          <img className="dash__logo dash__logo--tile"
            src={activo === "SOHO" ? "/logos/soho.png" : activo === "PARK" ? "/logos/park.png" : "/logos/lar.png"}
            alt={isHolding ? "LAR Group" : activo} />
          Renta Residencial · <b className="dash__proj">{activo}</b>
        </h1>
        <div className="dash__slicers">
          <Slicer label="Activo" value={activo} allowEmpty={false}
            options={activos.map((a) => ({ value: a, label: a }))} onChange={(x) => x && setActivo(x)} />
          <Slicer label="Año" value={year} options={years.map((y) => ({ value: y, label: String(y) }))} onChange={setYear} />
          <Slicer label="Mes" value={month} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MESES[i + 1] }))} onChange={setMonth} />
        </div>
      </header>

      {isHolding ? (
        /* ===== Página LAR Group (holding) — como el BI ===== */
        <>
          <section className="row" style={{ gridTemplateColumns: "1fr" }}>
            <HoldingPnLMulti title="Informe de Gestión (UF)" rows={larMulti}
              groups={["Mes", "YTD"]} unit="UF" />
          </section>

          <section className="row row--two">
            <KpiTable title="KPIs Grupo" rows={tipoRows} cols={[
              { key: "metrica", label: "Tipología / Métrica" },
              { key: "unidades", label: "Unidades administradas", num: true, fmt: (x) => fmtInt(x) },
            ]} />
            <KpiTable title="KPIs por Edificios" rows={edifRows} cols={[
              { key: "edificio", label: "Edificio" },
              { key: "ocup", label: "Ocupación", num: true, fmt: (x) => fmtPct(x, 1) },
              { key: "ufm2", label: "Arriendo UF/m²", num: true, fmt: (x) => fmtNum(x, 3) },
              { key: "deptos", label: "Deptos", num: true, fmt: (x) => fmtInt(x) },
            ]} />
          </section>

          <section className="row row--two">
            <BarsLineChart title="Ingresos (UF)"
              data={series({ Real: C.ingR, "Año anterior": C.ingLY, Ppto: C.ingP })}
              bars={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }]}
              line={{ key: "Ppto", label: "Ppto" }} tipFmt={fmtUF} />
            <BarsLineChart title="Ingresos Acumulados (UF)"
              data={series({ Real: C.ingYtdR, Ppto: C.ingYtdP })}
              bars={[{ key: "Real", label: "Real YTD" }]} line={{ key: "Ppto", label: "Ppto YTD" }} tipFmt={fmtUF} />
          </section>
          <section className="row row--two">
            <BarsLineChart title="Costo Operacional (UF)"
              data={series({ Real: C.cosR, "Año anterior": C.cosLY, Ppto: C.cosP })}
              bars={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }]}
              line={{ key: "Ppto", label: "Ppto" }} tipFmt={fmtUF} />
            <BarsLineChart title="Costo Operacional Acumulado (UF)"
              data={series({ Real: C.cosYtdR, Ppto: C.cosYtdP })}
              bars={[{ key: "Real", label: "Real YTD" }]} line={{ key: "Ppto", label: "Ppto YTD" }} tipFmt={fmtUF} />
          </section>
          <section className="row row--two">
            <BarsLineChart title="EBITDA (UF)"
              data={series({ Real: C.ebR, "Año anterior": C.ebLY, Ppto: C.ebP })}
              bars={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }]}
              line={{ key: "Ppto", label: "Ppto" }} tipFmt={fmtUF} />
            <BarsLineChart title="EBITDA Acumulado (UF)"
              data={series({ Real: C.ebYtdR, Ppto: C.ebYtdP })}
              bars={[{ key: "Real", label: "Real YTD" }]} line={{ key: "Ppto", label: "Ppto YTD" }} tipFmt={fmtUF} />
          </section>

          <footer className="dash__footer">
            Página <strong>LAR Group</strong> (holding) del Power BI: Indicadores Financieros por
            Nivel 1/Nivel 2 (mes+YTD), KPIs Grupo (tipologías), KPIs por Edificios, e Ingresos /
            Costo Operacional / EBITDA (mensual+acumulado), consolidado del holding.
          </footer>
        </>
      ) : (
        /* ===== Página por propiedad (SOHO / PARK) ===== */
        <>
          {/* Indicadores Financieros Mes + YTD en una sola tabla */}
          <section className="row" style={{ gridTemplateColumns: "1fr" }}>
            <IndicatorTableMY title="Informe de Gestión (Mensual y YTD, UF)" rows={indMY} />
          </section>

          {/* Indicadores UF/m² en una tabla (Real/Ppto, Mes + YTD) + gauges de
              ocupación mes y YTD uno al lado del otro (reunión JMB jul-2026) */}
          <section className="row row--rr-kpis">
            <IndicatorTableMY title="Indicadores UF/m² (Mensual y YTD)" dec={3} rows={[
              { item: "Depto", real: v(C.m2DeptoR), ppto: v(C.m2DeptoP), ytdReal: v(C.m2YtdDeptoR), ytdPpto: v(C.m2YtdDeptoP) },
              { item: "Estac.", real: v(C.m2EstacR), ppto: v(C.m2EstacP), ytdReal: v(C.m2YtdEstacR), ytdPpto: v(C.m2YtdEstacP) },
              { item: "Depto+Estac.", real: v(C.m2TotR), ppto: v(C.m2TotP), ytdReal: v(C.m2YtdTotR), ytdPpto: v(C.m2YtdTotP) },
            ]} />
            <Gauge title="Ocupación (mes)" value={v(C.ocR)} target={v(C.ocP)} colorByTarget />
            <Gauge title="Ocupación YTD" value={ocYtd.real} target={ocYtd.ppto} colorByTarget />
          </section>

          {/* Deuda (cronograma de amortización) — solo si hay tabla deuda_activos */}
          {deudaPt && (() => {
            const saldo = num(deudaPt["por pagar"]), total = num(deudaPt["Deuda total"]), cuota = num(deudaPt["Cuota"]);
            const amort = total && saldo != null ? (total - saldo) / total : null;
            return (
              <section className="row" style={{ gridTemplateColumns: "1fr" }}>
                <div className="card">
                  <div className="card__title">Deuda — {activo}</div>
                  <div className="kpi__grid">
                    <div className="kpi__item"><div className="kpi__value">{fmtUF(saldo)}</div><div className="kpi__label">Saldo por pagar (UF)</div></div>
                    <div className="kpi__item"><div className="kpi__value">{fmtUF(total)}</div><div className="kpi__label">Deuda total (UF)</div></div>
                    <div className="kpi__item"><div className="kpi__value">{fmtUF(cuota)}</div><div className="kpi__label">Cuota del mes (UF)</div></div>
                    <div className="kpi__item"><div className="kpi__value">{amort != null ? fmtPct(amort, 1) : "—"}</div><div className="kpi__label">% Amortizado</div></div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* EBITDA (mensual + acumulado) */}
          <section className="row row--two">
            <BarsLineChart title="EBITDA (UF)"
              data={series({ Real: C.ebR, "Año anterior": C.ebLY, Ppto: C.ebP })}
              bars={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }]}
              line={{ key: "Ppto", label: "Ppto" }} tipFmt={fmtUF} />
            <BarsLineChart title="EBITDA Acumulado (UF)"
              data={series({ Real: C.ebYtdR, Ppto: C.ebYtdP })}
              bars={[{ key: "Real", label: "Real YTD" }]} line={{ key: "Ppto", label: "Ppto YTD" }} tipFmt={fmtUF} />
          </section>

          {/* Flujo (mensual + acumulado) */}
          <section className="row row--two">
            <BarsLineChart title="Flujo (UF)"
              data={series({ Real: C.fluR, "Año anterior": C.fluLY, Ppto: C.fluP })}
              bars={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }]}
              line={{ key: "Ppto", label: "Ppto" }} tipFmt={fmtUF} />
            <BarsLineChart title="Flujo Acumulado (UF)"
              data={series({ Real: C.fluYtdR, Ppto: C.fluYtdP })}
              bars={[{ key: "Real", label: "Real YTD" }]} line={{ key: "Ppto", label: "Ppto YTD" }} tipFmt={fmtUF} />
          </section>

          {/* Líneas: Ocupación, Tarifa, EBITDA/Cuota, Gastos Comunes */}
          <section className="row row--two">
            <MultiLineChart title="Ocupación (%)"
              data={series({ Real: C.ocR, "Año anterior": C.ocLY, Ppto: C.ocP })}
              lines={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }, { key: "Ppto", label: "Ppto" }]}
              tipFmt={(x) => fmtPct(x, 1)} tickFmt={(x) => fmtPct(x, 0)} />
            <MultiLineChart title="Tarifa UF/m²"
              data={series({ Real: C.tarR, Ppto: C.tarP, "Año anterior": C.tarLY })}
              lines={[{ key: "Real", label: "Real" }, { key: "Ppto", label: "Ppto" }, { key: "Año anterior", label: "Año anterior" }]}
              tipFmt={(x) => fmtNum(x, 3)} tickFmt={(x) => fmtNum(x, 3)} />
          </section>
          <section className="row row--two">
            <MultiLineChart title="EBITDA / Cuota Banco"
              data={noZero(series({ Real: C.ebCuotaR, "Año anterior": C.ebCuotaLY, Ppto: C.ebCuotaP }))}
              lines={[{ key: "Real", label: "Real" }, { key: "Año anterior", label: "Año anterior" }, { key: "Ppto", label: "Ppto" }]}
              tipFmt={(x) => fmtNum(x, 2)} tickFmt={(x) => fmtNum(x, 1)} />
            <MultiLineChart title="Gastos Comunes (UF/m²)"
              data={series({ Real: C.gcR, Ppto: C.gcP, "Año anterior": C.gcLY })}
              lines={[{ key: "Real", label: "Real" }, { key: "Ppto", label: "Ppto" }, { key: "Año anterior", label: "Año anterior" }]}
              tipFmt={(x) => fmtNum(x, 4)} tickFmt={(x) => fmtNum(x, 4)} />
          </section>

          <footer className="dash__footer">
            Visuales originales del Power BI (página SOHO/PARK): Indicadores Financieros (mes+YTD),
            UF/m² (mes+YTD), Ocupación, EBITDA y Flujo (mensual+acumulado), Tarifa, EBITDA/Cuota Banco
            y Gastos Comunes. "Cargar Informes" → transform → <strong>upsert con histórico</strong> → refresca.
            Deuda (saldo, deuda total, cuota y % amortizado) del cronograma de amortización.
          </footer>
        </>
      )}
    </div>
  );
}

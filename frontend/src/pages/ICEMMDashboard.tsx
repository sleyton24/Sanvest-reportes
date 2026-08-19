import { useEffect, useMemo, useState } from "react";
import { fetchRows, num, Row } from "../api";
import { last12 } from "../data";
import { fmtUF, periodKey } from "../format";
import { Slicer } from "../components/Slicer";
import { HoldingPnLMulti, PnLMultiRow } from "../components/HoldingPnL";
import { FlujoPivot } from "../components/FlujoPivot";
import { ColumnLinesChart } from "../components/charts/Charts";
import { useSetVista } from "../viewctx";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const n1 = (r: Row) => String(r["Nivel 1"] ?? "").trim();   // Nivel 1 trae espacios finales

// Grupos de columnas del Informe de Gestión unificado (YTD | YTG | FY, una sola
// tabla estilo SOHO); columnas Real/Ppto con wiring verificado vs .pbix
const PNL = [
  { title: "YTD", real: "YTD Real", ppto: "YTD PPTO" },
  { title: "YTG (por venir)", real: "YTG Proy", ppto: "YTG PPTO" },
  { title: "FY (proyección)", real: "FY Proy", ppto: "FY PPTO" },
];

// Niveles que componen cada línea de resultado. Deben calzar 1:1 con las líneas del
// Informe de Gestión de arriba: EBITDA = Ingresos − Gastos Op. − Oficina Central;
// Resultado = EBITDA + Otros no operacionales (= la fila "Resultado" al pie).
const ING = ["Ingresos"];
const EBITDA_N1 = ["Ingresos", "Gastos Operacionales", "Gastos Oficina Central"];
const RES_N1 = [...EBITDA_N1, "Otros no operacionales"];

// 8 combos: barra=Real (o YTD Real), línea=PPTO (o YTD PPTO); filtran por Nivel 1.
// La proyección (Proy) se saca de los gráficos a pedido: el contraste que interesa
// es Real contra Presupuesto. Las columnas Proy siguen en la BD y en la tabla (FY).
// flip: los gastos se guardan en NEGATIVO; en los gráficos SOLO de gastos se muestran
// como magnitud positiva (hacia arriba). EBITDA/Resultado NO se voltean: son netos
// (ingresos − gastos) y deben conservar su signo real.
const COMBOS = [
  { t: "Ingreso Mensual", niv: ING, bar: "Real", lines: ["PPTO"], flip: false },
  { t: "Ingresos YTD", niv: ING, bar: "YTD Real", lines: ["YTD PPTO"], flip: false },
  { t: "Gastos Operación Mensual", niv: ["Gastos Operacionales"], bar: "Real", lines: ["PPTO"], flip: true },
  { t: "Gastos Operación YTD", niv: ["Gastos Operacionales"], bar: "YTD Real", lines: ["YTD PPTO"], flip: true },
  { t: "EBITDA Mensual", niv: EBITDA_N1, bar: "Real", lines: ["PPTO"], flip: false },
  { t: "EBITDA YTD", niv: EBITDA_N1, bar: "YTD Real", lines: ["YTD PPTO"], flip: false },
  { t: "Resultado Mensual", niv: RES_N1, bar: "Real", lines: ["PPTO"], flip: false },
  { t: "Resultado YTD", niv: RES_N1, bar: "YTD Real", lines: ["YTD PPTO"], flip: false },
];

export function ICEMMDashboard() {
  const [men, setMen] = useState<Row[]>([]);     // icemm_mensual
  const [flujo, setFlujo] = useState<Row[]>([]); // flujo
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh] = useState(0);

  useEffect(() => {
    let off = false; setLoading(true);
    Promise.all([fetchRows("ICEMM", "icemm_mensual"), fetchRows("ICEMM", "flujo")])
      .then(([m, f]) => { if (!off) { setMen(m); setFlujo(f); } })
      .catch((e) => !off && setError(String(e))).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [refresh]);

  const years = useMemo(
    () => [...new Set(men.map((r) => num(r["Año"])).filter((v): v is number => v != null))].sort((a, b) => a - b),
    [men]);

  // al abrir: caer en el último mes cargado (con YTD Real)
  useEffect(() => {
    const f = men.filter((r) => num(r["YTD Real"]) != null).map((r) => num(r["FechID"])!).filter((x) => !isNaN(x));
    if (f.length) { const mx = Math.max(...f); setYear(Math.floor(mx / 100)); setMonth(mx % 100); }
  }, [men]);

  // periodo "a la fecha" para las tablas P&L y fin de la ventana de combos: mes
  // elegido, o último mes reportado (YTD Real no nulo). Se topa en el último mes con
  // Real para que los meses futuros —que solo traen Proy/Ppto— no aparezcan.
  const pointFid = useMemo(() => {
    const rep = men.filter((r) => num(r["YTD Real"]) != null).map((r) => num(r["FechID"])!).filter((x) => !isNaN(x));
    const lastReal = rep.length ? Math.max(...rep) : null;
    if (year !== "" && month !== "") {
      const raw = (year as number) * 100 + (month as number);
      return lastReal != null ? Math.min(raw, lastReal) : raw;
    }
    let pool = rep.length ? rep : men.map((r) => num(r["FechID"])!);
    if (year !== "") pool = pool.filter((f) => Math.floor(f / 100) === year);
    return pool.length ? Math.max(...pool) : null;
  }, [men, year, month]);

  const pointRows = useMemo(() => men.filter((r) => num(r["FechID"]) === pointFid), [men, pointFid]);
  // orden EERR de las secciones: ingresos arriba, gastos después, otros al final
  const N1_EERR = [...EBITDA_N1, "Otros no operacionales"];
  const eerrOrd = (g: string) => { const i = N1_EERR.indexOf(g); return i < 0 ? N1_EERR.length : i; };
  const detail: PnLMultiRow[] = pointRows.map((r) => ({
    nivel1: n1(r), nivel2: String(r["Nivel 2"] ?? ""),
    vals: PNL.map((p) => ({ real: num(r[p.real]), ppto: num(r[p.ppto]) })),
  })).sort((a, b) => eerrOrd(a.nivel1) - eerrOrd(b.nivel1));

  // EBITDA = Ingresos − Gastos Operacionales − Gastos Oficina Central. Los gastos ya
  // vienen en NEGATIVO, así que se suman. Va intercalado justo antes de "Otros no
  // operacionales" (que solo entra en la fila "Resultado" al pie).
  const sumaN1 = (grupos: string[], col: string) =>
    pointRows.filter((r) => grupos.includes(n1(r))).reduce((a, r) => a + (num(r[col]) ?? 0), 0);
  const ebitda: PnLMultiRow = {
    nivel1: "", nivel2: "EBITDA", result: true,
    vals: PNL.map((p) => ({ real: sumaN1(EBITDA_N1, p.real), ppto: sumaN1(EBITDA_N1, p.ppto) })),
  };
  // corte = filas de las 3 secciones del EBITDA, que por el sort quedan al principio
  const cut = detail.filter((r) => EBITDA_N1.includes(r.nivel1)).length;
  const pnlMulti: PnLMultiRow[] = detail.length
    ? [...detail.slice(0, cut), ebitda, ...detail.slice(cut)]
    : [];

  // series de combos: ventana móvil de 12 meses que termina en el mes elegido
  // (o el último reportado, = pointFid); cruza al año anterior vía FechID
  const chartRows = useMemo(() => {
    if (pointFid == null) return year === "" ? men : men.filter((r) => num(r["Año"]) === year);
    return men.filter((r) => {
      const f = num(r["FechID"]);
      return f != null && f > pointFid - 100 && f <= pointFid;
    });
  }, [men, year, pointFid]);

  // fin de la ventana como "YYYY-MM" para last12 (los YTD ya vienen acumulados
  // por año en icemm_mensual: solo se recortan, conservando su reseteo anual)
  const endKey = pointFid != null
    ? `${Math.floor(pointFid / 100)}-${String(pointFid % 100).padStart(2, "0")}`
    : undefined;

  const comboData = (niveles: string[], barCol: string, lineCols: string[], flip = false) => {
    const s = flip ? -1 : 1;   // gastos (negativos) -> magnitud positiva hacia arriba
    const m = new Map<string, any>();
    for (const r of chartRows) {
      if (!niveles.includes(n1(r))) continue;
      const iso = String(r["Fecha"]).slice(0, 10);
      const k = periodKey(iso);
      const e = m.get(k) ?? { key: k, iso, bar: 0,
        ...Object.fromEntries(lineCols.map((_, i) => [`l${i}`, 0])) };
      e.bar += s * (num(r[barCol]) ?? 0);
      lineCols.forEach((c, i) => { e["l" + i] += s * (num(r[c]) ?? 0); });
      m.set(k, e);
    }
    return last12([...m.values()].sort((a, b) => a.key.localeCompare(b.key)), endKey);
  };

  // Publica el reporte visible para el asistente del panel (PanelChat).
  useSetVista({
    unidad: "ICEMM",
    titulo: "Construcción (ICEMM)",
    filtros: { "Año": year || "", Mes: month || "" },
    cifras: [],
  });

  if (error) return <div className="state state--error">Error: {error}</div>;
  if (loading) return <div className="state">Cargando Construcción (ICEMM)…</div>;

  const pointLbl = pointFid ? `${MESES[(pointFid % 100)]} ${Math.floor(pointFid / 100)}` : "—";

  return (
    <div className="dash">
      <header className="dash__header">
        <h1><img className="dash__logo dash__logo--emm" src="/logos/emm.png" alt="EMM" />Construcción · <b className="dash__proj">ICEMM</b></h1>
        <div className="dash__slicers">
          <Slicer label="Año" value={year} options={years.map((y) => ({ value: y, label: String(y) }))} onChange={setYear} />
          <Slicer label="Mes" value={month} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MESES[i + 1] }))} onChange={setMonth} />
        </div>
      </header>

      {/* Informe de Gestión unificado: YTD | YTG | FY en una tabla (estilo SOHO).
          grandTotal = fila "Resultado" al pie (suma de todas las secciones);
          defaultCollapsed = arranca con las secciones plegadas. */}
      <section className="row" style={{ gridTemplateColumns: "1fr" }}>
        <HoldingPnLMulti title={`Informe de Gestión — a ${pointLbl}`}
          rows={pnlMulti} groups={PNL.map((p) => p.title)} unit="UF"
          grandTotal="Resultado" defaultCollapsed />
      </section>

      {/* Flujo de Caja (como en el PBI: entre las tablas P&L y los combos) */}
      <section className="row" style={{ gridTemplateColumns: "1fr" }}>
        <FlujoPivot title="Flujo de Caja" rows={flujo} defaultCollapsed />
      </section>

      {/* Combos: Ingreso / Gastos Operación / EBITDA / Resultado (mensual + YTD),
          barra Real contra línea Ppto — sin la proyección */}
      {[[0, 1], [2, 3], [4, 5], [6, 7]].map((pair) => (
        <section className="row row--two" key={pair[0]}>
          {pair.map((i) => {
            const c = COMBOS[i];
            return (
              <ColumnLinesChart key={c.t} title={c.t}
                data={comboData(c.niv, c.bar, c.lines, c.flip)}
                bar={{ key: "bar", label: c.bar.includes("YTD") ? "Real YTD" : "Real" }}
                lines={c.lines.map((col, i) => ({ key: `l${i}`, label: col.includes("PPTO") ? "Ppto" : "Proy" }))}
                tipFmt={fmtUF} />
            );
          })}
        </section>
      ))}

      <footer className="dash__footer">
        Página <strong>ICEMM</strong> (Construcción) del Power BI: Informe de Gestión
        YTD / YTG / FY por Nivel 1 ▸ Nivel 2 (colapsables, a la fecha = {pointLbl}), con
        EBITDA (Ingresos − Gastos Operacionales − Gastos Oficina Central) y Resultado
        (EBITDA + Otros no operacionales); los combos de EBITDA y Resultado usan esas
        mismas definiciones, así que cierran contra la tabla. Más el flujo de caja.
      </footer>
    </div>
  );
}

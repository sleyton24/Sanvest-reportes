import { useEffect, useMemo, useState } from "react";
import { fetchRows, num, Row } from "../api";
import { fmtUF } from "../format";
import { Slicer } from "../components/Slicer";
import { BalanceSheet } from "../components/BalanceSheet";
import { PnLMatrix, PnLCol } from "../components/PnLMatrix";
import { HBarChart, PieChart, WaterfallChart } from "../components/charts/Charts";
import { Button } from "../components/Button";

const triKey = (t: string) => {
  const m = String(t).match(/Q(\d)-(\d{4})/);
  return m ? parseInt(m[2], 10) * 10 + parseInt(m[1], 10) : 0;
};

// Balance como el BI: Costo/Mercado × UF/USD en DOS familias — QAC = valor del
// trimestre seleccionado, LQ = cierre del año anterior (Q4 previo; verificado:
// LQ(Q1-2026) == QAC(Q4-2025) cuenta a cuenta). Antes se mostraba solo LQ
// rotulado como vigente — el balance entero enseñaba el año anterior.
// USD se formatea con separador de miles sin "UF" (lo resuelve BalanceSheet).
const BAL_FIELDS = [
  { key: "Costo UF QAC", label: "Costo UF" },
  { key: "Costo USD QAC", label: "Costo USD" },
  { key: "Mercado UF QAC", label: "Mercado UF" },
  { key: "Mercado USD QAC", label: "Mercado USD" },
  { key: "Costo UF LQ", label: "Costo UF", sep: true },
  { key: "Costo USD LQ", label: "Costo USD" },
  { key: "Mercado UF LQ", label: "Mercado UF" },
  { key: "Mercado USD LQ", label: "Mercado USD" },
];

// EERR como en el PBI: jerarquía N1>N2>N3, columnas Real/YTG/Forecast/Presupuesto
// + "Año anterior" (columna `2024` de la fuente: Real del año previo; viene
// poblada desde Q4-2025 — trimestres anteriores muestran 0 hasta que la base la traiga)
const EERR_LEVELS = ["N1", "N2", "N3"];
const EERR_COLS: PnLCol[] = [
  { key: "Real", label: "Real" },
  { key: "YTG", label: "YTG" },
  { key: "Forecast", label: "Forecast" },
  { key: "Presupuesto", label: "Ppto" },
  { key: "2024", label: "Año anterior", sep: true },
];

export function GrupoDashboard() {
  const [bal, setBal] = useState<Row[]>([]);
  const [eerr, setEerr] = useState<Row[]>([]);
  const [casc, setCasc] = useState<Row[]>([]);
  const [tri, setTri] = useState<string | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh] = useState(0);

  useEffect(() => {
    let off = false; setLoading(true);
    Promise.all([fetchRows("Grupo", "balance"), fetchRows("Grupo", "eerr_grupo"), fetchRows("Grupo", "cascada")])
      .then(([b, e, c]) => { if (!off) { setBal(b); setEerr(e); setCasc(c); } })
      .catch((er) => !off && setError(String(er))).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [refresh]);

  const tris = useMemo(() => [...new Set(bal.map((r) => String(r["Trimestre"])).filter(Boolean))]
    .sort((a, b) => triKey(a) - triKey(b)), [bal]);
  useEffect(() => { if (tris.length) setTri(tris[tris.length - 1]); }, [tris]);

  // Balance: patrimonio por unidad de negocio (Mercado / Costo) en el trimestre
  const patri = (col: string) => {
    const m = new Map<string, number>();
    for (const r of bal) {
      if (String(r["Trimestre"]) !== tri || String(r["N4"]) !== "Patrimonio") continue;
      const u = String(r["N1 "] ?? "").trim();
      if (u) m.set(u, (m.get(u) ?? 0) + (num(r[col]) ?? 0));
    }
    return [...m].filter(([, v]) => Math.abs(v) > 0.5).map(([label, value]) => ({ label, value }));
  };
  const balRows = useMemo(() => bal.filter((r) => String(r["Trimestre"]) === tri), [bal, tri]);

  // EERR del trimestre (matriz N1>N2>N3, columnas como el PBI)
  const eerrRows = useMemo(() => eerr.filter((r) => String(r["Trimestre"]) === tri), [eerr, tri]);

  // Cierre del año anterior = Q4 del año previo al trimestre en pantalla (ej. Q1-2026 → Q4-2025).
  // Rotula la familia LQ del balance y la columna "año anterior" del EERR con ese trimestre real,
  // igual que el primer grupo muestra el trimestre vigente. Fallback si el formato no calza.
  const lqLabel = useMemo(() => {
    const m = String(tri).match(/Q\d-(\d{4})/);
    return m ? `Q4-${parseInt(m[1], 10) - 1}` : "Cierre año anterior";
  }, [tri]);
  const eerrCols = useMemo<PnLCol[]>(
    () => EERR_COLS.map((c) => (c.key === "2024" ? { ...c, label: lqLabel } : c)), [lqLabel]);

  // Utilidad por columna = Ingresos − Egresos (los egresos vienen en positivo)
  const eerrResult = useMemo(() => {
    const keys = ["Real", "YTG", "Forecast", "Presupuesto", "2024"];
    const acc: Record<string, number> = {};
    for (const k of keys) acc[k] = 0;
    for (const r of eerrRows) {
      const sign = String(r["N1"]) === "INGRESOS" ? 1 : String(r["N1"]) === "EGRESOS" ? -1 : 0;
      if (!sign) continue;
      for (const k of keys) acc[k] += sign * (num(r[k]) ?? 0);
    }
    return acc;
  }, [eerrRows]);

  // Cascada (waterfall) PUENTE Ppto → Forecast: arranca en el total Presupuesto, cada
  // unidad de negocio suma/resta su variación (Forecast − Ppto), y cierra en el total
  // Forecast. (Antes mostraba un solo escenario apilado, que no era el bridge del BI.)
  const wf = useMemo(() => {
    const inTri = casc.filter((r) => String(r["Fecha Trimestre"]) === tri);
    const byScen = (sc: string) => {
      const m = new Map<string, number>();
      for (const r of inTri.filter((r) => String(r["N2"]) === sc))
        m.set(String(r["N1"]), (m.get(String(r["N1"])) ?? 0) + (num(r["Monto "]) ?? 0));
      return m;
    };
    // destino del puente: Forecast si existe (trimestres abiertos), si no Real (cerrados)
    const endScen = ["Forecast", "Real"].find((s) => inTri.some((r) => String(r["N2"]) === s)) ?? "Forecast";
    const ppto = byScen("PPTO"), fc = byScen(endScen);
    const units = [...new Set([...ppto.keys(), ...fc.keys()])];
    const pTot = [...ppto.values()].reduce((a, b) => a + b, 0);
    const fTot = [...fc.values()].reduce((a, b) => a + b, 0);
    // variación por unidad; los que mueven <1% del total bruto se agrupan en "Otros"
    // (como el BI), y se ordenan descendente. La suma cierra Ppto → destino.
    const deltas = units.map((u) => ({ u, d: (fc.get(u) ?? 0) - (ppto.get(u) ?? 0) }));
    const gross = deltas.reduce((a, x) => a + Math.abs(x.d), 0);
    const thr = gross * 0.01;
    const big = deltas.filter((x) => Math.abs(x.d) >= thr);
    const smalls = deltas.filter((x) => Math.abs(x.d) < thr);
    const movers: { categoria: string; valor: number; tipo: "increase" | "decrease" | "otros" }[] =
      big.map((x) => ({ categoria: x.u, valor: x.d, tipo: (x.d >= 0 ? "increase" : "decrease") as "increase" | "decrease" }));
    if (smalls.length) movers.push({ categoria: "Otros", valor: smalls.reduce((a, x) => a + x.d, 0), tipo: "otros" });
    movers.sort((a, b) => b.valor - a.valor);
    return {
      endScen,
      data: [
        { categoria: "PPTO", valor: pTot, tipo: "total" as const },
        ...movers,
        { categoria: endScen, valor: fTot, tipo: "total" as const },
      ],
    };
  }, [casc, tri]);

  // Notas EERR al hover en la matriz: mapa (nombre de fila → {texto, N°}). Se llavea por
  // el nivel más profundo mostrado (N3, o N2/N1 si falta) y se descarta el placeholder "0".
  const eerrNotes = useMemo(() => {
    const m: Record<string, { text: string; num?: number }> = {};
    for (const r of eerrRows) {
      const txt = String(r["Comentario Nota"] ?? "").trim();
      if (!txt || txt === "0") continue;
      const label = String(r["N3"] ?? "").trim() || String(r["N2"] ?? "").trim() || String(r["N1"] ?? "").trim();
      const nn = num(r["Notas"]);
      if (label && !m[label]) m[label] = { text: txt, num: nn && nn > 0 ? nn : undefined };
    }
    return m;
  }, [eerrRows]);

  // pantalla completa (balance o EERR) con la columna Nota integrada en la tabla
  const [expand, setExpand] = useState<"" | "balance" | "eerr">("");

  if (error) return <div className="state state--error">Error: {error}</div>;
  if (loading) return <div className="state">Cargando Estados Financieros del Grupo…</div>;

  return (
    <div className="dash">
      <header className="dash__header">
        <h1><img className="dash__logo dash__logo--flat" src="/sanvest-azul.png" alt="Sanvest" />Estados Financieros · <b className="dash__proj">Grupo Sanvest</b></h1>
        <div className="dash__slicers">
          <Slicer label="Trimestre" value={tri} allowEmpty={false}
            options={tris.map((t) => ({ value: t, label: t }))} onChange={(x) => x && setTri(x as string)} />
        </div>
      </header>

      {/* Balance + Patrimonio (familia QAC = trimestre vigente) */}
      <section className="row row--two">
        <HBarChart title="Patrimonio por Unidad de Negocio (Mercado UF)" data={patri("Mercado UF QAC")} valueFmt={fmtUF}
          total={{ label: "Total Patrimonio", value: patri("Mercado UF QAC").reduce((a, x) => a + x.value, 0) }} />
        <PieChart title="Participación en Patrimonio (unidades positivas)" data={patri("Mercado UF QAC")} valueFmt={fmtUF} />
      </section>
      <section className="row" style={{ gridTemplateColumns: "1fr" }}>
        <BalanceSheet title="Balance Grupo" rows={balRows} valueFields={BAL_FIELDS}
          headerGroups={[{ label: tri || "Trimestre", cols: 4 }, { label: lqLabel, cols: 4 }]}
          noteField="Nota" noteNumField="Notas" onExpand={() => setExpand("balance")} />
      </section>

      {/* EERR (matriz como el PBI: N1>N2>N3, cols Real/YTG/Forecast/Ppto/Año ant.) + Utilidad */}
      <section className="row" style={{ gridTemplateColumns: "1fr" }}>
        <PnLMatrix title="EERR Grupo (UF)" rows={eerrRows} levels={EERR_LEVELS} cols={eerrCols} fmt={fmtUF}
          notes={eerrNotes} onExpand={() => setExpand("eerr")}
          result={{ label: "UTILIDAD (Ingresos − Egresos)", values: eerrResult }} />
      </section>
      <section className="row" style={{ gridTemplateColumns: "1fr" }}>
        <WaterfallChart title={`Utilidad Grupos Sanvest (Var. Ppto. vs ${wf.endScen === "Forecast" ? "Budget" : wf.endScen}) UF`} data={wf.data} valueFmt={fmtUF} />
      </section>

      {/* Pantalla completa: UNA tabla a todo el ancho con la columna Nota integrada */}
      {expand && (
        <div className="overlay">
          <div className="overlay__main">
            {expand === "balance" ? (
              <BalanceSheet title={`Balance Grupo — ${tri}`} rows={balRows} valueFields={BAL_FIELDS}
                headerGroups={[{ label: tri || "Trimestre", cols: 4 }, { label: lqLabel, cols: 4 }]}
                noteField="Nota" noteNumField="Notas" noteCol />
            ) : (
              <PnLMatrix title={`EERR Grupo (UF) — ${tri}`} rows={eerrRows} levels={EERR_LEVELS}
                cols={eerrCols} fmt={fmtUF} notes={eerrNotes} noteCol
                result={{ label: "UTILIDAD (Ingresos − Egresos)", values: eerrResult }} />
            )}
          </div>
          <Button variant="secondary" className="overlay__close" onClick={() => setExpand("")}>✕ Cerrar</Button>
        </div>
      )}

      <footer className="dash__footer">
        Estados Financieros consolidados del Grupo Sanvest: Balance (patrimonio por unidad de negocio,
        a valor Mercado UF), EERR (Real vs Presupuesto por Ingresos/Egresos), cascada de utilidad por
        unidad, y notas. Slicer por Trimestre. Fuente: Base balance del Grupo.
      </footer>
    </div>
  );
}

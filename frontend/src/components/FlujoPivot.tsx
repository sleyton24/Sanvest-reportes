import { Fragment, useState } from "react";
import { Row, num } from "../api";
import { fmtNum } from "../format";
import { Button } from "./Button";

const MES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const perLabel = (p: string) => {
  const [y, m] = p.split("-");
  return `${MES[parseInt(m, 10)] ?? m} ${y.slice(2)}`;
};
const leadNum = (s: string) => {
  const m = s.match(/^\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
};
const norm = (s: string) => s.trim().toLowerCase();
// sin el prefijo "N. " — las categorías vienen numeradas ("6. Caja Inicial" con
// hijo "16. Caja Inicial"): para comparar y para rotular como informe se usa el
// texto pelado, si no el hijo redundante no se detecta y la fila sale duplicada.
const bare = (s: string) => norm(s).replace(/^\d+\.\s*/, "");
const display = (s: string) => s.trim().replace(/^\d+\.\s*/, "");
const negColor = (v: number | null | undefined) => (v != null && v < 0 ? "var(--neg)" : undefined);

// Estado de flujo de caja con formato de informe de gestión: secciones (Categoría 1)
// con encabezado colapsable y subtotal, fila calculada "Flujo Neto del Mes" (suma de
// las secciones de flujo; check: Caja Inicial + Flujo Neto = Caja Final), Caja Final
// como cierre y columna Total del año (en las cajas, saldo inicial/final, no suma).
export function FlujoPivot({ title, rows, defaultCollapsed = false }: {
  title: string; rows: Row[]; defaultCollapsed?: boolean;
}) {
  const periods = [...new Set(rows.map((r) => String(r["Fecha"]).slice(0, 7)))]
    .filter(Boolean).sort();

  const cat1Ord = new Map<string, number>();
  const cat1Cats: Record<string, Set<string>> = {};
  const cell = new Map<string, number>();      // `${cat2}|${period}` -> suma
  for (const r of rows) {
    const c1 = String(r["Categoría 1"] ?? "").trim();
    const c2 = String(r["Categoría 2"] ?? "").trim();
    if (!c1 || !c2) continue;
    const ord = num(r["Orden"]) ?? 99;
    const per = String(r["Fecha"]).slice(0, 7);
    if (!cat1Ord.has(c1)) cat1Ord.set(c1, ord);
    (cat1Cats[c1] ??= new Set()).add(c2);
    const k = `${c2}|${per}`;
    cell.set(k, (cell.get(k) ?? 0) + (num(r["Monto"]) ?? 0));
  }
  const cat1s = [...cat1Ord.keys()].sort((a, b) => cat1Ord.get(a)! - cat1Ord.get(b)!);

  const cajaIni = cat1s.find((c) => bare(c) === "caja inicial");
  const cajaFin = cat1s.find((c) => bare(c) === "caja final");
  const flowCats = cat1s.filter((c) => c !== cajaIni && c !== cajaFin);
  const groupTot = (c1: string, p: string) =>
    [...(cat1Cats[c1] ?? [])].reduce((a, c2) => a + (cell.get(`${c2}|${p}`) ?? 0), 0);
  // Flujo neto del mes = Caja Final − Caja Inicial (derivado de las cajas: la suma
  // directa de las secciones NO cuadra porque mezclan totales con componentes —
  // "Total IVA" ya neteado + "PPM", CxP/CxC, etc.). Fallback: suma de secciones.
  const netFlow = (p: string) => (cajaIni && cajaFin)
    ? groupTot(cajaFin, p) - groupTot(cajaIni, p)
    : flowCats.reduce((a, c1) => a + groupTot(c1, p), 0);
  const yearSum = (f: (p: string) => number) => periods.reduce((a, p) => a + f(p), 0);

  // arranca colapsado si el caller lo pide (flowCats ya está calculado sobre rows,
  // que llegan cargadas: el dashboard no monta la tabla hasta terminar el fetch)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => defaultCollapsed ? new Set(flowCats) : new Set());
  const allCollapsed = flowCats.length > 0 && flowCats.every((c) => collapsed.has(c));
  const toggle = (c1: string) => setCollapsed((s) => {
    const n = new Set(s); n.has(c1) ? n.delete(c1) : n.add(c1); return n;
  });
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(flowCats));

  return (
    <div className="card pivot">
      <div className="card__title">
        {title}
        <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={toggleAll}>
          {allCollapsed ? "Expandir todo" : "Colapsar todo"}
        </Button>
      </div>
      <div className="pivot__scroll">
        <table className="pivot__table">
          <thead>
            <tr>
              <th>Categoría</th>
              {periods.map((p) => <th key={p} className="num">{perLabel(p)}</th>)}
              <th className="num grp strong">Total</th>
            </tr>
          </thead>
          <tbody>
            {flowCats.map((c1) => {
              const cats = [...cat1Cats[c1]].sort((a, b) => leadNum(a) - leadNum(b));
              // detalle sin la línea redundante (misma etiqueta que el grupo)
              const detail = cats.filter((c2) => bare(c2) !== bare(c1));
              const tot = (p: string) => groupTot(c1, p);
              const isCol = collapsed.has(c1);
              const hasDetail = detail.length > 0;
              return (
                <Fragment key={c1}>
                  {/* los montos van EN la línea de la sección (una sola fila): colapsada
                      muestra el total en una línea; expandida agrega el detalle debajo */}
                  <tr className={"pnl__group" + (hasDetail ? " pnl__group--toggle" : "")}
                    onClick={hasDetail ? () => toggle(c1) : undefined}>
                    <td>{hasDetail && <span className="pnl__chev">{isCol ? "▸" : "▾"}</span>}{display(c1)}</td>
                    {periods.map((p) => (
                      <td key={p} className="num strong" style={{ color: negColor(tot(p)) }}>{fmtNum(tot(p), 0)}</td>
                    ))}
                    <td className="num strong grp" style={{ color: negColor(yearSum(tot)) }}>{fmtNum(yearSum(tot), 0)}</td>
                  </tr>
                  {hasDetail && !isCol && detail.map((c2) => (
                    <tr key={c1 + c2}>
                      <td style={{ paddingLeft: 26 }}>{display(c2)}</td>
                      {periods.map((p) => {
                        const v = cell.get(`${c2}|${p}`);
                        return <td key={p} className="num" style={{ color: negColor(v) }}>{v == null ? "" : fmtNum(v, 0)}</td>;
                      })}
                      <td className="num grp">{fmtNum(yearSum((p) => cell.get(`${c2}|${p}`) ?? 0), 0)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            <tr className="pnl__result">
              <td className="strong">Flujo Neto del Mes</td>
              {periods.map((p) => (
                <td key={p} className="num strong" style={{ color: negColor(netFlow(p)) }}>{fmtNum(netFlow(p), 0)}</td>
              ))}
              <td className="num strong grp" style={{ color: negColor(yearSum(netFlow)) }}>{fmtNum(yearSum(netFlow), 0)}</td>
            </tr>
            {cajaIni && (
              <tr>
                <td className="strong">{display(cajaIni)}</td>
                {periods.map((p) => <td key={p} className="num strong" style={{ color: negColor(groupTot(cajaIni, p)) }}>{fmtNum(groupTot(cajaIni, p), 0)}</td>)}
                {/* saldo al inicio del período, no suma */}
                <td className="num strong grp">{fmtNum(groupTot(cajaIni, periods[0]), 0)}</td>
              </tr>
            )}
            {cajaFin && (
              <tr className="pnl__grandtotal">
                <td className="strong">{display(cajaFin)}</td>
                {periods.map((p) => <td key={p} className="num strong" style={{ color: negColor(groupTot(cajaFin, p)) }}>{fmtNum(groupTot(cajaFin, p), 0)}</td>)}
                {/* saldo al cierre del período, no suma */}
                <td className="num strong grp">{fmtNum(groupTot(cajaFin, periods[periods.length - 1]), 0)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pnl__note">
        Flujo de caja (Monto por mes, UF). Total = suma del año; en Caja Inicial/Final es el
        saldo al inicio/cierre. Clic en una sección para contraer/expandir.
      </div>
    </div>
  );
}

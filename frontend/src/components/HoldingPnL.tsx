import { Fragment, useState } from "react";
import { fmtNum } from "../format";
import { Button } from "./Button";

export interface PnLRow {
  nivel1: string;
  nivel2: string;
  indice: number;
  real: number | null;
  ppto: number | null;
}

const dColorOf = (d: number | null) => (d == null ? undefined : d >= 0 ? "var(--pos)" : "var(--neg)");
const diff = (r: number | null, p: number | null) => (r != null && p != null ? r - p : null);

// P&L con VARIOS grupos de columnas (p.ej. YTD | YTG | FY, o Mes | YTD), cada grupo
// Real/Ppto/Δ, con cabecera de dos filas como la tabla de indicadores de SOHO y el
// mismo agrupado colapsable por Nivel 1 de HoldingPnL. `vals` = un par por grupo.
// indice >= 4 marca líneas de resultado (EBITDA/Resultado): van al final como
// pnl__result, sin sección ni detalle.
export interface PnLMultiRow {
  nivel1: string;
  nivel2: string;
  indice?: number;
  // línea de resultado/subtotal (EBITDA, NOI, Resultado): se dibuja como pnl__result
  // en su POSICIÓN dentro del array (permite intercalar subtotales entre secciones).
  // Si no se indica, se infiere por indice >= 4 (compatibilidad con RR/ICEMM).
  result?: boolean;
  vals: { real: number | null; ppto: number | null }[];
}
export function HoldingPnLMulti({ title, rows, groups, unit = "UF", grandTotal, defaultCollapsed = true }: {
  title: string; rows: PnLMultiRow[]; groups: string[]; unit?: string;
  grandTotal?: string;       // fila de total al pie: suma de TODAS las secciones por grupo
  defaultCollapsed?: boolean; // arranca con las secciones colapsadas (por defecto SÍ)
}) {
  const isResult = (r: PnLMultiRow) => r.result ?? ((r.indice ?? 0) >= 4);
  const detailRows = rows.filter((r) => !isResult(r));
  // secciones en el orden en que llegan las filas (el caller ya ordena el EERR)
  const secs = Array.from(new Set(detailRows.map((r) => r.nivel1)));
  // orden de render: recorriendo `rows`, cada sección se emite en su 1ª aparición y
  // cada línea de resultado en su lugar → permite subtotales intercalados (NOI).
  const blocks: ({ t: "sec"; g: string } | { t: "res"; r: PnLMultiRow })[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (isResult(r)) blocks.push({ t: "res", r });
    else if (!seen.has(r.nivel1)) { seen.add(r.nivel1); blocks.push({ t: "sec", g: r.nivel1 }); }
  }
  // arranca colapsado si el caller lo pide (el dashboard no monta la tabla hasta
  // terminar el fetch, así que `secs` ya viene poblado en el primer render)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => defaultCollapsed ? new Set(secs) : new Set());
  const toggle = (g: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(g)) next.delete(g); else next.add(g);
    return next;
  });
  const allCollapsed = collapsed.size >= secs.length && secs.length > 0;
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(secs));

  const cells = (v: { real: number | null; ppto: number | null }, strong: boolean) => {
    const d = diff(v.real, v.ppto);
    const cls = strong ? "num strong" : "num";
    return (
      <>
        <td className={cls + " grp"}>{fmtNum(v.real, 0)}</td>
        <td className={cls}>{fmtNum(v.ppto, 0)}</td>
        <td className={cls} style={{ color: dColorOf(d) }}>{fmtNum(d, 0)}</td>
      </>
    );
  };

  return (
    <div className="card pivot">
      <div className="card__title">
        <span>{title}</span>
        <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={toggleAll}>
          {allCollapsed ? "Expandir todo" : "Colapsar todo"}
        </Button>
      </div>
      <div className="pivot__scroll">
        <table className="pivot__table">
          <thead>
            <tr>
              <th rowSpan={2}>Cuenta</th>
              {groups.map((g) => <th key={g} colSpan={3} className="num grp">{g}</th>)}
            </tr>
            <tr>
              {groups.map((g) => (
                <Fragment key={g}>
                  <th className="num grp">Real</th><th className="num">Ppto</th><th className="num">Δ</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {blocks.map((b, bi) => {
              if (b.t === "res") {
                return (
                  <tr key={"res_" + b.r.nivel2 + bi} className="pnl__result">
                    <td className="strong">{b.r.nivel2}</td>
                    {b.r.vals.map((v, gi) => <Fragment key={gi}>{cells(v, true)}</Fragment>)}
                  </tr>
                );
              }
              const g = b.g;
              const detail = detailRows.filter((r) => r.nivel1 === g);
              const sub = groups.map((_, gi) => ({
                real: detail.reduce((a, r) => a + (r.vals[gi]?.real ?? 0), 0),
                ppto: detail.reduce((a, r) => a + (r.vals[gi]?.ppto ?? 0), 0),
              }));
              const isCol = collapsed.has(g);
              return (
                <Fragment key={g}>
                  {/* los montos van EN la línea del grupo (sin fila "Total" aparte):
                      colapsado = una sola línea con valores — pedido reunión JMB */}
                  <tr className="pnl__group pnl__group--toggle" onClick={() => toggle(g)}>
                    <td><span className="pnl__chev">{isCol ? "▸" : "▾"}</span>{g.trim()}</td>
                    {sub.map((v, gi) => <Fragment key={gi}>{cells(v, true)}</Fragment>)}
                  </tr>
                  {!isCol && detail.map((r) => (
                    <tr key={g + r.nivel2}>
                      <td style={{ paddingLeft: 26 }}>{r.nivel2}</td>
                      {r.vals.map((v, gi) => <Fragment key={gi}>{cells(v, false)}</Fragment>)}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {grandTotal && (() => {
              // total al pie = suma de todas las secciones (Ingresos + Gastos + Otros),
              // por cada grupo de columnas; los gastos ya vienen en negativo
              const gt = groups.map((_, gi) => ({
                real: detailRows.reduce((a, r) => a + (r.vals[gi]?.real ?? 0), 0),
                ppto: detailRows.reduce((a, r) => a + (r.vals[gi]?.ppto ?? 0), 0),
              }));
              return (
                <tr className="pnl__grandtotal">
                  <td className="strong">{grandTotal}</td>
                  {gt.map((v, gi) => <Fragment key={gi}>{cells(v, true)}</Fragment>)}
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
      <div className="pnl__note">Valores en {unit}.</div>
    </div>
  );
}

// P&L agrupado por Nivel 1 (Sección), Real vs Ppto vs Δ. Cada grupo se puede
// colapsar/expandir con clic en su encabezado (el subtotal queda visible).
// `result` (opcional): línea final de resultado (p.ej. Utilidad = Ingresos − Egresos).
export function HoldingPnL({ title, rows, unit = "UF", result }: {
  title: string; rows: PnLRow[]; unit?: string;
  result?: { label: string; real: number | null; ppto: number | null };
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (g: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });

  const groups = Array.from(new Set(rows.map((r) => r.nivel1)))
    .sort((a, b) => Math.min(...rows.filter((r) => r.nivel1 === a).map((r) => r.indice))
                  - Math.min(...rows.filter((r) => r.nivel1 === b).map((r) => r.indice)));
  const fmtD = (r: number | null, p: number | null) =>
    r != null && p != null ? r - p : null;
  const dColor = (d: number | null) => (d == null ? undefined : d >= 0 ? "var(--pos)" : "var(--neg)");

  const collapsible = groups.filter((g) => rows.some((r) => r.nivel1 === g && r.indice <= 2)).length > 0;
  const allCollapsed = collapsed.size >= groups.length && groups.length > 0;
  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(groups));

  return (
    <div className="card pivot">
      <div className="card__title">
        <span>{title}</span>
        {collapsible && (
          <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={toggleAll}>
            {allCollapsed ? "Expandir todo" : "Colapsar todo"}
          </Button>
        )}
      </div>
      <div className="pivot__scroll">
        <table className="pivot__table">
          <thead>
            <tr><th>Cuenta</th><th className="num">Real</th><th className="num">Ppto</th><th className="num">Δ</th></tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const gr = rows.filter((r) => r.nivel1 === g);
              const detail = gr.filter((r) => r.indice <= 2); // Ingresos / Gastos
              const totals = gr.filter((r) => r.indice >= 4); // EBITDA / Resultado
              const sr = detail.reduce((a, r) => a + (r.real ?? 0), 0);
              const sp = detail.reduce((a, r) => a + (r.ppto ?? 0), 0);
              const isCol = collapsed.has(g);
              return (
                <Fragment key={g}>
                  {detail.length > 0 && (
                    <tr className="pnl__group pnl__group--toggle" onClick={() => toggle(g)}>
                      <td colSpan={4}>
                        <span className="pnl__chev">{isCol ? "▸" : "▾"}</span>{g.trim()}
                      </td>
                    </tr>
                  )}
                  {!isCol && detail.map((r) => {
                    const d = fmtD(r.real, r.ppto);
                    return (
                      <tr key={g + r.nivel2}>
                        <td style={{ paddingLeft: 26 }}>{r.nivel2}</td>
                        <td className="num">{fmtNum(r.real, 0)}</td>
                        <td className="num">{fmtNum(r.ppto, 0)}</td>
                        <td className="num" style={{ color: dColor(d) }}>{fmtNum(d, 0)}</td>
                      </tr>
                    );
                  })}
                  {detail.length > 0 && (
                    <tr className="pnl__subtotal">
                      <td>Total {g.trim()}</td>
                      <td className="num strong">{fmtNum(sr, 0)}</td>
                      <td className="num strong">{fmtNum(sp, 0)}</td>
                      <td className="num strong" style={{ color: dColor(sr - sp) }}>{fmtNum(sr - sp, 0)}</td>
                    </tr>
                  )}
                  {totals.map((r) => (
                    <tr key={g + r.nivel2 + "_x"} className="pnl__result">
                      <td className="strong">{r.nivel2}</td>
                      <td className="num strong">{fmtNum(r.real, 0)}</td>
                      <td className="num strong">{fmtNum(r.ppto, 0)}</td>
                      <td className="num strong" style={{ color: dColor(fmtD(r.real, r.ppto)) }}>{fmtNum(fmtD(r.real, r.ppto), 0)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {result && (
              <tr className="pnl__grandtotal">
                <td className="strong">{result.label}</td>
                <td className="num strong">{fmtNum(result.real, 0)}</td>
                <td className="num strong">{fmtNum(result.ppto, 0)}</td>
                <td className="num strong" style={{ color: dColor(fmtD(result.real, result.ppto)) }}>
                  {fmtNum(fmtD(result.real, result.ppto), 0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pnl__note">Valores en {unit}.</div>
    </div>
  );
}

import { Row, num } from "../api";
import { fmtUF } from "../format";

// Tabla pivote custom (sin librerías): filas × columnas, suma del valor.
// rowTotals agrega una columna "Total" al final (suma de la fila).
// rowLabel: encabezado de la 1ª columna (por defecto el nombre del campo).
// fmt: formateador de valores (por defecto UF).
export function PivotTable({
  title,
  rows,
  rowField,
  colField,
  valueField,
  rowTotals = false,
  rowLabel,
  fmt = fmtUF,
}: {
  title: string;
  rows: Row[];
  rowField: string;
  colField: string;
  valueField: string;
  rowTotals?: boolean;
  rowLabel?: string;
  fmt?: (v: number | null | undefined) => string;
}) {
  const colKeys = Array.from(
    new Set(rows.map((r) => String(r[colField] ?? "")).filter(Boolean)),
  ).sort();
  const rowKeys = Array.from(
    new Set(rows.map((r) => String(r[rowField] ?? "")).filter(Boolean)),
  ).sort();

  const cell = (rk: string, ck: string): number =>
    rows
      .filter((r) => String(r[rowField]) === rk && String(r[colField]) === ck)
      .reduce((a, r) => a + (num(r[valueField]) ?? 0), 0);

  const colTotal = (ck: string) => rowKeys.reduce((a, rk) => a + cell(rk, ck), 0);
  const rowTotal = (rk: string) => colKeys.reduce((a, ck) => a + cell(rk, ck), 0);
  const grandTotal = colKeys.reduce((a, ck) => a + colTotal(ck), 0);

  return (
    <div className="card pivot">
      <div className="card__title">{title}</div>
      <div className="pivot__scroll">
        <table className="pivot__table">
          <thead>
            <tr>
              <th>{rowLabel ?? rowField}</th>
              {colKeys.map((c) => <th key={c} className="num">{c}</th>)}
              {rowTotals && <th className="num strong">Total</th>}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rk) => (
              <tr key={rk}>
                <td>{rk}</td>
                {colKeys.map((ck) => <td key={ck} className="num">{fmt(cell(rk, ck))}</td>)}
                {rowTotals && <td className="num strong">{fmt(rowTotal(rk))}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="strong">Total</td>
              {colKeys.map((ck) => <td key={ck} className="num strong">{fmt(colTotal(ck))}</td>)}
              {rowTotals && <td className="num strong">{fmt(grandTotal)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

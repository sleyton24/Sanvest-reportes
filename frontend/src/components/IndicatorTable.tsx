import { fmtNum } from "../format";

const dColor = (d: number | null) => (d == null ? undefined : d >= 0 ? "var(--pos)" : "var(--neg)");

export interface IndicatorRow {
  item: string;
  real: number | null;
  ppto: number | null;
}

// Indicadores con Mensual + YTD en UNA sola tabla (Item | Mensual R/P/Δ | YTD R/P/Δ).
// dec: decimales de los valores (0 para UF enteras, 3 para tarifas UF/m²).
export interface IndicatorRowMY {
  item: string;
  real: number | null; ppto: number | null;          // mensual
  ytdReal: number | null; ytdPpto: number | null;     // acumulado del año
}
export function IndicatorTableMY({ title, rows, dec = 0 }: { title: string; rows: IndicatorRowMY[]; dec?: number }) {
  const d = (r: number | null, p: number | null) => (r != null && p != null ? r - p : null);
  return (
    <div className="card pivot">
      <div className="card__title">{title}</div>
      <div className="pivot__scroll">
        <table className="pivot__table">
          <thead>
            <tr>
              <th rowSpan={2}>Item</th>
              <th colSpan={3} className="num grp">Mensual</th>
              <th colSpan={3} className="num grp">YTD</th>
            </tr>
            <tr>
              <th className="num grp">Real</th><th className="num">Ppto</th><th className="num">Δ</th>
              <th className="num grp">Real</th><th className="num">Ppto</th><th className="num">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dm = d(r.real, r.ppto), dy = d(r.ytdReal, r.ytdPpto);
              return (
                <tr key={r.item}>
                  <td>{r.item}</td>
                  <td className="num grp">{fmtNum(r.real, dec)}</td>
                  <td className="num">{fmtNum(r.ppto, dec)}</td>
                  <td className="num" style={{ color: dColor(dm) }}>{fmtNum(dm, dec)}</td>
                  <td className="num grp">{fmtNum(r.ytdReal, dec)}</td>
                  <td className="num">{fmtNum(r.ytdPpto, dec)}</td>
                  <td className="num" style={{ color: dColor(dy) }}>{fmtNum(dy, dec)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Tabla de indicadores: filas = Item, columnas = Real / Ppto / Δ (custom, sin libs).
export function IndicatorTable({ title, rows }: { title: string; rows: IndicatorRow[] }) {
  return (
    <div className="card pivot">
      <div className="card__title">{title}</div>
      <div className="pivot__scroll">
        <table className="pivot__table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Real</th>
              <th className="num">Ppto</th>
              <th className="num">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = r.real != null && r.ppto != null ? r.real - r.ppto : null;
              return (
                <tr key={r.item}>
                  <td>{r.item}</td>
                  <td className="num">{fmtNum(r.real, 0)}</td>
                  <td className="num">{fmtNum(r.ppto, 0)}</td>
                  <td className="num" style={{ color: d == null ? undefined : d >= 0 ? "#2f7d32" : "#b0413e" }}>
                    {fmtNum(d, 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

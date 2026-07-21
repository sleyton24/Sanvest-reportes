import { CardSpec, Fmt } from "../config";
import { fmtCLP, fmtInt, fmtNum, fmtPct, fmtUF } from "../format";

const FMT: Record<Fmt, (v: number | null) => string> = {
  uf: fmtUF,
  int: fmtInt,
  pct: (v) => fmtPct(v, 1),
  num: (v) => fmtNum(v, 2),
  num3: (v) => fmtNum(v, 3),
  muf: (v) => fmtNum(v == null ? null : v / 1e6, 2),
  clp: fmtCLP,
};

export function KpiCard({
  spec,
  values,
}: {
  spec: CardSpec;
  values: (number | null)[];
}) {
  return (
    <div className="card kpi">
      <div className="card__title">{spec.title}</div>
      <div className="kpi__grid">
        {spec.fields.map((f, i) => {
          // accent: verde si el valor es >= 0, rojo si es negativo
          const v = values[i];
          const color = f.accent && v != null ? (v >= 0 ? "var(--pos)" : "var(--neg)") : undefined;
          return (
            <div className="kpi__item" key={f.label}>
              <div className="kpi__value" style={color ? { color } : undefined}>{FMT[f.fmt](v)}</div>
              <div className="kpi__label">{f.label}</div>
              {f.sub && <div className="kpi__sub">{f.sub}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

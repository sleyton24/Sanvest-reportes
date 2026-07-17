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
        {spec.fields.map((f, i) => (
          <div className="kpi__item" key={f.label}>
            <div className="kpi__value">{FMT[f.fmt](values[i])}</div>
            <div className="kpi__label">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

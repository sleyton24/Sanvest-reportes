import { fmtPct } from "../format";

// Gauge de arco semicircular (SVG propio, sin dependencias). value en 0..1.
// target (opcional) dibuja la marca de PPTO/objetivo sobre el arco (TargetValue del PBI).
// sub (opcional) agrega una línea de texto bajo el gauge (p.ej. "114 / 143 uds" o "YTD 76,2%").
// colorByTarget: colorea el número según el PPTO (verde si lo alcanza/supera, rojo si
//   queda por debajo) y rotula "PPTO" y su marca en blanco. Úsese donde más alto = mejor (OCC).
export function Gauge({ title, value, target, sub, colorByTarget = false }: {
  title: string; value: number | null; target?: number | null; sub?: string | null;
  colorByTarget?: boolean;
}) {
  const has = value != null && !isNaN(value);
  const v = has ? Math.max(0, Math.min(1, value as number)) : 0;
  const hasT = target != null && !isNaN(target);
  const t = hasT ? Math.max(0, Math.min(1, target as number)) : 0;
  const cx = 110, cy = 110, r = 88;

  // Coloreado dinámico vs PPTO: solo si hay real y meta. El número va verde cuando el
  // real alcanza/supera el PPTO y rojo cuando queda por debajo. El PPTO y su marca pasan
  // a blanco para no competir con el rojo del "bajo PPTO".
  const dyn = colorByTarget && has && hasT;
  const pctFill = dyn ? ((value as number) >= (target as number) ? "var(--pos)" : "var(--neg)") : undefined;
  const markColor = colorByTarget ? "var(--strong)" : "#b0413e";

  // frac 0 -> 180° (izquierda) ; frac 1 -> 0° (derecha) ; arco por arriba
  const pt = (frac: number): [number, number] => {
    const a = Math.PI * (1 - frac);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  // El arco de un gauge semicircular nunca supera 180°, así que largeArcFlag=0
  // siempre; sweepFlag=1 lo dibuja por arriba (izquierda -> derecha).
  const arc = (f0: number, f1: number): string => {
    const [x0, y0] = pt(f0);
    const [x1, y1] = pt(f1);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  return (
    <div className="gauge card">
      <div className="card__title">{title}</div>
      <svg viewBox="0 0 220 132" className="gauge__svg">
        <path d={arc(0, 1)} className="gauge__track" />
        {has && v > 0.001 && <path d={arc(0, v)} className="gauge__value" />}
        {hasT && (() => {
          const [xi, yi] = pt(t), a = Math.PI * (1 - t);
          const xo = cx + (r + 9) * Math.cos(a), yo = cy - (r + 9) * Math.sin(a);
          return <line x1={xi} y1={yi} x2={xo} y2={yo} stroke={markColor} strokeWidth={2.5} />;
        })()}
        <text x={cx} y={cy - 6} className="gauge__pct"
          style={pctFill ? { fill: pctFill } : undefined}>{fmtPct(value, 1)}</text>
        {hasT && <text x={cx} y={cy + 14} className="gauge__target" textAnchor="middle"
          fontSize={11} fill={markColor}>PPTO {fmtPct(target, 1)}</text>}
      </svg>
      {sub && <div className="gauge__sub">{sub}</div>}
    </div>
  );
}

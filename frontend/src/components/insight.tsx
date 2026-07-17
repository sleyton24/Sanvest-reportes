// Componentes de storytelling (diseño "Veredicto del Mes"). Ver docs/diseno_app.md.
import { ReactNode } from "react";
import { DeltaMode, GoodWhen, Metric, Tone, buildInsight, deltaText, toneOf } from "../insight";

const ARROW: Record<Tone, string> = { pos: "▲", neg: "▼", warn: "→", na: "" };

// pill de variación vs una referencia (Ppto o LY), color por estado de negocio
export function StatusBadge({ real, base, goodWhen = "higher", mode = "pct", band, suffix = "", fmt }: {
  real: number | null; base: number | null | undefined;
  goodWhen?: GoodWhen; mode?: DeltaMode; band?: number; suffix?: string; fmt?: (v: number | null) => string;
}) {
  const t = toneOf(real, base, goodWhen, mode, band);
  return (
    <span className={`delta delta--${t}`}>
      {ARROW[t] && <span className="delta__arr">{ARROW[t]}</span>}
      {deltaText(real, base, mode, fmt)}{suffix}
    </span>
  );
}

// mini-línea de tendencia (SVG propio, sin libs). Trazo en --accent; ppto punteado.
export function Sparkline({ points, ppto, width = 132, height = 34 }: {
  points: (number | null)[]; ppto?: (number | null)[]; width?: number; height?: number;
}) {
  const all = [...points, ...(ppto ?? [])].filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (all.length < 2) return <svg className="spark" width={width} height={height} />;
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || Math.abs(hi) || 1;
  const pad = 3;
  const xy = (arr: (number | null)[]) => arr.map((v, i) => {
    if (v == null || isNaN(v)) return null;
    const x = pad + (i / Math.max(1, arr.length - 1)) * (width - 2 * pad);
    const y = height - pad - ((v - lo) / span) * (height - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).filter(Boolean).join(" ");
  const last = points.map((v, i) => [v, i] as const).filter(([v]) => v != null).pop();
  const lx = last ? pad + (last[1] / Math.max(1, points.length - 1)) * (width - 2 * pad) : 0;
  const ly = last && last[0] != null ? height - pad - ((last[0] - lo) / span) * (height - 2 * pad) : 0;
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {ppto && <polyline className="spark__ppto" points={xy(ppto)} />}
      <polyline className="spark__line" points={xy(points)} />
      {last && <circle className="spark__dot" cx={lx} cy={ly} r={2.6} />}
    </svg>
  );
}

// KPI ejecutivo: número grande + Δ vs Ppto + sub-línea vs LY + sparkline
export function KpiHero({ m, trend, trendPpto }: {
  m: Metric; trend?: (number | null)[]; trendPpto?: (number | null)[];
}) {
  return (
    <div className="card kpi-hero">
      <div className="kpi-hero__title">{m.label}</div>
      <div className="kpi-hero__value">{m.fmt(m.real)}</div>
      <div className="kpi-hero__row">
        <StatusBadge real={m.real} base={m.ppto} goodWhen={m.goodWhen} mode={m.mode} band={m.band} fmt={m.fmt} suffix=" vs Ppto" />
      </div>
      {m.ly != null && (
        <div className="kpi-hero__ly">vs año ant. {deltaText(m.real, m.ly, m.mode ?? "pct", m.fmt)}</div>
      )}
      {trend && <Sparkline points={trend} ppto={trendPpto} />}
    </div>
  );
}

// banda de veredicto (titular del mes)
export function HeaderInsight({ tone, headline, detail }: { tone: Tone; headline: string; detail?: string }) {
  return (
    <div className={`verdict verdict--${tone}`}>
      <div className="verdict__headline">{headline}</div>
      {detail && <div className="verdict__detail">{detail}</div>}
    </div>
  );
}

export function SectionIntro({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="section-intro">
      <div className="section-intro__title">{title}</div>
      <div className="section-intro__lead">{lead}</div>
    </div>
  );
}

// chip de insight (frase corta) — autogenerado desde una métrica
export function InsightChip({ m }: { m: Metric }) {
  const { tone, text } = buildInsight(m);
  return <span className={`chip chip--${tone}`}>{text}</span>;
}

// sección densa colapsable (detalle para analista), cerrada por defecto
export function CollapsibleSection({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: ReactNode;
}) {
  return (
    <details className="collapsible" open={defaultOpen}>
      <summary className="collapsible__summary">{title}</summary>
      <div className="collapsible__body">{children}</div>
    </details>
  );
}

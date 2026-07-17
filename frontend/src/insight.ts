// Storytelling determinista: convierte números (real vs ppto/LY) en estado de
// negocio (semáforo) y frases en lenguaje natural. Sin IA en runtime; mismo
// input → mismo texto, auditable y reconciliable con el .pbix.
import { fmtPct } from "./format";

export type GoodWhen = "higher" | "lower";
export type DeltaMode = "pct" | "pp" | "abs";
export type Tone = "pos" | "warn" | "neg" | "na";

export interface Metric {
  label: string;
  real: number | null;
  ppto: number | null;
  ly?: number | null;
  fmt: (v: number | null) => string;
  goodWhen?: GoodWhen;     // 'lower' para costos/gastos/deuda
  mode?: DeltaMode;        // 'pp' para tasas (ocupación); 'pct' por defecto
  band?: number;           // banda ámbar (def. 0.05; tasas 0.03)
  anchor?: boolean;        // métrica ancla del veredicto (EBITDA/Resultado)
}

const n = (v: number | null | undefined): number | null =>
  typeof v === "number" && !isNaN(v) ? v : null;

export function deltaOf(real: number | null, base: number | null | undefined, mode: DeltaMode = "pct") {
  const r = n(real), b = n(base);
  if (r == null || b == null) return { abs: null as number | null, rel: null as number | null };
  const abs = r - b;
  if (mode === "pct") return { abs, rel: b === 0 ? null : abs / Math.abs(b) };
  return { abs, rel: abs };  // pp / abs usan el delta directo
}

export function toneOf(real: number | null, base: number | null | undefined,
                       goodWhen: GoodWhen = "higher", mode: DeltaMode = "pct", band?: number): Tone {
  const { abs, rel } = deltaOf(real, base, mode);
  if (abs == null || (mode === "pct" && rel == null)) return "na";
  const good = goodWhen === "higher" ? abs >= 0 : abs <= 0;
  const bnd = band ?? (mode === "pp" ? 0.03 : 0.05);
  const mag = mode === "pct" ? Math.abs(rel as number) : Math.abs(abs);
  if (mag <= bnd) return "warn";
  return good ? "pos" : "neg";
}

// texto del delta: "+12%", "−23%", "+0,9 pp", "+1.234 UF"
export function deltaText(real: number | null, base: number | null | undefined,
                          mode: DeltaMode = "pct", fmt?: (v: number | null) => string): string {
  const { abs, rel } = deltaOf(real, base, mode);
  if (abs == null) return "—";
  const sign = (x: number) => (x >= 0 ? "+" : "−");
  if (mode === "pp") return `${sign(abs)}${fmtPct(Math.abs(abs), 1)} pp`.replace("%", "");
  if (mode === "abs") return `${sign(abs)}${fmt ? fmt(Math.abs(abs)) : Math.abs(abs).toFixed(0)}`;
  if (rel == null) return "—";
  return `${sign(rel)}${fmtPct(Math.abs(rel), 0)}`;
}

const toneOfM = (m: Metric, base?: number | null) =>
  toneOf(m.real, base === undefined ? m.ppto : base, m.goodWhen ?? "higher", m.mode ?? "pct", m.band);

// frase de UNA métrica vs Ppto
export function buildInsight(m: Metric): { tone: Tone; text: string } {
  const t = toneOfM(m);
  if (t === "na") return { tone: "na", text: `${m.label}: ${m.fmt(m.real)}` };
  const verb = t === "warn" ? "en línea con" : t === "pos" ? "sobre" : "bajo";
  const dt = deltaText(m.real, m.ppto, m.mode ?? "pct", m.fmt);
  return { tone: t, text: `${m.label} ${m.fmt(m.real)}, ${dt} ${verb} Ppto` };
}

// veredicto del mes: titular (ancla) + causa (mayor desviación desfavorable)
export function buildVerdict(input: { period: string; metrics: Metric[] }):
  { tone: Exclude<Tone, "na">; headline: string; detail: string } {
  const data = input.metrics.filter((m) => n(m.real) != null);
  if (!data.length) return { tone: "warn", headline: "Datos del mes en proceso.", detail: "" };
  const anchor = data.find((m) => m.anchor && n(m.ppto) != null)
    ?? data.find((m) => n(m.ppto) != null) ?? data[0];
  const at = toneOfM(anchor);
  const dt = deltaText(anchor.real, anchor.ppto, anchor.mode ?? "pct", anchor.fmt).replace(/[+−-]/g, "");
  const verb = at === "warn" ? "en línea con" : at === "pos" ? "sobre" : "bajo";
  const headline = at === "na"
    ? `${input.period}: ${anchor.label} ${anchor.fmt(anchor.real)}`
    : `${input.period} cerró ${dt} ${verb} presupuesto en ${anchor.label}`;

  const others = data.filter((m) => m !== anchor && n(m.ppto) != null);
  const unfav = others
    .map((m) => ({ m, t: toneOfM(m), d: deltaOf(m.real, m.ppto, m.mode ?? "pct") }))
    .filter((x) => x.t === "neg" && x.d.rel != null)
    .sort((a, b) => Math.abs(b.d.rel as number) - Math.abs(a.d.rel as number));
  let detail = "";
  if (unfav.length) {
    const c = unfav[0];
    const dir = (c.m.goodWhen ?? "higher") === "higher" ? "menores" : "mayores";
    detail = `Principalmente por ${dir} ${c.m.label} (${deltaText(c.m.real, c.m.ppto, c.m.mode ?? "pct", c.m.fmt)} vs Ppto).`;
  } else if (at === "pos") {
    detail = "Mejor que el plan en las principales líneas.";
  }
  return { tone: at === "na" ? "warn" : at, headline, detail };
}

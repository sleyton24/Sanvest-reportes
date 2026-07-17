import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Funnel as RFunnel, FunnelChart, LabelList,
  Legend, Line, Pie, PieChart as RPieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PeriodPoint } from "../../data";
import { axisCompact, fmtNum, fmtPct, fmtPeriodo } from "../../format";
import { usePrintLabels } from "../../print";

// Paleta de marca Sanvest sobre navy: verde corporativo + colores de unidad.
const COLORS = ["#A8C813", "#3796AA", "#EF731B", "#FACF22", "#D83252", "#8aa0b8"];

// tematización para fondo claro crema (ejes/grilla/leyenda oscuros; tooltip navy
// flotante que sigue leyéndose bien sobre el dashboard claro)
const AXIS_TICK = { fill: "#5f6b7d", fontSize: 11 };
const AXIS_LINE = "rgba(15,30,54,0.22)";
const GRID = "rgba(15,30,54,0.10)";
const TOOLTIP = {
  contentStyle: { background: "#0b1729", border: "1px solid rgba(15,30,54,0.30)", borderRadius: 8 },
  labelStyle: { color: "#c7d4e2", marginBottom: 4 },
  itemStyle: { color: "#eaf0f7" },
  cursor: { fill: "rgba(15,30,54,0.06)" },
} as const;
const LEGEND = { wrapperStyle: { color: "#5f6b7d", fontSize: 12 } } as const;
// marcadores de línea: punto pequeño del color de la serie; al hacer hover, punto
// mayor con anillo navy para que resalte sobre el fondo oscuro.
const lineDot = (color: string) => ({ r: 2.5, fill: color, stroke: color, strokeWidth: 0 });
const lineActiveDot = (color: string) => ({ r: 5, fill: color, stroke: "#0b1729", strokeWidth: 2 });
// eje X: todos los meses visibles (interval 0); fuente compacta para que quepan
const XPROPS = { dataKey: "iso", tickFormatter: fmtPeriodo, tick: { ...AXIS_TICK, fontSize: 10 },
  stroke: AXIS_LINE, interval: 0 as const };

type Fmt = (v: number) => string;
const DEFAULT_TIP: Fmt = (v) => fmtNum(v, 0);

// Etiquetas de datos para el reporte PDF (usePrintLabels): usan el mismo formato
// que el tooltip de cada serie y no rotulan meses vacíos ni ceros (devuelven ""
// para null/NaN/0 — un 0 rotulado en cada hueco solo mete ruido). Color claro.
const LBL_FILL = "#3a4658";
const mkLabel = (fmt: Fmt) => (v: any): string =>
  v == null || (typeof v === "number" && (isNaN(v) || v === 0)) ? "" : fmt(v);
// sin animación: el PDF captura ~400ms tras activar etiquetas y recharts oculta
// los LabelList hasta terminar de animar (Line ~1500ms) → saldrían sin rótulos
const NOANIM = { isAnimationActive: false } as const;

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card chart">
      <div className="card__title">{title}</div>
      <div className="chart__body">
        <ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer>
      </div>
    </div>
  );
}

// formatter de tooltip que respeta unidad por serie (o una sola para todas)
const mkTip = (fmt: Fmt | Record<string, Fmt>) =>
  (v: number, n: string): [string, string] => {
    const f = typeof fmt === "function" ? fmt : (fmt[n] ?? DEFAULT_TIP);
    return [v == null ? "—" : f(v), n];
  };

export function StackedColumnChart({ title, data, series, tipFmt = DEFAULT_TIP, tickFmt = axisCompact }: {
  title: string; data: PeriodPoint[]; series: { key: string; label: string }[];
  tipFmt?: Fmt; tickFmt?: Fmt;
}) {
  const labels = usePrintLabels();
  return (
    <Frame title={title}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis {...XPROPS} />
        <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} stroke={AXIS_LINE} width={56} />
        <Tooltip formatter={mkTip(tipFmt)} labelFormatter={fmtPeriodo} {...TOOLTIP} />
        <Legend {...LEGEND} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={COLORS[i % COLORS.length]} {...NOANIM}>
            {/* center: en "top" la etiqueta cae justo en la frontera con el segmento siguiente */}
            {labels && <LabelList dataKey={s.key} position="center" fill="#fff" fontSize={9} formatter={mkLabel(tipFmt)} />}
          </Bar>
        ))}
      </BarChart>
    </Frame>
  );
}

export function ClusteredColumnChart({ title, data, series, tipFmt = DEFAULT_TIP, tickFmt = axisCompact }: {
  title: string; data: PeriodPoint[]; series: { key: string; label: string }[];
  tipFmt?: Fmt; tickFmt?: Fmt;
}) {
  const labels = usePrintLabels();
  return (
    <Frame title={title}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis {...XPROPS} />
        <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} stroke={AXIS_LINE} width={56} />
        <Tooltip formatter={mkTip(tipFmt)} labelFormatter={fmtPeriodo} {...TOOLTIP} />
        <Legend {...LEGEND} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} {...NOANIM}>
            {labels && <LabelList dataKey={s.key} position="top" fill={LBL_FILL} fontSize={9} formatter={mkLabel(tipFmt)} />}
          </Bar>
        ))}
      </BarChart>
    </Frame>
  );
}

// N barras + 1 línea, todas en la misma unidad (tipFmt único)
export function BarsLineChart({ title, data, bars, line, tipFmt = DEFAULT_TIP, tickFmt = axisCompact }: {
  title: string; data: PeriodPoint[];
  bars: { key: string; label: string }[]; line: { key: string; label: string };
  tipFmt?: Fmt; tickFmt?: Fmt;
}) {
  const labels = usePrintLabels();
  return (
    <Frame title={title}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis {...XPROPS} />
        <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} stroke={AXIS_LINE} width={56} />
        <Tooltip formatter={mkTip(tipFmt)} labelFormatter={fmtPeriodo} {...TOOLTIP} />
        <Legend {...LEGEND} />
        {bars.map((b, i) => (
          <Bar key={b.key} dataKey={b.key} name={b.label} fill={COLORS[i % COLORS.length]} {...NOANIM}>
            {labels && <LabelList dataKey={b.key} position="top" fill={LBL_FILL} fontSize={9} formatter={mkLabel(tipFmt)} />}
          </Bar>
        ))}
        <Line type="monotone" dataKey={line.key} name={line.label}
          stroke={COLORS[2]} strokeWidth={2.5} connectNulls {...NOANIM}
          dot={lineDot(COLORS[2])} activeDot={lineActiveDot(COLORS[2])}>
          {labels && <LabelList dataKey={line.key} position="top" fill={LBL_FILL} fontSize={9} formatter={mkLabel(tipFmt)} />}
        </Line>
      </ComposedChart>
    </Frame>
  );
}

// "nice number" — redondea un rango a 1/2/5 × 10^k
function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range || 1));
  const f = (range || 1) / Math.pow(10, exp);
  const nf = round
    ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10)
    : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
  return nf * Math.pow(10, exp);
}

// escala Y ajustada al rango de los datos con ticks limpios — para gráficos de
// LÍNEA, donde anclar en 0 aplasta la variación (ocupación 94–98%, ratios, UF/m²).
// Las BARRAS conservan el 0 (no se usa aquí).
function lineScale(data: PeriodPoint[], keys: string[], includeValue?: number): { domain: any; ticks?: number[] } {
  const vals = data.flatMap((d) =>
    keys.map((k) => (d as any)[k]).filter((v): v is number => typeof v === "number" && !isNaN(v)));
  if (!vals.length) return { domain: [0, "auto"] };
  let lo = Math.min(...vals), hi = Math.max(...vals);
  // referencia obligada dentro del eje (p.ej. 1,0× en ratios de cobertura)
  if (includeValue != null) { lo = Math.min(lo, includeValue); hi = Math.max(hi, includeValue); }
  if (lo === hi) { const e = Math.abs(lo) * 0.1 || 1; lo -= e; hi += e; }
  // step directo sobre el rango crudo (loose ticks de Heckbert). Redondear el
  // rango ANTES casi duplicaba el domain (PARK: datos 0,85–1,89 → eje 0,5–2,0
  // con solo 4 ticks) y dejaba bandas muertas arriba/abajo.
  const step = niceNum((hi - lo) / 4, true);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(+t.toFixed(10));
  return { domain: [min, max], ticks };
}

export function MultiLineChart({ title, data, lines, tipFmt = DEFAULT_TIP, tickFmt = axisCompact, refValue }: {
  title: string; data: PeriodPoint[]; lines: { key: string; label: string }[];
  tipFmt?: Fmt; tickFmt?: Fmt;
  refValue?: number;   // línea de referencia (p.ej. 1,0 en EBITDA/Cuota) — se incluye en el eje
}) {
  const labels = usePrintLabels();
  const sc = lineScale(data, lines.map((l) => l.key), refValue);
  return (
    <Frame title={title}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis {...XPROPS} />
        <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} stroke={AXIS_LINE} width={56}
          domain={sc.domain} ticks={sc.ticks} allowDecimals />
        {refValue != null && (
          <ReferenceLine y={refValue} stroke="#D83252" strokeDasharray="4 3" strokeWidth={1.5} />
        )}
        <Tooltip formatter={mkTip(tipFmt)} labelFormatter={fmtPeriodo} {...TOOLTIP} />
        <Legend {...LEGEND} />
        {lines.map((l, i) => {
          const c = COLORS[i % COLORS.length];
          return (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.label}
              stroke={c} strokeWidth={2.5} connectNulls {...NOANIM} dot={lineDot(c)} activeDot={lineActiveDot(c)}>
              {labels && <LabelList dataKey={l.key} position="top" fill={LBL_FILL} fontSize={9} formatter={mkLabel(tipFmt)} />}
            </Line>
          );
        })}
      </ComposedChart>
    </Frame>
  );
}

// 1 barra (Real) + N líneas (Proy/PPTO), misma unidad — combo tipo ICEMM
export function ColumnLinesChart({ title, data, bar, lines, tipFmt = DEFAULT_TIP, tickFmt = axisCompact }: {
  title: string; data: PeriodPoint[];
  bar: { key: string; label: string }; lines: { key: string; label: string }[];
  tipFmt?: Fmt; tickFmt?: Fmt;
}) {
  const labels = usePrintLabels();
  return (
    <Frame title={title}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis {...XPROPS} />
        <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} stroke={AXIS_LINE} width={56} />
        <Tooltip formatter={mkTip(tipFmt)} labelFormatter={fmtPeriodo} {...TOOLTIP} />
        <Legend {...LEGEND} />
        <Bar dataKey={bar.key} name={bar.label} fill={COLORS[0]} {...NOANIM}>
          {labels && <LabelList dataKey={bar.key} position="top" fill={LBL_FILL} fontSize={9} formatter={mkLabel(tipFmt)} />}
        </Bar>
        {lines.map((l, i) => {
          const c = COLORS[(i + 2) % COLORS.length];
          return (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.label}
              stroke={c} strokeWidth={2.5} connectNulls {...NOANIM} dot={lineDot(c)} activeDot={lineActiveDot(c)}>
              {labels && <LabelList dataKey={l.key} position="top" fill={LBL_FILL} fontSize={9} formatter={mkLabel(tipFmt)} />}
            </Line>
          );
        })}
      </ComposedChart>
    </Frame>
  );
}

// combo con DOS unidades: barra (eje izq) y línea (eje der), cada una su formato
export function ComboChart({ title, data, bar, line, barFmt = DEFAULT_TIP, lineFmt = DEFAULT_TIP, leftTick = axisCompact, rightTick = axisCompact, rightMax }: {
  title: string; data: PeriodPoint[];
  bar: { key: string; label: string }; line: { key: string; label: string };
  barFmt?: Fmt; lineFmt?: Fmt; leftTick?: Fmt; rightTick?: Fmt; rightMax?: number;
}) {
  // Ambos ejes anclados en 0 para mostrar magnitud real. Si se pasa `rightMax` (p. ej.
  // el total de unidades), la línea (acumulado) se escala 0→total, así su altura = el
  // % de avance y queda coherente con el gauge. Las barras (mensual) van en el eje izq.
  const labels = usePrintLabels();
  return (
    <Frame title={title}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis {...XPROPS} />
        <YAxis yAxisId="l" tickFormatter={leftTick} tick={AXIS_TICK} stroke={AXIS_LINE} width={56} allowDecimals={false} />
        <YAxis yAxisId="r" orientation="right" tickFormatter={rightTick} tick={AXIS_TICK} stroke={AXIS_LINE} width={48}
          domain={rightMax != null ? [0, rightMax] : undefined} allowDecimals={false} />
        <Tooltip formatter={mkTip({ [bar.label]: barFmt, [line.label]: lineFmt })} labelFormatter={fmtPeriodo} {...TOOLTIP} />
        <Legend {...LEGEND} />
        <Bar yAxisId="l" dataKey={bar.key} name={bar.label} fill={COLORS[0]} {...NOANIM}>
          {labels && <LabelList dataKey={bar.key} position="top" fill={LBL_FILL} fontSize={9} formatter={mkLabel(barFmt)} />}
        </Bar>
        <Line yAxisId="r" type="monotone" dataKey={line.key} name={line.label}
          stroke={COLORS[2]} strokeWidth={2.5} connectNulls {...NOANIM}
          dot={lineDot(COLORS[2])} activeDot={lineActiveDot(COLORS[2])}>
          {labels && <LabelList dataKey={line.key} position="top" fill={LBL_FILL} fontSize={9} formatter={mkLabel(lineFmt)} />}
        </Line>
      </ComposedChart>
    </Frame>
  );
}

// embudo de patrimonio por unidad (ordenado desc)
export function Funnel({ title, data, valueFmt = (v) => fmtNum(v, 0) }: {
  title: string; data: { label: string; value: number }[]; valueFmt?: Fmt;
}) {
  const d = [...data].filter((x) => x.value != null).sort((a, b) => b.value - a.value)
    .map((x, i) => ({ name: x.label, value: x.value, fill: COLORS[i % COLORS.length] }));
  return (
    <Frame title={title}>
      <FunnelChart margin={{ top: 6, right: 8, bottom: 6, left: 8 }}>
        <Tooltip formatter={(v: number, _n, p: any) => [valueFmt(v), p?.payload?.name]} {...TOOLTIP} />
        <RFunnel dataKey="value" data={d} isAnimationActive={false} stroke="#0b1729">
          <LabelList position="right" dataKey="name" fill="#3a4658" fontSize={11} />
          <LabelList position="left" dataKey="value" fill="#1B2A44" fontSize={11}
            formatter={(v: number) => valueFmt(v)} />
        </RFunnel>
      </FunnelChart>
    </Frame>
  );
}

// barras horizontales: ranking por valor (positivos verde, negativos rojo).
// Maneja negativos limpio (a diferencia del embudo) y deja leer etiquetas largas.
export function HBarChart({ title, data, valueFmt = (v) => fmtNum(v, 0), total }: {
  title: string; data: { label: string; value: number }[]; valueFmt?: Fmt;
  total?: { label: string; value: number };   // barra de total (fija arriba, color azul)
}) {
  const units = [...data].filter((x) => x.value != null).sort((a, b) => b.value - a.value)
    .map((x) => ({ name: x.label, value: x.value, total: false }));
  const d = total ? [{ name: total.label, value: total.value, total: true }, ...units] : units;
  const label = (p: any) => {
    const { x, y, width, height, value } = p;
    // rótulo siempre al borde DERECHO de la barra: en negativas eso es el eje
    // cero (carril libre) — a la izquierda chocaría con el nombre de la categoría
    const right = Math.max(x, x + width) + 6;
    return (
      <text x={right} y={y + height / 2} fill="#1B2A44" fontSize={11}
        textAnchor="start" dominantBaseline="central">{valueFmt(value)}</text>
    );
  };
  return (
    <Frame title={title}>
      <BarChart layout="vertical" data={d} margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
        <XAxis type="number" tickFormatter={axisCompact} tick={AXIS_TICK} stroke={AXIS_LINE}
          domain={[(min: number) => (min < 0 ? min * 1.18 : 0), (max: number) => max * 1.12]} />
        <YAxis type="category" dataKey="name" tick={AXIS_TICK} stroke={AXIS_LINE} width={172} interval={0} />
        <Tooltip formatter={(v: number, _n, p: any) => [valueFmt(v), p?.payload?.name]} {...TOOLTIP} />
        <Bar dataKey="value" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={18}>
          {d.map((e, i) => <Cell key={i} fill={e.total ? "#3D7DF6" : e.value >= 0 ? "#A8C813" : "#D83252"} />)}
          <LabelList content={label} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

// torta de participación (% sobre el total) — % visible sobre cada gajo
export function PieChart({ title, data, valueFmt = (v) => fmtNum(v, 0) }: {
  title: string; data: { label: string; value: number }[]; valueFmt?: Fmt;
}) {
  const tot = data.reduce((a, x) => a + (x.value || 0), 0) || 1;
  const d = data.filter((x) => x.value > 0).map((x) => ({ name: x.label, value: x.value, pct: x.value / tot }));
  // % SIEMPRE visible: gajos grandes (≥5%) con el número adentro; los chicos afuera
  // con una línea guía (antes se ocultaban los <4% y no se veía, p.ej. BNV 3,1%).
  const RAD = Math.PI / 180;
  const pctLabel = (p: any) => {
    if (p.percent < 0.005) return null;   // <0,5% = ruido (casi cero)
    const cos = Math.cos(-p.midAngle * RAD), sin = Math.sin(-p.midAngle * RAD);
    if (p.percent >= 0.05) {
      const r = p.innerRadius + (p.outerRadius - p.innerRadius) / 2;
      return (
        <text x={p.cx + r * cos} y={p.cy + r * sin} fill="#fff" fontSize={12} fontWeight={700}
          textAnchor="middle" dominantBaseline="central">{fmtPct(p.percent, 0)}</text>
      );
    }
    // gajo chico: etiqueta afuera con conector
    const xe = p.cx + p.outerRadius * cos, ye = p.cy + p.outerRadius * sin;
    const xo = p.cx + (p.outerRadius + 14) * cos, yo = p.cy + (p.outerRadius + 14) * sin;
    const anchor = xo >= p.cx ? "start" : "end";
    return (
      <g>
        <line x1={xe} y1={ye} x2={xo} y2={yo} stroke="#6b7686" strokeWidth={1} />
        <text x={xo + (anchor === "start" ? 2 : -2)} y={yo} fill="#3a4658" fontSize={11} fontWeight={700}
          textAnchor={anchor} dominantBaseline="central">{fmtPct(p.percent, 1)}</text>
      </g>
    );
  };
  return (
    <Frame title={title}>
      <RPieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Tooltip formatter={(v: number, _n, p: any) => [`${valueFmt(v)} · ${fmtPct(p?.payload?.pct, 1)}`, p?.payload?.name]} {...TOOLTIP} />
        <Legend {...LEGEND} />
        <Pie data={d} dataKey="value" nameKey="name" innerRadius="42%" outerRadius="70%" paddingAngle={1}
          isAnimationActive={false} stroke="#0b1729" label={pctLabel} labelLine={false}>
          {d.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
      </RPieChart>
    </Frame>
  );
}

// cascada (waterfall): pasos acumulados; barra base transparente + delta coloreado
// Colores del waterfall (convención Power BI): Aumento=azul, Disminución=rojo,
// Total=verde, Otros=amarillo.
const WF = { increase: "#2b4c9b", decrease: "#D83252", total: "#2f9e44", otros: "#FACF22" };
const WF_LEGEND = [
  { value: "Aumento", type: "circle" as const, color: WF.increase, id: "inc" },
  { value: "Disminución", type: "circle" as const, color: WF.decrease, id: "dec" },
  { value: "Total", type: "circle" as const, color: WF.total, id: "tot" },
  { value: "Otros", type: "circle" as const, color: WF.otros, id: "otr" },
];

// tooltip de una sola línea (el ComposedChart tiene 3 series: base/val/conn, que
// duplicarían la entrada; mostramos solo categoría + valor una vez).
function WfTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const r = payload[0]?.payload;
  if (!r) return null;
  return (
    <div style={{ ...TOOLTIP.contentStyle, padding: "7px 11px" }}>
      <div style={{ ...TOOLTIP.labelStyle }}>{r.cat}</div>
      <div style={{ ...TOOLTIP.itemStyle }}>{r.label || String(r.val)}</div>
    </div>
  );
}

export function WaterfallChart({ title, data, valueFmt = (v) => fmtNum(v, 0) }: {
  title: string;
  data: { categoria: string; valor: number; tipo: "increase" | "decrease" | "total" | "otros" }[];
  valueFmt?: Fmt;
}) {
  let cum = 0;
  const d = data.map((x) => {
    if (x.tipo === "total") {
      cum = x.valor;
      return { cat: x.categoria, base: 0, val: x.valor, conn: x.valor, fill: WF.total, label: valueFmt(x.valor) };
    }
    const start = cum; cum += x.valor;
    const lbl = Math.abs(x.valor) < 1 ? "" : (x.valor >= 0 ? "+" : "−") + valueFmt(Math.abs(x.valor));
    const fill = x.tipo === "otros" ? WF.otros : x.valor >= 0 ? WF.increase : WF.decrease;
    return { cat: x.categoria, base: Math.min(start, cum), val: Math.abs(x.valor), conn: cum, fill, label: lbl };
  });
  return (
    <Frame title={title}>
      <ComposedChart data={d} margin={{ top: 22, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="cat" tick={AXIS_TICK} stroke={AXIS_LINE} interval={0} angle={-18} textAnchor="end" height={64} />
        <YAxis tickFormatter={axisCompact} tick={AXIS_TICK} stroke={AXIS_LINE} width={56} />
        <Tooltip content={<WfTip />} cursor={{ fill: "rgba(15,30,54,0.06)" }} />
        <Legend verticalAlign="top" align="left" iconSize={9} wrapperStyle={{ fontSize: 11, paddingBottom: 6 }} payload={WF_LEGEND} />
        {/* base invisible que sostiene el flotado; fillOpacity=0 (NO fill="transparent",
            que recharts a veces omite del stack y colapsa la cascada a columnas desde 0) */}
        <Bar dataKey="base" stackId="w" fill="#000" fillOpacity={0} stroke="none" isAnimationActive={false} />
        <Bar dataKey="val" stackId="w" isAnimationActive={false}>
          {d.map((e, i) => <Cell key={i} fill={e.fill} />)}
          <LabelList dataKey="label" position="top" fill="#3a4658" fontSize={10} />
        </Bar>
        {/* líneas conectoras (escalón del BI): unen el nivel acumulado entre barras */}
        <Line type="stepAfter" dataKey="conn" stroke={COLORS[5]} strokeDasharray="3 3"
              strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} legendType="none" />
      </ComposedChart>
    </Frame>
  );
}

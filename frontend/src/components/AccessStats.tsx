// Panel de estadísticas de acceso (solo admin): quién entra, cuántas veces y a
// qué unidades. KPIs + gráficos (Recharts) + detalle por usuario + bitácora.
import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AccessStats as Stats, AccessLogRow, fetchAccessStats, fetchAccessLog } from "../api";
import { UNITS } from "../units";
import { fmtNum } from "../format";
import { Button } from "./Button";

// misma paleta/tematización que los gráficos del dashboard (fondo claro crema,
// tooltip navy flotante) para que se vea homogéneo con el resto del BI.
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

// color de marca por unidad (igual que las tarjetas del menú)
const UNIT_COLOR: Record<string, string> = {
  DV: "#A8C813", RR: "#3796AA", Hotel: "#FACF22", USA: "#EF731B",
  ICEMM: "#D83252", Atempora: "#8b6fd6", Grupo: "#5566cc",
};
const UNIT_LABEL: Record<string, string> = Object.fromEntries(UNITS.map((u) => [u.id, u.label]));
const unitLabel = (id: string) => UNIT_LABEL[id] ?? id;

const RANGES = [{ d: 7, l: "7 días" }, { d: 30, l: "30 días" }, { d: 90, l: "90 días" }];

// day = "YYYY-MM-DD" -> "DD/MM"; ts ISO UTC -> fecha/hora local legible.
const dayLabel = (d: string) => { const [, m, dd] = d.split("-"); return `${dd}/${m}`; };
const tsLabel = (ts: string | null) => {
  if (!ts) return "—";
  const dt = new Date(ts);
  return isNaN(dt.getTime()) ? ts
    : dt.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};

function ChartCard({ title, height = 290, children }: { title: string; height?: number; children: React.ReactElement }) {
  return (
    <div className="card chart">
      <div className="card__title">{title}</div>
      <div className="chart__body" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export function AccessStats() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [log, setLog] = useState<AccessLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (d: number) => {
    setLoading(true); setError("");
    try {
      const [s, l] = await Promise.all([fetchAccessStats(d), fetchAccessLog(200)]);
      setStats(s); setLog(l);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(days); }, [days]);

  if (loading && !stats) return <div className="state">Cargando…</div>;
  if (error) return <div className="state state--error">{error}</div>;
  if (!stats) return null;

  const empty = stats.totals.logins === 0 && stats.totals.views === 0;

  // datos para gráficos
  const userData = stats.by_user.map((u) => ({
    name: (u.full_name?.trim() || u.username), logins: u.logins, views: u.views,
  }));
  const unitData = stats.by_unit.map((u) => ({ name: unitLabel(u.unit), id: u.unit, views: u.views, users: u.users }));

  // cruce usuario -> top unidades (para la tabla de detalle)
  const topUnits: Record<string, string> = {};
  const acc: Record<string, { unit: string; views: number }[]> = {};
  for (const r of stats.by_user_unit) (acc[r.username] ??= []).push({ unit: r.unit, views: r.views });
  for (const [u, arr] of Object.entries(acc))
    topUnits[u] = arr.sort((a, b) => b.views - a.views).slice(0, 3)
      .map((x) => `${unitLabel(x.unit)} (${x.views})`).join(" · ");

  const topUnit = stats.by_unit[0];

  return (
    <div className="access">
      <div className="access__bar">
        <span className="access__hint">
          Registra ingresos (login) y aperturas de dashboards por usuario, en la ventana seleccionada.
        </span>
        <div className="viewtoggle" style={{ marginLeft: "auto" }}>
          {RANGES.map((r) => (
            <Button key={r.d} variant="toggle" active={days === r.d} onClick={() => setDays(r.d)}>{r.l}</Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi__grid access__kpis">
        <div className="kpi__item"><div className="kpi__value">{fmtNum(stats.totals.logins, 0)}</div><div className="kpi__label">Ingresos (logins)</div></div>
        <div className="kpi__item"><div className="kpi__value">{fmtNum(stats.totals.active_users, 0)}</div><div className="kpi__label">Usuarios activos</div></div>
        <div className="kpi__item"><div className="kpi__value">{fmtNum(stats.totals.views, 0)}</div><div className="kpi__label">Aperturas de unidades</div></div>
        <div className="kpi__item">
          <div className="kpi__value">{topUnit ? unitLabel(topUnit.unit) : "—"}</div>
          <div className="kpi__label">{topUnit ? `Unidad más vista · ${fmtNum(topUnit.views, 0)}` : "Unidad más vista"}</div>
        </div>
      </div>

      {empty ? (
        <div className="state">Aún no hay accesos registrados en esta ventana. Vuelve tras algunos ingresos.</div>
      ) : (
        <>
          <div className="access__grid">
            <ChartCard title="Actividad por usuario" height={Math.max(220, userData.length * 46 + 70)}>
              <BarChart layout="vertical" data={userData} margin={{ top: 4, right: 20, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                <XAxis type="number" tick={AXIS_TICK} stroke={AXIS_LINE} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} stroke={AXIS_LINE} width={150} interval={0} />
                <Tooltip {...TOOLTIP} />
                <Legend {...LEGEND} />
                <Bar dataKey="logins" name="Ingresos" fill="#3796AA" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={13} />
                <Bar dataKey="views" name="Aperturas" fill="#A8C813" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={13} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Aperturas por unidad" height={Math.max(220, unitData.length * 46 + 70)}>
              <BarChart layout="vertical" data={unitData} margin={{ top: 4, right: 28, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                <XAxis type="number" tick={AXIS_TICK} stroke={AXIS_LINE} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} stroke={AXIS_LINE} width={150} interval={0} />
                <Tooltip formatter={(v: number, _n, p: any) => [`${fmtNum(v, 0)} aperturas · ${p?.payload?.users} usuarios`, p?.payload?.name]} {...TOOLTIP} />
                <Bar dataKey="views" name="Aperturas" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={18}>
                  {unitData.map((e) => <Cell key={e.id} fill={UNIT_COLOR[e.id] ?? "#8aa0b8"} />)}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>

          <ChartCard title="Actividad por día">
            <LineChart data={stats.by_day} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
              <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ ...AXIS_TICK, fontSize: 10 }} stroke={AXIS_LINE} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} stroke={AXIS_LINE} width={40} allowDecimals={false} />
              <Tooltip labelFormatter={(d: string) => dayLabel(String(d))} {...TOOLTIP} />
              <Legend {...LEGEND} />
              <Line type="monotone" dataKey="logins" name="Ingresos" stroke="#3796AA" strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="views" name="Aperturas" stroke="#A8C813" strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} />
            </LineChart>
          </ChartCard>

          {/* detalle por usuario */}
          <div className="card">
            <div className="card__title">Detalle por usuario</div>
            <table className="admin-table">
              <thead>
                <tr><th>Usuario</th><th>Nombre</th><th className="num">Ingresos</th><th className="num">Aperturas</th><th>Último acceso</th><th>Unidades más vistas</th></tr>
              </thead>
              <tbody>
                {stats.by_user.map((u) => (
                  <tr key={u.username}>
                    <td>{u.username}</td>
                    <td>{u.full_name || "—"}</td>
                    <td className="num">{fmtNum(u.logins, 0)}</td>
                    <td className="num">{fmtNum(u.views, 0)}</td>
                    <td>{tsLabel(u.last_seen)}</td>
                    <td>{topUnits[u.username] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* bitácora cruda */}
          <div className="card">
            <div className="card__title">Bitácora reciente ({log.length})</div>
            <div className="access__logscroll">
              <table className="admin-table">
                <thead>
                  <tr><th>Fecha / hora</th><th>Usuario</th><th>Evento</th><th>Unidad</th><th>IP</th></tr>
                </thead>
                <tbody>
                  {log.map((r, i) => (
                    <tr key={i}>
                      <td>{tsLabel(r.ts)}</td>
                      <td>{r.username}</td>
                      <td>{r.event === "login" ? "Ingreso" : "Apertura"}</td>
                      <td>{r.unit ? unitLabel(r.unit) : "—"}</td>
                      <td>{r.ip || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

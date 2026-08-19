// Panel de control del gasto del agente (solo admin): cuánto se ha consultado, con
// cuántos tokens y cuánto costó, por usuario / día / unidad / origen. Los datos los
// registra api/agent.py al terminar cada pregunta (tabla agent_usage).
import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AgentUsage as Usage, fetchAgentUsage } from "../api";
import { UNITS } from "../units";
import { fmtInt, fmtNum } from "../format";
import { Button } from "./Button";

const AXIS_TICK = { fill: "#5f6b7d", fontSize: 11 };
const GRID = "rgba(15,30,54,0.10)";
const TOOLTIP = {
  contentStyle: { background: "#FCFAF4", border: "1px solid rgba(15,30,54,0.20)",
                  borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#1B2A44", fontWeight: 700 },
} as const;
const RANGOS = [{ d: 7, l: "7 días" }, { d: 30, l: "30 días" }, { d: 90, l: "90 días" }];
const UNIT_LABEL: Record<string, string> = Object.fromEntries(UNITS.map((u) => [u.id, u.label]));

const usd = (v: number | null | undefined) =>
  v == null ? "—" : (v < 1 ? `US$ ${fmtNum(v, 3)}` : `US$ ${fmtNum(v, 2)}`);
// Los tokens se cuentan en miles: los totales llegan rápido a millones.
const tok = (v: number | null | undefined) =>
  v == null ? "—" : v >= 1000 ? `${fmtNum(v / 1000, 1)}k` : fmtInt(v);
const dia = (d: string) => { const [, m, dd] = d.split("-"); return `${dd}/${m}`; };
const fecha = (ts: string) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts
    : d.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const ORIGEN: Record<string, string> = { asistente: "Asistente del panel", etl: "Mantenedor de ETL" };

export function AgentUsage() {
  const [days, setDays] = useState(30);
  const [u, setU] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    setLoading(true); setError("");
    fetchAgentUsage(days)
      .then((d) => { if (!off) setU(d); })
      .catch((e) => { if (!off) setError((e as Error).message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [days]);

  const t = u?.totals;
  const tokensTotal = t ? t.input_tokens + t.output_tokens + t.cache_read + t.cache_write : 0;
  const promedio = t && t.preguntas ? t.costo_usd / t.preguntas : null;

  return (
    <div className="audit">
      <div className="audit__bar">
        <div className="viewtoggle">
          {RANGOS.map((r) => (
            <Button key={r.d} variant="toggle" active={days === r.d} onClick={() => setDays(r.d)}>
              {r.l}
            </Button>
          ))}
        </div>
        <div className="audit__hint">
          Gasto del asistente (y del mantenedor de ETL) por usuario. El costo es una
          <strong> estimación</strong>: tokens registrados × tarifa del modelo. Los tokens de
          caché se cobran aparte (leer el esquema cuesta ~10% de la entrada), y por eso el
          costo no es proporcional al total de tokens.
        </div>
      </div>

      {error && <div className="state state--error">{error}</div>}
      {loading ? (
        <div className="state">Cargando consumo…</div>
      ) : !u || !t?.preguntas ? (
        <div className="state">
          Todavía no hay consultas registradas en este período. El registro empieza con la
          primera pregunta al asistente después de esta actualización.
        </div>
      ) : (
        <>
          <div className="card">
            <div className="kpi__grid">
              <div className="kpi__item">
                <div className="kpi__value">{fmtInt(t.preguntas)}</div>
                <div className="kpi__label">Preguntas</div>
              </div>
              <div className="kpi__item">
                <div className="kpi__value">{usd(t.costo_usd)}</div>
                <div className="kpi__label">Costo estimado</div>
              </div>
              <div className="kpi__item">
                <div className="kpi__value">{usd(promedio)}</div>
                <div className="kpi__label">Promedio por pregunta</div>
              </div>
              <div className="kpi__item">
                <div className="kpi__value">{tok(tokensTotal)}</div>
                <div className="kpi__label">Tokens (todo incluido)</div>
              </div>
              <div className="kpi__item">
                <div className="kpi__value">{tok(t.cache_read)}</div>
                <div className="kpi__label">Leídos de caché (más baratos)</div>
              </div>
            </div>
          </div>

          <div className="card pivot">
            <div className="card__title">Por usuario</div>
            <div className="pivot__scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Usuario</th><th className="num">Preguntas</th>
                    <th className="num">Entrada</th><th className="num">Salida</th>
                    <th className="num">Caché</th><th className="num">Costo</th>
                    <th className="num">Promedio</th><th>Última</th>
                  </tr>
                </thead>
                <tbody>
                  {u.by_user.map((r) => (
                    <tr key={r.username}>
                      <td>{r.full_name || r.username}</td>
                      <td className="num">{fmtInt(r.preguntas)}</td>
                      <td className="num">{tok(r.input_tokens)}</td>
                      <td className="num">{tok(r.output_tokens)}</td>
                      <td className="num">{tok(r.cache_read + r.cache_write)}</td>
                      <td className="num">{usd(r.costo_usd)}</td>
                      <td className="num">{usd(r.preguntas ? r.costo_usd / r.preguntas : null)}</td>
                      <td>{r.last_seen ? fecha(r.last_seen) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {u.by_day.length > 1 && (
            <div className="card">
              <div className="card__title">Costo por día (US$)</div>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={u.by_day.map((d) => ({ ...d, dia: dia(d.day) }))}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="dia" tick={AXIS_TICK} />
                    <YAxis tick={AXIS_TICK} tickFormatter={(v) => fmtNum(v, 2)} />
                    <Tooltip {...TOOLTIP} formatter={(v: number) => usd(v)} />
                    <Legend wrapperStyle={{ color: "#5f6b7d", fontSize: 12 }} />
                    <Bar dataKey="costo_usd" name="Costo (US$)" fill="#3796AA" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="row row--two">
            <div className="card pivot">
              <div className="card__title">Por unidad de negocio</div>
              <div className="pivot__scroll">
                <table className="admin-table">
                  <thead><tr><th>Unidad</th><th className="num">Preguntas</th><th className="num">Costo</th></tr></thead>
                  <tbody>
                    {u.by_unit.map((r) => (
                      <tr key={r.unit}>
                        <td>{UNIT_LABEL[r.unit] ?? r.unit}</td>
                        <td className="num">{fmtInt(r.preguntas)}</td>
                        <td className="num">{usd(r.costo_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card pivot">
              <div className="card__title">Por origen</div>
              <div className="pivot__scroll">
                <table className="admin-table">
                  <thead><tr><th>Origen</th><th className="num">Preguntas</th><th className="num">Costo</th></tr></thead>
                  <tbody>
                    {u.by_origen.map((r) => (
                      <tr key={r.origen}>
                        <td>{ORIGEN[r.origen] ?? r.origen}</td>
                        <td className="num">{fmtInt(r.preguntas)}</td>
                        <td className="num">{usd(r.costo_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card pivot">
            <div className="card__title">Últimas consultas</div>
            <div className="pivot__scroll access__logscroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Usuario</th><th>Origen</th><th>Unidad</th>
                    <th className="num">Vueltas</th><th className="num">Tokens</th><th className="num">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {u.recientes.map((r, i) => (
                    <tr key={i}>
                      <td>{fecha(r.ts)}</td>
                      <td>{r.username}</td>
                      <td>{ORIGEN[r.origen] ?? r.origen}</td>
                      <td>{r.unit ? (UNIT_LABEL[r.unit] ?? r.unit) : "—"}</td>
                      <td className="num">{r.iteraciones}</td>
                      <td className="num">{tok(r.input_tokens + r.output_tokens + r.cache_read)}</td>
                      <td className="num">{usd(r.costo_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="audit__foot">
            Ventana: últimos {u.days} días (desde {u.since.slice(0, 10)}). Modelo del asistente:
            el registro guarda con qué modelo se respondió cada pregunta, así el costo sigue
            siendo correcto si más adelante se cambia de modelo.
          </div>
        </>
      )}
    </div>
  );
}

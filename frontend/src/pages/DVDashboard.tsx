import { useEffect, useMemo, useState } from "react";
import { fetchDistinct, fetchRows, num, Row } from "../api";
import {
  CARDS, CHARTS, GAUGES, PIVOT, PROJECTS, TABLES,
} from "../config";
import { aggregate, buildFilters, dedupeKpisVersions, fillMonthly, groupByPeriod, last12 } from "../data";
import { periodKey, fmtUF, fmtInt, fmtMUFval } from "../format";
import { Slicer } from "../components/Slicer";
import { Gauge } from "../components/Gauge";
import { KpiCard } from "../components/KpiCard";
import { PivotTable } from "../components/PivotTable";
import { ClusteredColumnChart, ComboChart, StackedColumnChart } from "../components/charts/Charts";
import { DvDebtEntry } from "../components/DvDebtEntry";
import { Button } from "../components/Button";
import { useAuth } from "../auth";

// tablas que se cargan una vez por proyecto (filtradas proyecto+versión)
const DATASET_SLUGS = [
  "financieros_sanvest", "dv_ventas", "dv_escrituras", "dv_kpis",
  "dv_construccion", "amortizacion", "dv_uso_y_fondo", "dv_evolucion_de_costos",
];

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function DVDashboard() {
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [debtOpen, setDebtOpen] = useState(false);
  const { user } = useAuth();

  const project = PROJECTS.find((p) => p.id === projectId)!;

  // opciones de slicers (una vez)
  useEffect(() => {
    fetchDistinct("DV", "fecha_aux", "Año")
      .then((v) => setYears(v.map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b)))
      .catch(() => {});
    fetchDistinct("DV", "fecha_aux", "mes")
      .then((v) => setMonths(v.map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b)))
      .catch(() => {});
  }, []);

  // datasets por proyecto+versión
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(
      DATASET_SLUGS.map((slug) =>
        fetchRows("DV", slug, buildFilters(slug, project)).then(
          (rows) => [slug, slug === "dv_kpis" ? dedupeKpisVersions(rows) : rows] as const,
        ),
      ),
    )
      .then((pairs) => {
        if (!cancelled) setData(Object.fromEntries(pairs));
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [projectId, refresh]);

  // al abrir / cambiar de proyecto: caer en el último mes cargado (período)
  useEffect(() => {
    const rows = data["dv_uso_y_fondo"] ?? [];
    const fids = rows.map((r) => num(r["Fecha ID"])!).filter((x) => !isNaN(x));
    if (fids.length) { const mx = Math.max(...fids); setYear(Math.floor(mx / 100)); setMonth(mx % 100); }
  }, [data]);

  // filas "puntuales" (a la fecha): mes seleccionado, o último periodo disponible
  const pointRows = useMemo(() => {
    const out: Record<string, Row[]> = {};
    for (const slug of DATASET_SLUGS) {
      const cfg = TABLES[slug];
      const all = data[slug] ?? [];
      let rows = all;
      if (year !== "" && cfg.year) rows = rows.filter((r) => num(r[cfg.year!]) === year);
      if (month !== "" && cfg.month) rows = rows.filter((r) => num(r[cfg.month!]) === month);
      // "a la fecha": caer al último periodo disponible que no supere la fecha
      // elegida si (a) la selección exacta no trae filas, (b) no se eligió mes, o
      // (c) la tabla NO tiene columna de mes y por ende no puede honrar el slicer
      // (p. ej. amortización → mostrar el saldo del último periodo, no la suma).
      if (cfg.period && (month === "" || rows.length === 0 || !cfg.month)) {
        const sel = year === "" ? Infinity : year * 100 + (month === "" ? 12 : (month as number));
        // ordenar por la columna FechaID (YYYYMM) si existe — más confiable que la
        // fecha cruda (en amortización la fecha viene desalineada del FechaID).
        const fidCol = Object.keys(all[0] ?? {}).find((k) => /fecha\s*id/i.test(k));
        const ym = (r: Row) => {
          const f = fidCol ? num(r[fidCol]) : null;
          if (f != null) return f;
          const k = periodKey(String(r[cfg.period!]));
          if (!k) return NaN;
          const [y, m] = k.split("-").map(Number);
          return y * 100 + m;
        };
        const base = rows.length ? rows : all;
        const within = base.filter((r) => ym(r) <= sel);
        const pool = within.length ? within : base;
        const maxYm = Math.max(...pool.map(ym).filter((x) => !isNaN(x)));
        rows = pool.filter((r) => ym(r) === maxYm);
      }
      out[slug] = rows;
    }
    return out;
  }, [data, year, month]);

  // último período REPORTADO del proyecto (máx Fecha ID de dv_uso_y_fondo, misma
  // fuente del default): tope de la ventana para que los meses futuros —que en
  // "Necesidad de caja" traen solo PPTO— no aparezcan en los gráficos.
  const lastRealFid = useMemo(() => {
    const fids = (data["dv_uso_y_fondo"] ?? []).map((r) => num(r["Fecha ID"])!).filter((x) => !isNaN(x));
    return fids.length ? Math.max(...fids) : null;
  }, [data]);
  // fin de la ventana móvil de 12 meses: el mes/año elegido, topado en el último mes
  // reportado (nunca lo supera → sin meses de solo PPTO).
  const winFid = (() => {
    const raw = year !== "" ? year * 100 + (month === "" ? 12 : month) : (lastRealFid ?? Infinity);
    return lastRealFid != null ? Math.min(raw, lastRealFid) : raw;
  })();

  // filas para gráficos: ventana móvil de 12 meses que termina en winFid, cruzando al
  // año anterior (regla FechaID: fid > winFid-100 && fid <= winFid). El recorte fino de
  // la serie lo hace last12(endKey) tras agrupar/rellenar.
  const chartRows = (slug: string): Row[] => {
    const cfg = TABLES[slug];
    let rows = data[slug] ?? [];
    if (cfg.year && cfg.month && isFinite(winFid)) {
      const fid = (r: Row) => (num(r[cfg.year!]) ?? 0) * 100 + (num(r[cfg.month!]) ?? 0);
      rows = rows.filter((r) => fid(r) > winFid - 100 && fid(r) <= winFid);
    }
    return rows;
  };

  // fin de la ventana como "YYYY-MM" para last12 (marca el último mes del eje).
  const endKey = isFinite(winFid)
    ? `${Math.floor(winFid / 100)}-${String(winFid % 100).padStart(2, "0")}` : undefined;

  // Periodo confiable para evolución de costos: se arma desde Año/mes porque en
  // SV155/SV99 la columna Periodo viene repetida (histórico pegado a una misma
  // fecha) y agrupar por ella colapsa todos los meses en un solo punto.
  const evoPeriod = (r: Row): string => {
    const y = num(r["Año"]), m = num(r["mes"]);
    return y != null && m != null && m >= 1 && m <= 12
      ? `${y}-${String(m).padStart(2, "0")}-01`
      : String(r["Periodo"] ?? "");
  };

  // unidades del proyecto para el subtítulo del gauge de avance de ventas:
  // vendidas "a la fecha" (max, mismo criterio que la línea acumulada) / total.
  const totalUnits = (data["dv_kpis"] ?? [])
    .map((r) => num(r["UNIDADES TOTALES"]))
    .find((v): v is number => v != null);
  const soldUnits = aggregate(pointRows["dv_kpis"] ?? [], "UNIDADES_VENDIDAS", "max");

  // Estado de Deuda: la deuda base = LÍNEA DE CRÉDITO GIRADA de Usos y Fondos (lo
  // que se ingresa por el botón Actualizar deuda). El "Saldo deuda" (lo que se debe
  // hoy) = girada − amortizado; el "Amortizado" viene de la tabla amortizacion.
  // (Millalongo: girada 225.597 = amortizado 225.597 → saldo 0.)
  const deudaGirada = (pointRows["dv_uso_y_fondo"] ?? [])
    .filter((r) => String(r["SUBCATEGORIA"] ?? "").trim().toUpperCase() === "LÍNEA DE CRÉDITO GIRADA")
    .reduce((a, r) => a + (num(r["Monto"]) ?? 0), 0);
  const amortizado = aggregate(pointRows["amortizacion"], "Amortizado", "max") ?? 0;
  const saldoDeuda = Math.max(0, deudaGirada - amortizado);

  if (error) return <div className="state state--error">Error cargando datos: {error}</div>;
  if (loading) return <div className="state">Cargando {project.label}…</div>;

  return (
    <div className="dash">
      <header className="dash__header">
        <h1><img className="dash__logo dash__logo--emm" src="/logos/danacorp.png" alt="Danacorp" />Desarrollo para la Venta · <b className="dash__proj">{project.label}</b></h1>
        <div className="dash__slicers">
          <Slicer
            label="Proyecto"
            value={projectId}
            allowEmpty={false}
            options={PROJECTS.map((p) => ({ value: p.id, label: p.label }))}
            onChange={(v) => v && setProjectId(v)}
          />
          <Slicer
            label="Año"
            value={year}
            options={years.map((y) => ({ value: y, label: String(y) }))}
            onChange={setYear}
          />
          <Slicer
            label="Mes"
            value={month}
            options={months.map((m) => ({ value: m, label: MESES[m] ?? String(m) }))}
            onChange={setMonth}
          />
          {user?.can_upload && (
            <Button variant="primary" onClick={() => setDebtOpen((o) => !o)}>
              ✎ Actualizar deuda
            </Button>
          )}
        </div>
      </header>

      {/* Ingreso manual de la deuda (línea girada) → recalcula capital socios en
          Usos y Fondos. Solo admin. */}
      {debtOpen && user?.can_upload && (
        <section className="row" style={{ gridTemplateColumns: "1fr" }}>
          <DvDebtEntry proyecto={project.nombre} label={project.label}
            defaultYear={year !== "" ? year : (lastRealFid ? Math.floor(lastRealFid / 100) : undefined)}
            defaultMonth={month !== "" ? month : (lastRealFid ? lastRealFid % 100 : undefined)}
            open={debtOpen} onToggle={() => setDebtOpen((o) => !o)}
            onSaved={() => setRefresh((r) => r + 1)} />
        </section>
      )}

      {/* Resumen: avance (gauges) + ventas a la fecha */}
      <section className="row row--top">
        {GAUGES.map((g) => {
          const v = aggregate(pointRows[g.table], g.col, g.agg);
          const frac = v == null ? null : g.asFraction && Math.abs(v) > 1.5 ? v / 100 : v;
          // solo el gauge de avance de ventas lleva subtítulo "vendidas / totales"
          const sub = g.col === "AVANCE_VENTAS_(UNIDADES)%" && soldUnits != null && totalUnits != null
            ? `${fmtInt(soldUnits)} / ${fmtInt(totalUnits)} unidades`
            : undefined;
          return <Gauge key={g.title} title={g.title} value={frac} sub={sub} />;
        })}
        <KpiCard
          spec={CARDS[0]}
          values={CARDS[0].fields.map((f) => aggregate(pointRows[f.table], f.col, f.agg))}
        />
      </section>

      {/* Indicadores: financieros · construcción */}
      <section className="row row--cards">
        {[CARDS[1], CARDS[2]].map((c) => (
          <KpiCard key={c.title} spec={c}
            values={c.fields.map((f) => aggregate(pointRows[f.table], f.col, f.agg))} />
        ))}
      </section>

      {/* Ventas: acumuladas (UF) + unidades */}
      <section className="row row--two">
        <StackedColumnChart
          title={CHARTS[0].title}
          data={last12(groupByPeriod(chartRows("dv_ventas"), TABLES["dv_ventas"].period!,
            CHARTS[0].series.map((s) => ({ col: s.col, agg: s.agg, outKey: s.label }))), endKey)}
          series={CHARTS[0].series.map((s) => ({ key: s.label, label: s.label }))}
          tipFmt={fmtUF}
        />
        <ComboChart
          title={CHARTS[1].title}
          data={last12(fillMonthly(groupByPeriod(chartRows("dv_kpis"), TABLES["dv_kpis"].period!, [
            { col: CHARTS[1].series[0].col, agg: CHARTS[1].series[0].agg, outKey: "bar" },
            { col: CHARTS[1].line!.col, agg: CHARTS[1].line!.agg, outKey: "line" },
          ]), endKey), endKey)}
          bar={{ key: "bar", label: CHARTS[1].series[0].label }}
          line={{ key: "line", label: CHARTS[1].line!.label }}
          barFmt={fmtInt}
          lineFmt={fmtInt}
          leftTick={fmtInt}
          rightTick={fmtInt}
        />
      </section>

      {/* Usos y Fondos + Estado de deuda (apilados) | Necesidad de caja */}
      <section className="row row--two">
        <div className="stack">
          <PivotTable
            title={PIVOT.title}
            rows={pointRows["dv_uso_y_fondo"] ?? []}
            rowField={PIVOT.rows}
            colField={PIVOT.cols}
            valueField={PIVOT.value}
          />
          <KpiCard spec={CARDS[3]} values={[saldoDeuda, amortizado]} />
        </div>
        <ClusteredColumnChart
          title={CHARTS[2].title}
          data={last12(groupByPeriod(chartRows("dv_evolucion_de_costos"), evoPeriod,
            CHARTS[2].series.map((s) => ({ col: s.col, agg: s.agg, outKey: s.label }))), endKey)}
          series={CHARTS[2].series.map((s) => ({ key: s.label, label: s.label }))}
          tipFmt={fmtMUFval}
        />
      </section>

      <footer className="dash__footer">
        Datos reconciliados 1:1 contra el .pbix (ver <code>docs/</code>). Filtros del informe
        aplicados: proyecto + versión (Ventas/Escrituras=REAL, KPIs/Indic.=PROYECCIÓN).
        Cifras "a la fecha" = último periodo disponible salvo selección de Año/Mes.
      </footer>
    </div>
  );
}

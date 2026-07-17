// Lógica de datos: arma filtros (proyecto+versión+año/mes) y agrega en cliente.
import { num, Row } from "./api";
import { Agg, ProjectMap, TABLES } from "./config";
import { periodKey } from "./format";

export function projectValue(slug: string, p: ProjectMap): string {
  const col = TABLES[slug].projectCol;
  if (col === "Proyecto") return p.amort;
  if (col === "Activo") return p.activo;
  return p.nombre;
}

// Filtros base: proyecto + versión (D3.3). Si withDate, agrega año/mes.
export function buildFilters(
  slug: string,
  p: ProjectMap,
  year?: number | null,
  month?: number | null,
): Record<string, string | number> {
  const cfg = TABLES[slug];
  const f: Record<string, string | number> = { [cfg.projectCol]: projectValue(slug, p) };
  if (cfg.version) f["Versión"] = cfg.version;
  if (year != null && cfg.year) f[cfg.year] = year;
  if (month != null && cfg.month) f[cfg.month] = month;
  return f;
}

// dv_kpis trae 3 versiones por período (PROYECCIÓN baseline, REAL actuales, PPTO
// presupuesto). Para el avance/serie de unidades queremos una sola fila por período:
// la REAL si existe (dato actual), si no la PROYECCIÓN. PPTO se descarta siempre.
export function dedupeKpisVersions(rows: Row[]): Row[] {
  const ver = (r: Row) => String(r["Versión"] ?? "").toUpperCase();
  const byPeriod = new Map<string, Row>();
  for (const r of rows) {
    if (ver(r) === "PPTO") continue;
    const k = periodKey(String(r["Periodo"]));
    const cur = byPeriod.get(k);
    if (!cur || (ver(r) === "REAL" && ver(cur) !== "REAL")) byPeriod.set(k, r);
  }
  return [...byPeriod.values()];
}

export function aggregate(rows: Row[], col: string, agg: Agg): number | null {
  const vals = rows.map((r) => num(r[col])).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return agg === "sum" ? vals.reduce((a, b) => a + b, 0) : Math.max(...vals);
}

export interface PeriodPoint {
  key: string;
  iso: string;
  [serie: string]: string | number | null;
}

// Agrupa filas por periodo y agrega cada serie. specs: {col, agg, outKey}.
// periodCol: nombre de la columna con la fecha, o una función que derive el ISO de
// la fila (para tablas donde la columna Periodo viene corrupta pero Año/mes no).
export function groupByPeriod(
  rows: Row[],
  periodCol: string | ((r: Row) => string),
  specs: { col: string; agg: Agg; outKey: string }[],
): PeriodPoint[] {
  const isoOf = typeof periodCol === "function"
    ? periodCol : (r: Row) => String(r[periodCol] ?? "");
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const iso = isoOf(r);
    if (!iso) continue;
    const k = periodKey(iso);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const pts: PeriodPoint[] = [];
  for (const [k, grp] of groups) {
    const pt: PeriodPoint = { key: k, iso: isoOf(grp[0]) };
    for (const s of specs) pt[s.outKey] = aggregate(grp, s.col, s.agg);
    pts.push(pt);
  }
  pts.sort((a, b) => a.key.localeCompare(b.key));
  return pts;
}

// Ventana móvil "últimos 12 meses": recorta una serie mensual a los `n` meses que
// terminan en `endKey` ("YYYY-MM"; si no se pasa, el último mes presente en la
// serie). Acepta puntos con `key` ("YYYY-MM") o `iso` ("YYYY-MM-DD"). Aplicar
// DESPUÉS de fillMonthly/acumulados, para que los YTD conserven su reseteo anual.
export function last12<T extends { key?: string; iso?: string }>(
  data: T[], endKey?: string, n = 12,
): T[] {
  const kOf = (d: T) => String(d.key ?? String(d.iso ?? "").slice(0, 7));
  const idx = (k: string) => { const [y, m] = k.split("-").map(Number); return y * 12 + (m - 1); };
  const ok = (k: string) => /^\d{4}-\d{2}/.test(k);
  const ks = data.map(kOf).filter(ok);
  if (!ks.length) return data;
  const end = endKey && ok(endKey) ? idx(endKey.slice(0, 7)) : Math.max(...ks.map(idx));
  return data.filter((d) => {
    const k = kOf(d);
    return ok(k) && idx(k.slice(0, 7)) > end - n && idx(k.slice(0, 7)) <= end;
  });
}

// Rellena los meses faltantes entre el primer punto y `endKey` (incl.) para que
// el eje siga el calendario —como FECHA AUX.Periodo en el PBI— y no se salte
// meses sin dato (que ahí aparecen como categoría vacía). Los puntos generados
// no traen series, así que las barras/líneas quedan en blanco en esos meses.
export function fillMonthly(points: PeriodPoint[], endKey?: string): PeriodPoint[] {
  if (!points.length) return points;
  const idx = (k: string) => { const [y, m] = k.split("-").map(Number); return y * 12 + (m - 1); };
  const fmt = (i: number) => {
    const y = Math.floor(i / 12), m = (i % 12) + 1, mm = String(m).padStart(2, "0");
    return { key: `${y}-${mm}`, iso: `${y}-${mm}-01` };
  };
  const startIdx = idx(points[0].key);
  const lastIdx = idx(points[points.length - 1].key);
  const endIdx = Math.max(endKey ? idx(endKey) : lastIdx, lastIdx);
  const byKey = new Map(points.map((p) => [p.key, p]));
  const out: PeriodPoint[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const { key, iso } = fmt(i);
    out.push(byKey.get(key) ?? { key, iso });
  }
  return out;
}

// Formato es-CL: separador de miles '.', decimal ',', fechas dd/mm/yy.
const nf = (min: number, max: number) =>
  new Intl.NumberFormat("es-CL", { minimumFractionDigits: min, maximumFractionDigits: max });

export const fmtUF = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? "—" : nf(0, 0).format(Math.round(v)) + " UF";

export const fmtNum = (v: number | null | undefined, dec = 2): string =>
  v == null || isNaN(v) ? "—" : nf(dec, dec).format(v);

export const fmtInt = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? "—" : nf(0, 0).format(Math.round(v));

export const fmtPct = (v: number | null | undefined, dec = 1): string =>
  v == null || isNaN(v) ? "—" : nf(dec, dec).format(v * 100) + "%";

// UF compacta en millones para gráficos (M UF)
export const fmtMUF = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? "—" : nf(1, 1).format(v / 1_000_000);
export const fmtMUFlbl = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? "—" : nf(2, 2).format(v / 1_000_000) + " M UF";
// para datos que YA vienen en M UF (miles de UF, p.ej. egresos/1000): mostrar tal cual.
export const fmtMUFval = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? "—" : nf(0, 1).format(v) + " M UF";

export const fmtUSD = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? "—" : "US$ " + nf(2, 2).format(v);

// Pesos chilenos (sin decimales): $ 1.234.567
export const fmtCLP = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? "—" : "$ " + nf(0, 0).format(Math.round(v));

export const fmtRatio = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? "—" : nf(2, 2).format(v) + "x";

// eje compacto: 1,2M / 850k / 1.234 / 12,5 / 0,30  (los valores chicos NO se
// redondean a 0 — antes un eje de ratios o UF/m² mostraba "0" en cada marca)
export const axisCompact = (v: number): string => {
  if (v == null || isNaN(v)) return "";
  const a = Math.abs(v);
  if (a >= 1e6) return nf(1, 1).format(v / 1e6) + "M";
  if (a >= 1e3) return nf(0, 0).format(v / 1e3) + "k";
  if (a !== 0 && a < 1) return nf(2, 2).format(v);     // 0,30
  if (a < 100) return nf(a < 10 ? 1 : 0, a < 10 ? 1 : 0).format(v); // 12,5 / 87
  return nf(0, 0).format(v);
};

// yyyy-mm-dd... -> "mmm yy" (ej: ene 25)
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fmtPeriodo = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return `${MESES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};

export const periodKey = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

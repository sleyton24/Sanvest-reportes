// Configuración declarativa del dashboard DV, derivada del layout y filtros del
// .pbix (docs/visuales_DV.md, docs/decisiones.md D3.2/D3.3). Cambiar acá si el
// informe cambia; los componentes son genéricos.

export interface ProjectMap {
  id: string;
  label: string;
  nombre: string; // 'Nombre proyecto' en tablas DV*
  amort: string; //  'Proyecto' en Amortizacion
  activo: string; // 'Activo' en Financieros Sanvest
  logo?: string;  // logo del proyecto para el header (si no, Danacorp)
}

// Solo los 3 proyectos con página/financieros en el PBI (ver D3.2).
export const PROJECTS: ProjectMap[] = [
  { id: "millalongo", label: "Millalongo", nombre: "Millalongo", amort: "Millalongo", activo: "Millalongo", logo: "/logos/millalongo.png" },
  { id: "sv155", label: "Sta Victoria 155", nombre: "Sta. Victoria 155", amort: "Sv155", activo: "SV 155", logo: "/logos/santa-victoria.webp" },
  { id: "sv99", label: "Sta Victoria 99", nombre: "Sta. Victoria 99", amort: "Sv99", activo: "SV 99", logo: "/logos/santa-victoria.webp" },
];

export interface TableCfg {
  projectCol: string;
  version: string | null; // valor de 'Versión' a filtrar (D3.3) o null
  year: string | null;
  month: string | null;
  period: string | null;
}

export const TABLES: Record<string, TableCfg> = {
  dv_ventas: { projectCol: "Nombre proyecto", version: "REAL", year: "Año de carga", month: "Mes de carga", period: "Año Mes " },
  dv_escrituras: { projectCol: "Nombre proyecto", version: "REAL", year: "Año de carga", month: "Mes de carga", period: "Periodo" },
  // dv_kpis: sin filtro de versión en el fetch. La historia vive en PROYECCIÓN y
  // los actuales en REAL; se combinan en cliente (dedupeKpisVersions: prefiere REAL
  // por período, descarta PPTO) para que el avance/serie refleje lo realmente vendido.
  dv_kpis: { projectCol: "Nombre proyecto", version: null, year: "Año", month: "Mes", period: "Periodo" },
  dv_construccion: { projectCol: "Nombre proyecto", version: null, year: "Año de carga", month: "Mes de carga ", period: "Periodo" },
  dv_uso_y_fondo: { projectCol: "Nombre proyecto", version: null, year: "Año de carga", month: "Mes de carga", period: "Fecha" },
  dv_evolucion_de_costos: { projectCol: "Nombre proyecto", version: null, year: "Año", month: "mes", period: "Periodo" },
  amortizacion: { projectCol: "Proyecto", version: null, year: null, month: null, period: "Fecha" },
  financieros_sanvest: { projectCol: "Activo", version: null, year: null, month: null, period: null },
};

export type Agg = "sum" | "max";
export type Fmt = "uf" | "int" | "pct" | "num" | "num3" | "muf" | "clp";

export interface FieldSpec {
  table: string;
  col: string;
  agg: Agg;
  label: string;
  fmt: Fmt;
  accent?: boolean;   // pinta el valor en verde si >=0, rojo si negativo
}

export interface CardSpec {
  title: string;
  fields: FieldSpec[];
  note?: string;      // nota aclaratoria al pie de la tarjeta
}

// 4 KPI cards (campos y agregación tal como en el layout).
export const CARDS: CardSpec[] = [
  {
    title: "Ev. Original Indicadores Financieros",
    fields: [
      { table: "financieros_sanvest", col: "Inversión Sanvest", agg: "sum", label: "Inversión Sanvest", fmt: "uf" },
      { table: "financieros_sanvest", col: "Participación Sanvest", agg: "sum", label: "Participación Sanvest", fmt: "pct" },
      { table: "financieros_sanvest", col: "Margen % (UT/CT)", agg: "sum", label: "Margen % (UT/CT)", fmt: "pct" },
      { table: "financieros_sanvest", col: "Margen % (UT/VTA)", agg: "sum", label: "Margen % (UT/VTA)", fmt: "pct" },
      { table: "financieros_sanvest", col: "Margen Sanvest UF", agg: "sum", label: "Margen Sanvest UF", fmt: "uf" },
      { table: "financieros_sanvest", col: "TIR Sanvest", agg: "sum", label: "TIR Sanvest", fmt: "pct" },
      { table: "financieros_sanvest", col: "ROI Sanvest", agg: "sum", label: "ROI Sanvest", fmt: "pct" },
      { table: "financieros_sanvest", col: "Margen Proyecto UF", agg: "sum", label: "Margen Proyecto UF", fmt: "uf" },
    ],
  },
  {
    title: "Información Ventas a la Fecha",
    fields: [
      { table: "dv_ventas", col: "VENTAS_ACUMULADAS", agg: "sum", label: "Ventas acumuladas", fmt: "uf" },
      { table: "dv_ventas", col: "UF_RECAUDADAS         ", agg: "sum", label: "UF recaudadas", fmt: "uf" },
      { table: "dv_ventas", col: "UF_POR_RECAUDAR", agg: "sum", label: "UF por recaudar", fmt: "uf" },
      { table: "dv_escrituras", col: "PROYECCIÓN_VENTA_TOTAL(UF)", agg: "max", label: "Proyección venta total", fmt: "uf" },
      { table: "dv_kpis", col: "VENTAS NETAS_DEL_MES", agg: "max", label: "Ventas netas del mes (uds.)", fmt: "int", accent: true },
      { table: "dv_ventas", col: "RESERVAS_Y_PROMESAS", agg: "sum", label: "Reservas y promesas", fmt: "int" },
      { table: "dv_ventas", col: "UNIDADES_ESCRITURADAS_FIRMADAS", agg: "sum", label: "Uds. escrituradas firmadas", fmt: "int" },
      { table: "dv_ventas", col: "UNIDADES_ESCRITURADAS_RECAUDADAS", agg: "sum", label: "Uds. escrituradas recaudadas", fmt: "int" },
      { table: "financieros_sanvest", col: "UF/m2 Venta Dpto actual", agg: "sum", label: "UF/m² venta dpto actual", fmt: "num" },
      { table: "financieros_sanvest", col: "UF/m2 Venta Dpto Ev. Original", agg: "sum", label: "UF/m² venta dpto (Ev. Original)", fmt: "num" },
      { table: "financieros_sanvest", col: "UF/m2 venta total actual", agg: "sum", label: "UF/m² venta total actual", fmt: "num" },
      { table: "financieros_sanvest", col: "UF/m2 venta total EV. Original", agg: "sum", label: "UF/m² venta total (Ev. Original)", fmt: "num" },
    ],
    note: "UF/m² calculado sobre superficie útil + media terraza.",
  },
  {
    title: "Ev. Original Información de Construcción",
    fields: [
      { table: "dv_construccion", col: "COSTO_TOTAL_PROYECTO_(UF)", agg: "max", label: "Costo total proyecto", fmt: "uf" },
      { table: "dv_construccion", col: "COSTOS_TOTALES_PROYECTO_NETO (UF)", agg: "max", label: "Costos totales netos", fmt: "uf" },
      // "Deuda aprobada" (reunión JMB jul-2026): así se llama en la información
      // original de CC; la columna de la tabla conserva su nombre histórico.
      { table: "dv_construccion", col: "DEUDA_A_LA_FECHA UF", agg: "max", label: "Deuda aprobada", fmt: "uf" },
      { table: "dv_construccion", col: "%LINEA/COSTO_TOTAL_NETO", agg: "max", label: "% Línea / costo total neto", fmt: "pct" },
      { table: "financieros_sanvest", col: "Costo total neto /m2 vendible (UF/m2)", agg: "sum", label: "Costo neto/m² vendible", fmt: "num" },
      { table: "financieros_sanvest", col: "Incidencia construcción (UF/m2 losa)", agg: "sum", label: "Incidencia constr. (UF/m² losa)", fmt: "num" },
    ],
  },
  {
    title: "Estado de Deuda a la Fecha",
    fields: [
      { table: "amortizacion", col: "Saldo", agg: "sum", label: "Saldo deuda", fmt: "uf" },
      { table: "amortizacion", col: "Amortizado", agg: "max", label: "Amortizado", fmt: "uf" },
    ],
  },
];

export interface GaugeSpec {
  title: string;
  table: string;
  col: string;
  agg: Agg;
  // si el valor viene como fracción 0..1 se muestra ×100
  asFraction: boolean;
}

export const GAUGES: GaugeSpec[] = [
  { title: "Avance construcción", table: "dv_construccion", col: "AVANCE_CONSTRUCCIÓN", agg: "max", asFraction: true },
  { title: "Avance ventas (%)", table: "dv_kpis", col: "AVANCE_VENTAS_(UNIDADES)%", agg: "max", asFraction: true },
];

export interface SeriesSpec {
  col: string;
  agg: Agg;
  label: string;
}

export interface ChartSpec {
  title: string;
  table: string;
  kind: "stacked" | "combo" | "clustered";
  series: SeriesSpec[]; // columnas
  line?: SeriesSpec; //   serie de línea (combo)
}

export const CHARTS: ChartSpec[] = [
  {
    title: "Ventas acumuladas (UF)",
    table: "dv_ventas",
    kind: "stacked",
    series: [
      { col: "UF_RECAUDADAS         ", agg: "sum", label: "UF recaudadas" },
      { col: "UF_POR_RECAUDAR", agg: "sum", label: "UF por recaudar" },
    ],
  },
  {
    title: "Ventas acumuladas (unidades)",
    table: "dv_kpis",
    kind: "combo",
    series: [{ col: "VENTAS NETAS_DEL_MES", agg: "sum", label: "Ventas netas del mes (uds.)" }],
    line: { col: "UNIDADES_VENDIDAS", agg: "max", label: "Unidades vendidas (acum.)" },
  },
  {
    title: "Necesidad de caja (M UF)",
    table: "dv_evolucion_de_costos",
    kind: "clustered",
    series: [
      { col: "COSTOS_REALES", agg: "max", label: "Costos reales" },
      { col: "PPTO_DE_COSTOS", agg: "max", label: "Ppto. de costos" },
    ],
  },
];

export const PIVOT = {
  title: "Usos y Fondos del Proyecto a la Fecha",
  table: "dv_uso_y_fondo",
  rows: "SUBCATEGORIA",
  cols: "Categoria",
  value: "Monto",
};

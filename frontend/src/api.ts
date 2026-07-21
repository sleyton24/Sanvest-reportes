// Cliente de la API FastAPI. En dev /api -> :8077 (proxy de Vite).
// Todas las llamadas reciben la `unit` (DV, Hotel, ...) — no hay unidad fija.
const BASE = "/api";

// Token compartido legado (VITE_API_TOKEN, header X-API-Token). Se mantiene por
// compatibilidad; la autenticación real es por usuario (JWT en localStorage).
const API_TOKEN = (import.meta as any).env?.VITE_API_TOKEN || "";

const TOKEN_KEY = "sanvest_token";
export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || "";
export const setToken = (t: string): void => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

// Handler global de 401 (sesión inválida/expirada). Lo registra el AuthProvider
// para volver a la pantalla de login.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void): void => { onUnauthorized = fn; };

const authHeaders = (): Record<string, string> => {
  const h: Record<string, string> = {};
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  if (API_TOKEN) h["X-API-Token"] = API_TOKEN;
  return h;
};

// fetch con auth + manejo central de 401. `path` es relativo a BASE.
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...((init.headers as Record<string, string>) || {}), ...authHeaders() },
  });
  if (res.status === 401) {
    clearToken();
    onUnauthorized?.();
  }
  return res;
}

// --- autenticación ---
export interface AppUser {
  username: string;
  full_name: string | null;
  role: string;
  units: string[];
  active: boolean;
  is_admin: boolean;
  can_upload: boolean;
}

// status=401 → credenciales malas; otro status (500, red caída) NO es culpa de la clave.
export class LoginError extends Error {
  constructor(public status: number) {
    super(`login ${status}`);
  }
}

export async function login(username: string, password: string): Promise<{ token: string; user: AppUser }> {
  // fetch directo (no apiFetch): un 401 acá es "credenciales incorrectas", no logout global.
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new LoginError(res.status);
  return res.json();
}

export async function fetchMe(): Promise<AppUser> {
  const res = await apiFetch(`/auth/me`);
  if (!res.ok) throw new Error(`me ${res.status}`);
  return res.json();
}

// Cambia la contraseña del propio usuario (exige la actual).
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch(`/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({})))?.detail;
    throw new Error(typeof d === "string" ? d : `cambio de clave: ${res.status}`);
  }
}

// --- gestión de usuarios (solo admin) ---
export interface NewUser {
  username: string;
  password: string;
  role: string;                 // 'admin' | 'viewer'
  full_name?: string | null;
  units: string[];              // unidades visibles (solo viewer)
}
export interface UpdateUser {
  password?: string;
  role?: string;
  full_name?: string | null;
  units?: string[];
  active?: boolean;
}

async function jsonOrThrow(res: Response, what: string): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = (data as any)?.detail;
    throw new Error(typeof d === "string" ? d : `${what}: ${res.status}`);
  }
  return data;
}

export async function listUsers(): Promise<AppUser[]> {
  return jsonOrThrow(await apiFetch(`/auth/users`), "listar usuarios");
}

// --- bitácora / estadísticas de acceso ---
// Registra que el usuario abrió una unidad. Fire-and-forget: no bloquea la
// navegación ni propaga errores (la métrica es secundaria).
export function logUnitAccess(unit: string): void {
  apiFetch(`/auth/access/unit`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unit }),
  }).catch(() => {});
}

export interface AccessStats {
  days: number;
  since: string;
  totals: { logins: number; views: number; active_users: number };
  by_user: { username: string; full_name: string | null; logins: number; views: number; last_seen: string | null }[];
  by_unit: { unit: string; views: number; users: number }[];
  by_day: { day: string; logins: number; views: number }[];
  by_user_unit: { username: string; unit: string; views: number }[];
}

export async function fetchAccessStats(days = 30): Promise<AccessStats> {
  return jsonOrThrow(await apiFetch(`/auth/access/stats?days=${days}`), "estadísticas de acceso");
}

export interface AccessLogRow {
  ts: string; username: string; event: string; unit: string | null; ip: string | null;
}

export async function fetchAccessLog(limit = 200): Promise<AccessLogRow[]> {
  return jsonOrThrow(await apiFetch(`/auth/access/log?limit=${limit}`), "bitácora de acceso");
}

// --- auditoría de datos (solo admin) ---
export interface AuditAlert {
  severity: "error" | "warn" | "info";
  unit: string; table: string; check: string; message: string;
}
export interface AuditResult {
  generated: string;
  summary: { errores: number; advertencias: number; info: number };
  alerts: AuditAlert[];
}

export async function runAudit(): Promise<AuditResult> {
  return jsonOrThrow(await apiFetch(`/audit/run`), "auditoría de datos");
}

// Comparación Excel-cargado vs app (re-parsea el archivo y lo diffea contra la BD).
export interface AuditDiff { clave: string; columna: string; excel: number; app: number; dif: number; }
export interface AuditCompareResult {
  unit: string; table: string; filas_excel: number; comparadas: number; columnas_medida: number;
  n_diferencias: number; diferencias: AuditDiff[]; n_faltan_en_app: number; faltan_en_app: string[]; ok: boolean;
}
export async function compareAudit(unit: string, file: File): Promise<AuditCompareResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(`/audit/compare?unit=${encodeURIComponent(unit)}`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(res.status, (data as any).detail ?? data);
  return data as AuditCompareResult;
}

export async function createUser(body: NewUser): Promise<{ ok: boolean; user: AppUser }> {
  return jsonOrThrow(await apiFetch(`/auth/users`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), "crear usuario");
}

export async function updateUser(username: string, body: UpdateUser): Promise<{ ok: boolean; user: AppUser }> {
  return jsonOrThrow(await apiFetch(`/auth/users/${encodeURIComponent(username)}/update`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), "actualizar usuario");
}

export type Row = Record<string, unknown>;

export async function fetchRows(
  unit: string,
  slug: string,
  filters: Record<string, string | number> = {},
  limit = 50000,
): Promise<Row[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) qs.append(k, String(v));
  qs.set("limit", String(limit));
  const res = await apiFetch(`/units/${unit}/tables/${slug}?${qs}`);
  if (!res.ok) throw new Error(`${slug}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.rows as Row[];
}

export async function fetchDistinct(
  unit: string,
  slug: string,
  column: string,
): Promise<unknown[]> {
  const res = await apiFetch(
    `/units/${unit}/tables/${slug}/distinct/${encodeURIComponent(column)}`,
  );
  if (!res.ok) throw new Error(`${slug}.${column}: ${res.status}`);
  return (await res.json()).values;
}

export interface UploadResult {
  ok: boolean;
  file: string;
  loaded: Record<string, number>;
  total_rows: number;
}

export class UploadError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(`upload ${status}`);
  }
}

// Fase 4: sube el Excel crudo -> la API valida + corre el ETL.
export async function uploadExcel(unit: string, file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(`/units/${unit}/upload`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(res.status, (data as any).detail ?? data);
  return data as UploadResult;
}

// Fase 4 (LAR): sube varios Informes de Gestión del mes (SOHO/PARK).
export async function uploadInformes(unit: string, files: File[]): Promise<any> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const res = await apiFetch(`/units/${unit}/upload-informes`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(res.status, (data as any).detail ?? data);
  return data;
}

// Plantilla .xlsx de ejemplo (hojas + encabezados esperados) de una unidad.
export async function fetchExample(unit: string): Promise<Blob> {
  const res = await apiFetch(`/units/${unit}/example`);
  if (!res.ok) throw new Error(`ejemplo ${res.status}`);
  return res.blob();
}

// Ingreso manual de KPIs mensuales USA que NO vienen de Yardi: Ocupación Real y
// Rent $/SQF Actual (residencial + retail) -> ocupacion_ppto / usa_kpis_gestion.
export interface UsaKpiInput {
  activo: string; anio: number; mes: number;
  occ_actual?: number | null;          // Ocupación Residencial Real (% o fracción)
  sqf_actual?: number | null;          // $/SQF Residencial Actual (mes)
  sqf_retail_actual?: number | null;   // $/SQF Retail Actual (mes)
}
// Ingreso manual de la DEUDA (línea de crédito girada) de un proyecto DV; el
// backend recalcula el capital socios (= egresos − deuda − preventas).
export interface DvDebtInput { proyecto: string; anio: number; mes: number; deuda: number; }
export async function saveDvDebt(body: DvDebtInput): Promise<any> {
  const res = await apiFetch(`/units/DV/uso-fondo`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(res.status, (data as any).detail ?? data);
  return data;
}

// Ingreso manual del avance de construcción de un proyecto DV (%). El gauge toma
// el máximo entre versiones; el backend lo setea en el proyecto+período.
export interface DvAvanceInput { proyecto: string; anio: number; mes: number; avance: number; }
export async function saveDvAvance(body: DvAvanceInput): Promise<any> {
  const res = await apiFetch(`/units/DV/avance-construccion`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(res.status, (data as any).detail ?? data);
  return data;
}

export async function saveUsaKpis(body: UsaKpiInput): Promise<any> {
  const res = await apiFetch(`/units/USA/kpis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(res.status, (data as any).detail ?? data);
  return data;
}

// --- asistente (agente Claude, streaming SSE) ---
export interface ChatMsg { role: "user" | "assistant"; content: string; }

interface AgentHandlers { onText?: (t: string) => void; onTool?: (name: string) => void }

// Núcleo SSE: postea la conversación a `path` y entrega texto/eventos por callbacks.
async function streamAgentSSE(
  path: string, messages: ChatMsg[], handlers: AgentHandlers, disabledMsg: string,
): Promise<void> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (res.status === 503) throw new Error(disabledMsg);
  if (!res.ok || !res.body) throw new Error(`agente: ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 2);
      if (!line.startsWith("data:")) continue;
      let ev: { type: string; text?: string; name?: string; error?: string };
      try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
      if (ev.type === "text" && ev.text) handlers.onText?.(ev.text);
      else if (ev.type === "tool" && ev.name) handlers.onTool?.(ev.name);
      else if (ev.type === "error") throw new Error(ev.error || "error del agente");
      else if (ev.type === "done") return;
    }
  }
}

// Asistente read-only de datos (diagnóstico de cargas). SSE.
export async function askAgent(unit: string, messages: ChatMsg[], handlers: AgentHandlers): Promise<void> {
  return streamAgentSSE(`/units/${unit}/ask`, messages, handlers,
    "El asistente no está habilitado en el servidor (falta ANTHROPIC_API_KEY o SANVEST_ASK_ENABLED=1).");
}

// --- F4: mantenedor de ETL (ajusta el spec en staging; el admin aplica) ---
export interface EtlStatus {
  unit: string; spec_driven: boolean; statements: string[];
  staged_specs: string[]; raw_files: Record<string, string>;
  has_backups: boolean; agent_enabled: boolean; diffs: Record<string, string[]>;
}

export async function etlStatus(unit: string): Promise<EtlStatus> {
  return jsonOrThrow(await apiFetch(`/units/${unit}/etl/status`), "estado ETL");
}

export async function etlUpload(unit: string, files: File[]): Promise<any> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const res = await apiFetch(`/units/${unit}/etl/upload`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(res.status, (data as any).detail ?? data);
  return data;
}

export async function etlApply(unit: string): Promise<any> {
  const res = await apiFetch(`/units/${unit}/etl/apply`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(res.status, (data as any).detail ?? data);
  return data;
}

export async function etlRollback(unit: string): Promise<any> {
  return jsonOrThrow(await apiFetch(`/units/${unit}/etl/rollback`, { method: "POST" }), "rollback ETL");
}

export async function etlDiscard(unit: string): Promise<any> {
  return jsonOrThrow(await apiFetch(`/units/${unit}/etl/discard`, { method: "POST" }), "descartar ETL");
}

// Mantenedor de ETL (ajusta el spec + dry-run; NO aplica). SSE.
export async function askEtlAgent(unit: string, messages: ChatMsg[], handlers: AgentHandlers): Promise<void> {
  return streamAgentSSE(`/units/${unit}/etl/ask`, messages, handlers,
    "El mantenedor de ETL no está habilitado (falta ANTHROPIC_API_KEY o SANVEST_ETL_AGENT_ENABLED=1).");
}

// --- PPT Directorio (PDF) ---
export interface PptMeta { exists: boolean; size?: number; uploaded_at?: string; }
export async function pptMeta(): Promise<PptMeta> {
  return jsonOrThrow(await apiFetch(`/docs/ppt-directorio/meta`), "estado PPT Directorio");
}
// Descarga el PDF como blob (con auth) para mostrarlo en línea sin descarga.
export async function fetchPptBlob(): Promise<Blob> {
  const res = await apiFetch(`/docs/ppt-directorio`);
  if (!res.ok) throw new Error(res.status === 404 ? "Aún no se ha subido la PPT Directorio." : `PPT: ${res.status}`);
  return res.blob();
}
export async function uploadPpt(file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(`/docs/ppt-directorio`, { method: "POST", body: fd });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({})))?.detail;
    throw new Error(typeof d === "string" ? d : `subir PDF: ${res.status}`);
  }
}

// --- comentarios (foro por unidad) ---
export interface Comment { ts: string; unit: string; username: string; full_name: string | null; body: string; }
export async function listComments(unit: string): Promise<Comment[]> {
  return jsonOrThrow(await apiFetch(`/units/${unit}/comments`), "comentarios");
}
export async function postComment(unit: string, body: string): Promise<Comment> {
  return jsonOrThrow(await apiFetch(`/units/${unit}/comments`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
  }), "publicar comentario");
}

// num() seguro: convierte celda a número o null
export const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
};

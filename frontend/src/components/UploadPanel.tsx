import { useRef, useState } from "react";
import { uploadExcel, UploadError, UploadResult } from "../api";
import { Button } from "./Button";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; res: UploadResult }
  | { kind: "error"; msg: string; missing: string[] };

export function UploadPanel({ unit, onLoaded }: { unit: string; onLoaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handle(file: File) {
    setStatus({ kind: "loading" });
    try {
      const res = await uploadExcel(unit, file);
      setStatus({ kind: "ok", res });
      onLoaded();
    } catch (e) {
      if (e instanceof UploadError) {
        const d: any = e.detail;
        const tables = d?.validation?.tables ?? [];
        const missing = tables
          .filter((t: any) => !t.sheet_found || (t.missing_columns?.length ?? 0))
          .map((t: any) =>
            !t.sheet_found ? `falta hoja "${t.sheet}"` : `${t.table}: faltan ${t.missing_columns.join(", ")}`,
          );
        setStatus({ kind: "error", msg: d?.message ?? `Error ${e.status}`, missing });
      } else {
        setStatus({ kind: "error", msg: String(e), missing: [] });
      }
    }
  }

  return (
    <div className="upload">
      <Button variant="primary" onClick={() => inputRef.current?.click()}
        disabled={status.kind === "loading"}>
        {status.kind === "loading" ? "Cargando…" : "⬆ Cargar Excel"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      {status.kind === "ok" && (
        <span className="upload__msg upload__msg--ok">
          ✓ {status.res.file}: {status.res.total_rows.toLocaleString("es-CL")} filas en{" "}
          {Object.keys(status.res.loaded).length} tablas.
        </span>
      )}
      {status.kind === "error" && (
        <span className="upload__msg upload__msg--err" title={status.missing.join(" · ")}>
          ✗ {status.msg}{status.missing.length ? ` (${status.missing.length} problemas)` : ""}
        </span>
      )}
    </div>
  );
}

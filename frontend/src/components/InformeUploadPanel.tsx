import { useRef, useState } from "react";
import { uploadInformes, UploadError } from "../api";
import { Button } from "./Button";

type St =
  | { k: "idle" }
  | { k: "loading" }
  | { k: "ok"; msg: string }
  | { k: "err"; msg: string };

// Carga de informes crudos (LAR: SOHO/PARK; Hotel: CCPP) — upsert con histórico.
export function InformeUploadPanel(
  { unit, onLoaded, label = "⬆ Cargar Informes (SOHO/PARK)" }:
  { unit: string; onLoaded: () => void; label?: string },
) {
  const ref = useRef<HTMLInputElement>(null);
  const [st, setSt] = useState<St>({ k: "idle" });

  async function handle(files: FileList) {
    setSt({ k: "loading" });
    try {
      const res = await uploadInformes(unit, Array.from(files));
      const r = res.resultado ?? {};
      // resumen genérico: "tabla N↻/M+" por cada tabla afectada
      const parts = Object.entries(r).map(([t, v]: [string, any]) =>
        `${t} ${v.filas_actualizadas ?? 0}↻/${v.filas_insertadas ?? 0}+`);
      setSt({ k: "ok", msg: `✓ ${parts.join(", ")}` });
      onLoaded();
    } catch (e) {
      if (e instanceof UploadError) {
        const d: any = e.detail;
        setSt({ k: "err", msg: typeof d === "string" ? d : d?.message ?? `Error ${e.status}` });
      } else setSt({ k: "err", msg: String(e) });
    }
  }

  return (
    <div className="upload">
      <Button variant="primary" onClick={() => ref.current?.click()}
        disabled={st.k === "loading"}>
        {st.k === "loading" ? "Procesando…" : label}
      </Button>
      <input ref={ref} type="file" accept=".xlsx,.xlsm" hidden multiple
        onChange={(e) => { if (e.target.files?.length) handle(e.target.files); e.target.value = ""; }} />
      {st.k === "ok" && <span className="upload__msg upload__msg--ok">{st.msg}</span>}
      {st.k === "err" && <span className="upload__msg upload__msg--err">✗ {st.msg}</span>}
    </div>
  );
}

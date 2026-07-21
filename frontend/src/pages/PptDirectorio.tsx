// PPT Directorio: muestra el PDF en línea (sin descargar). Trae el PDF como blob
// con auth y lo renderiza en un <iframe> vía object URL. El admin puede subir/
// reemplazar el PDF.
import { useEffect, useRef, useState } from "react";
import { pptMeta, fetchPptBlob, uploadPpt } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/Button";

export function PptDirectorio() {
  const { user } = useAuth();
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reload, setReload] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let objUrl = ""; let off = false;
    setLoading(true); setError("");
    (async () => {
      try {
        const meta = await pptMeta();
        if (!meta.exists) { if (!off) { setUrl(""); setError(""); } return; }
        const blob = await fetchPptBlob();
        objUrl = URL.createObjectURL(blob);
        if (!off) setUrl(objUrl);
      } catch (e) { if (!off) setError((e as Error).message); }
      finally { if (!off) setLoading(false); }
    })();
    return () => { off = true; if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [reload]);

  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setError("Elige un PDF primero."); return; }
    setUploading(true); setError("");
    try { await uploadPpt(f); setReload((r) => r + 1); }
    catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  };

  return (
    <div className="dash ppt">
      <header className="dash__header">
        <h1>PPT Directorio</h1>
        {user?.can_upload && (
          <div className="dash__slicers ppt__upload">
            <input type="file" accept="application/pdf,.pdf" ref={fileRef} />
            <Button variant="primary" onClick={upload} disabled={uploading}>
              {uploading ? "Subiendo…" : (url ? "Reemplazar PDF" : "Subir PDF")}
            </Button>
          </div>
        )}
      </header>

      {error && <div className="state state--error">{error}</div>}
      {loading ? (
        <div className="state">Cargando…</div>
      ) : url ? (
        <iframe className="ppt__frame" src={url} title="PPT Directorio" />
      ) : !error ? (
        <div className="state">
          Aún no se ha subido la PPT Directorio.
          {user?.can_upload ? " Usa el botón de arriba para subir el PDF." : " Pídele a un administrador que la cargue."}
        </div>
      ) : null}
    </div>
  );
}

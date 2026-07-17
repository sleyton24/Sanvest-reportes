import { useState, type MouseEvent } from "react";

// Indicador de nota con tooltip propio y estilizado. Usa posición fija calculada
// desde el rect del marcador, para que el popup NO lo recorte el overflow de la
// tabla (a diferencia de un tooltip absoluto). Reemplaza el title nativo del navegador.
// mark: qué mostrar en el círculo (número de nota como en el BI; default "i").
export function NoteTip({ text, mark = "i" }: { text: string; mark?: string | number }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const place = (e: MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    // La app escala TODO con body{zoom} (main.tsx). getBoundingClientRect ya devuelve
    // coords visuales (×zoom), pero un position:fixed dentro del body se reescala otra
    // vez por el zoom → sin compensar, el popup se va fuera de pantalla con zoom>1 (por
    // eso "no aparecía"). Dividimos por el zoom para que caiga junto al marcador.
    const z = parseFloat(String((document.body.style as any).zoom)) || 1;
    const x = Math.min(Math.max(r.left + r.width / 2, 180), window.innerWidth - 180);
    setPos({ x: x / z, y: (r.bottom + 8) / z });
  };
  return (
    <span className="notetip" onMouseEnter={place} onMouseLeave={() => setPos(null)}>
      <span className="notetip__mark">{mark}</span>
      {pos && <span className="notetip__pop" style={{ left: pos.x, top: pos.y }}>{text}</span>}
    </span>
  );
}

// Contexto "qué reporte se está viendo": cada dashboard publica su unidad, los
// filtros activos y las cifras principales que tiene en pantalla. Lo consume el
// asistente del panel (PanelChat) para responder sobre LO QUE SE ESTÁ MIRANDO, en
// vez de obligar a repetir la unidad y el período en cada pregunta.
//
// Mismo patrón que PrintLabelsProvider: provider en App.tsx, hook en el consumidor.
import { createContext, useContext, useEffect, useRef } from "react";

export interface VistaCifra { label: string; valor: string; }

export interface Vista {
  unidad: string;                       // id de la unidad (DV, RR, Hotel, …)
  titulo: string;                       // rótulo legible ("Renta Residencial · SOHO")
  filtros: Record<string, string | number>;   // { Activo: "SOHO", Año: 2026, Mes: "Jul" }
  cifras: VistaCifra[];                 // lo visible: [{label:"EBITDA UF", valor:"1.331"}]
}

interface Store {
  get: () => Vista | null;
  set: (v: Vista | null) => void;
}

// El contexto guarda un getter, no el valor: así el dashboard puede publicar su
// vista en cada render sin re-renderizar el chat (que solo la lee al enviar).
const VistaContext = createContext<Store>({ get: () => null, set: () => {} });

export function VistaProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<Vista | null>(null);
  const store: Store = {
    get: () => ref.current,
    set: (v) => { ref.current = v; },
  };
  return <VistaContext.Provider value={store}>{children}</VistaContext.Provider>;
}

/** Publica la vista actual del dashboard. Llamar en cada render con lo que se ve. */
export function useSetVista(vista: Vista | null): void {
  const store = useContext(VistaContext);
  // JSON como dependencia: el objeto se reconstruye en cada render del dashboard,
  // pero solo importa cuando su CONTENIDO cambia.
  const clave = JSON.stringify(vista);
  useEffect(() => {
    store.set(vista);
    return () => store.set(null);        // al salir del dashboard no queda vista vieja
  }, [clave]);                           // eslint-disable-line react-hooks/exhaustive-deps
}

/** Lee la vista actual (el asistente la manda como contexto al preguntar). */
export function useVista(): () => Vista | null {
  return useContext(VistaContext).get;
}

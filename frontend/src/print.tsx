import { createContext, useContext } from "react";

// Contexto "etiquetas de impresión" (reporte PDF): mientras vale true, los
// gráficos dibujan sus etiquetas de datos para que el PDF sea legible sin
// tooltips. Lo enciende el botón "🖨 PDF" del topnav (App.tsx) justo antes de
// window.print() y se apaga con el evento afterprint.
const PrintLabelsContext = createContext(false);

// provider para envolver la app (App.tsx)
export const PrintLabelsProvider = PrintLabelsContext.Provider;

// hook de consumo desde los componentes de gráficos (Charts.tsx)
export function usePrintLabels(): boolean {
  return useContext(PrintLabelsContext);
}

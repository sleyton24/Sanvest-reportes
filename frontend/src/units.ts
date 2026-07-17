// Unidades de negocio del BI (id = clave de la API / catálogo; label = rótulo UI).
// Fuente única, compartida por el topnav, el menú, el perfilado y el módulo de carga.
export interface Unit {
  id: string;
  label: string;
}

export const UNITS: Unit[] = [
  { id: "DV", label: "Desarrollo para la Venta" },
  { id: "RR", label: "Renta Residencial" },
  { id: "Hotel", label: "OLÁ Hotel" },
  { id: "USA", label: "USA" },
  { id: "ICEMM", label: "Construcción" },
  { id: "Atempora", label: "Atémpora" },
  { id: "Grupo", label: "Estados Financieros" },
];

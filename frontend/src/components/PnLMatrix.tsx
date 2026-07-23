// Matriz de Estado de Resultados como en el Power BI: jerarquía de N niveles
// (p.ej. N1 INGRESOS/EGRESOS > N2 > N3, o Seccion > Linea) colapsable, con
// columnas de medida que pueden venir de los datos o ser una Δ calculada, y
// opcionalmente agrupadas en encabezados (Mensual | YTD). Línea final de resultado.
import { useMemo, useState } from "react";
import { Row, num } from "../api";
import { fmtNum } from "../format";
import { NoteTip } from "./NoteTip";
import { Button } from "./Button";

export type PnLCol = {
  label: string;
  key?: string;                 // medida tomada de los datos
  delta?: [string, string];     // Δ calculada = values[a] − values[b]
  color?: boolean;              // colorear verde/rojo según signo (para Δ)
  sep?: boolean;                // separador vertical (inicio de un grupo)
};
export type PnLHeaderGroup = { label: string; cols: number };
type Node = { name: string; path: string; values: Record<string, number>; children: Node[] };

function buildTree(rows: Row[], levels: string[], keys: string[]): Node[] {
  const roots: Node[] = [];
  const find = (arr: Node[], name: string, path: string): Node => {
    let n = arr.find((x) => x.name === name);
    if (!n) { n = { name, path, values: {}, children: [] }; arr.push(n); }
    return n;
  };
  for (const r of rows) {
    const vals: Record<string, number> = {};
    for (const k of keys) vals[k] = num(r[k]) ?? 0;
    let level = roots, path = "";
    for (const lv of levels) {
      const name = String(r[lv] ?? "").trim();
      if (!name) break;
      path += "|" + name;
      const node = find(level, name, path);
      for (const k of keys) node.values[k] = (node.values[k] ?? 0) + vals[k];
      level = node.children;
    }
  }
  const prune = (arr: Node[]): Node[] => arr
    .map((n) => ({ ...n, children: prune(n.children) }))
    .filter((n) => keys.some((k) => Math.abs(n.values[k] ?? 0) > 0.5));
  return prune(roots);
}

const cellVal = (values: Record<string, number>, c: PnLCol) =>
  c.delta ? (values[c.delta[0]] ?? 0) - (values[c.delta[1]] ?? 0) : (values[c.key!] ?? 0);
const dColor = (v: number) => (v >= 0 ? "var(--pos)" : "var(--neg)");

export function PnLMatrix({ title, rows, levels, cols, headerGroups, fmt = (v: number) => fmtNum(v, 0), result, notes, noteCol, onExpand }: {
  title: string; rows: Row[]; levels: string[]; cols: PnLCol[];
  headerGroups?: PnLHeaderGroup[];
  fmt?: (v: number) => string;
  result?: { label: string; values: Record<string, number> };
  notes?: Record<string, { text: string; num?: number | string }>; // label de fila → nota (tooltip al hover, marca = N°)
  noteCol?: boolean;                // muestra una columna "Nota" con el texto (pantalla completa)
  onExpand?: () => void;            // botón "pantalla completa" (overlay con notas)
}) {
  const keys = useMemo(() => {
    const s = new Set<string>();
    for (const c of cols) { if (c.key) s.add(c.key); if (c.delta) { s.add(c.delta[0]); s.add(c.delta[1]); } }
    return [...s];
  }, [cols]);
  const tree = useMemo(() => buildTree(rows, levels, keys), [rows, levels, keys]);

  const allPaths: string[] = [];
  const collect = (arr: Node[]) =>
    arr.forEach((n) => { if (n.children.length) { allPaths.push(n.path); collect(n.children); } });
  collect(tree);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (p: string) =>
    setOpen((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  const allOpen = allPaths.length > 0 && allPaths.every((p) => open.has(p));

  const cells = (values: Record<string, number>) => cols.map((c, i) => {
    const v = cellVal(values, c);
    return (
      <td key={i} className={"num strong" + (c.sep ? " grp" : "")}
        style={c.color ? { color: dColor(v) } : undefined}>{fmt(v)}</td>
    );
  });

  const render = (nodes: Node[], depth: number): JSX.Element[] => nodes.flatMap((n) => {
    const hasKids = n.children.length > 0;
    const isOpen = open.has(n.path);
    const cls = depth === 0 ? "bsheet__section" : depth === 1 ? "bsheet__group" : "bsheet__detail";
    const note = notes?.[n.name];   // nota al hover si la fila la tiene
    const tr = (
      <tr key={n.path} className={cls} onClick={hasKids ? () => toggle(n.path) : undefined}
        style={hasKids ? { cursor: "pointer" } : undefined}>
        {/* nota al hover: tooltip propio con el N° de nota del BI */}
        <td style={{ paddingLeft: 9 + depth * 20 }}>
          <span className="bsheet__chev">{hasKids ? (isOpen ? "▾" : "▸") : ""}</span>{n.name}
          {note && <NoteTip text={note.text} mark={note.num ?? "i"} />}
        </td>
        {cols.map((c, i) => {
          const v = cellVal(n.values, c);
          return <td key={i} className={"num" + (c.sep ? " grp" : "")}
            style={c.color ? { color: dColor(v) } : undefined}>{fmt(v)}</td>;
        })}
        {noteCol && <td className="bsheet__notecell">{note && <>{note.num != null && <span className="bsheet__noteno">{note.num}</span>}{note.text}</>}</td>}
      </tr>
    );
    return hasKids && isOpen ? [tr, ...render(n.children, depth + 1)] : [tr];
  });

  return (
    <div className="card pivot bsheet">
      <div className="card__title">
        {title}
        <span className="card__actions">
          {onExpand && (
            <Button variant="secondary" size="sm" onClick={onExpand}>⛶ Pantalla completa</Button>
          )}
          {allPaths.length > 0 && (
            <Button variant="secondary" size="sm"
              onClick={() => setOpen(allOpen ? new Set() : new Set(allPaths))}>
              {allOpen ? "Colapsar todo" : "Expandir todo"}
            </Button>
          )}
        </span>
      </div>
      <div className="pivot__scroll">
        <table className="pivot__table bsheet__table">
          <thead>
            {headerGroups && (
              <tr>
                <th></th>
                {headerGroups.map((g, i) => (
                  <th key={g.label} className={i > 0 ? "grp" : ""} style={{ textAlign: "center" }} colSpan={g.cols}>{g.label}</th>
                ))}
                {noteCol && <th></th>}
              </tr>
            )}
            <tr>
              <th>Cuenta</th>
              {cols.map((c, i) => <th key={i} className={"num" + (c.sep ? " grp" : "")}>{c.label}</th>)}
              {noteCol && <th className="grp">Nota</th>}
            </tr>
          </thead>
          <tbody>
            {render(tree, 0)}
            {result && (
              <tr className="pnl__grandtotal">
                <td className="strong">{result.label}</td>
                {cells(result.values)}
                {noteCol && <td />}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

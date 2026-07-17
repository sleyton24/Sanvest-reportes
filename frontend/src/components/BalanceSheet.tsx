// Balance contable: secciones ACTIVOS / PASIVOS / PATRIMONIO con subtotales por
// segmento (N3, colapsables al detalle N2), sin filas en cero, y el cuadre
// Activos = Pasivos + Patrimonio al pie. Soporta varias columnas de valor
// (valueFields, como el BI: Mercado/Costo en UF y USD) y notas al hover (noteField).
import { Fragment, useMemo, useState } from "react";
import { Row, num } from "../api";
import { fmtUF, fmtInt } from "../format";
import { NoteTip } from "./NoteTip";
import { Button } from "./Button";

export type BalanceValueField = { key: string; label: string; fmt?: (v: number) => string; sep?: boolean };

type Props = {
  title: string;
  rows: Row[];
  valueField?: string;
  valueFields?: BalanceValueField[]; // varias columnas de valor (prima sobre valueField)
  headerGroups?: { label: string; cols: number }[]; // fila extra de cabecera agrupando columnas
  sectionField?: string;
  groupField?: string;
  detailField?: string;
  noteField?: string;                // columna con el texto de la nota (tooltip al hover)
  noteNumField?: string;             // columna con el N° de nota (marca del tooltip, como el BI)
  noteCol?: boolean;                 // muestra una columna "Nota" con el texto (pantalla completa)
  onExpand?: () => void;             // botón "pantalla completa" (overlay con notas)
  fmt?: (v: number) => string;
};

const SECTION_ORDER = ["ACTIVOS", "PASIVOS", "Patrimonio"];
const SECTION_LABEL: Record<string, string> = {
  ACTIVOS: "ACTIVOS", PASIVOS: "PASIVOS", Patrimonio: "PATRIMONIO",
};

export function BalanceSheet({
  title, rows, valueField = "Mercado UF QAC", valueFields, headerGroups, sectionField = "N4",
  groupField = "N3", detailField = "N2", noteField = "Nota", noteNumField, noteCol, onExpand, fmt = fmtUF,
}: Props) {
  // columnas de valor: varias (valueFields) o la única retrocompatible (valueField)
  const fields = useMemo<BalanceValueField[]>(
    () => valueFields ?? [{ key: valueField, label: valueField.replace(/\s*(LQ|QAC)$/, "") }],
    [valueFields, valueField]);
  // formato por columna: USD con separador de miles sin "UF"; el resto, fmt (UF)
  const colFmt = (i: number) => fields[i].fmt ?? (/USD/i.test(fields[i].key) ? fmtInt : fmt);

  const sections = useMemo(() => {
    const zero = () => fields.map(() => 0);
    const addTo = (acc: number[], v: number[]) => v.forEach((x, i) => { acc[i] += x; });
    const sm = new Map<string, Map<string, Map<string, { vals: number[]; notes: string[]; nums: number[] }>>>();
    for (const r of rows) {
      const sec = String(r[sectionField] ?? "").trim();
      if (!sec) continue;
      const grp = String(r[groupField] ?? "").trim() || "Otros";
      const det = String(r[detailField] ?? "").trim() || grp;
      if (!sm.has(sec)) sm.set(sec, new Map());
      const gm = sm.get(sec)!;
      if (!gm.has(grp)) gm.set(grp, new Map());
      const dm = gm.get(grp)!;
      const cur = dm.get(det) ?? { vals: zero(), notes: [] as string[], nums: [] as number[] };
      fields.forEach((f, i) => { cur.vals[i] += num(r[f.key]) ?? 0; });
      const nota = String(r[noteField] ?? "").trim();
      if (nota && !cur.notes.includes(nota)) cur.notes.push(nota);
      const nn = noteNumField ? num(r[noteNumField]) : null;
      if (nn != null && nn > 0 && !cur.nums.includes(nn)) cur.nums.push(nn);
      dm.set(det, cur);
    }
    const rank = (s: string) => { const i = SECTION_ORDER.indexOf(s); return i === -1 ? 99 : i; };
    const ordered = [...sm.keys()].sort((a, b) => rank(a) - rank(b));
    return ordered.map((sec) => {
      const gm = sm.get(sec)!;
      const groups = [...gm].map(([name, dm]) => {
        const details = [...dm].map(([dn, d]) => ({
          name: dn, values: d.vals, note: d.notes.join("\n"),
          noteNum: d.nums.sort((a, b) => a - b).join(", "),
        }))
          .filter((x) => x.values.some((v) => Math.abs(v) > 0.5))
          .sort((a, b) => Math.abs(b.values[0]) - Math.abs(a.values[0]));
        const total = zero();
        for (const x of details) addTo(total, x.values);
        return { name, total, details };
      }).filter((g) => g.total.some((v) => Math.abs(v) > 0.5))
        .sort((a, b) => Math.abs(b.total[0]) - Math.abs(a.total[0]));
      const total = zero();
      for (const g of groups) addTo(total, g.total);
      return { name: sec, total, groups };
    });
  }, [rows, fields, sectionField, groupField, detailField, noteField, noteNumField]);

  // totales y cuadre por columna
  const zeros = fields.map(() => 0);
  const total = (n: string) => sections.find((s) => s.name === n)?.total ?? zeros;
  const activos = total("ACTIVOS");
  const pasivos = total("PASIVOS");
  const patrimonio = total("Patrimonio");
  const pasPat = fields.map((_, i) => pasivos[i] + patrimonio[i]);
  const dif = fields.map((_, i) => activos[i] - pasPat[i]);
  const cuadra = dif.every((d) => Math.abs(d) < 1);

  const numCells = (vals: number[]) =>
    fields.map((f, i) => <td key={i} className={"num" + (f.sep ? " grp" : "")}>{colFmt(i)(vals[i])}</td>);
  // celda de nota (texto) al final de la fila, solo cuando noteCol está activo
  const noteCell = (text?: string) =>
    noteCol ? <td className="bsheet__notecell">{text ?? ""}</td> : null;

  const secKey = (s: string) => "S|" + s;
  const grpKey = (s: string, g: string) => "G|" + s + "|" + g;
  const allKeys = [
    ...sections.map((s) => secKey(s.name)),
    ...sections.flatMap((s) => s.groups.map((g) => grpKey(s.name, g.name))),
  ];
  // arranca colapsado: solo ACTIVOS / PASIVOS / PATRIMONIO; se va abriendo
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setOpen((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const allOpen = allKeys.length > 0 && allKeys.every((k) => open.has(k));

  return (
    <div className="card pivot bsheet">
      <div className="card__title">
        {title}
        <span className="card__actions">
          {onExpand && (
            <Button variant="secondary" size="sm" onClick={onExpand}>⛶ Pantalla completa</Button>
          )}
          <Button variant="secondary" size="sm"
            onClick={() => setOpen(allOpen ? new Set() : new Set(allKeys))}>
            {allOpen ? "Colapsar todo" : "Expandir todo"}
          </Button>
        </span>
      </div>
      <div className="pivot__scroll">
        <table className="pivot__table bsheet__table">
          <thead>
            {headerGroups && (
              <tr>
                <th></th>
                {headerGroups.map((g, i) => (
                  <th key={g.label} className={"num" + (i > 0 ? " grp" : "")} colSpan={g.cols}>{g.label}</th>
                ))}
                {noteCol && <th></th>}
              </tr>
            )}
            <tr>
              <th>Cuenta</th>
              {fields.map((f) => <th key={f.key} className={"num" + (f.sep ? " grp" : "")}>{f.label}</th>)}
              {noteCol && <th className="grp">Nota</th>}
            </tr>
          </thead>
          <tbody>
            {sections.map((sec) => {
              const sOpen = open.has(secKey(sec.name));
              return (
                <Fragment key={sec.name}>
                  <tr className="bsheet__section" onClick={() => toggle(secKey(sec.name))}>
                    <td><span className="bsheet__chev">{sOpen ? "▾" : "▸"}</span>{SECTION_LABEL[sec.name] ?? sec.name}</td>
                    {numCells(sec.total)}
                    {noteCell()}
                  </tr>
                  {sOpen && sec.groups.map((g) => {
                    const k = grpKey(sec.name, g.name);
                    const gOpen = open.has(k);
                    return (
                      <Fragment key={k}>
                        <tr className="bsheet__group" onClick={() => toggle(k)}>
                          <td><span className="bsheet__chev">{gOpen ? "▾" : "▸"}</span>{g.name}</td>
                          {numCells(g.total)}
                          {noteCell()}
                        </tr>
                        {gOpen && g.details.map((d) => (
                          <tr className="bsheet__detail" key={k + "|" + d.name}>
                            {/* nota al hover: tooltip propio con el N° de nota del BI */}
                            <td>
                              {d.name}
                              {d.note && <NoteTip text={d.note} mark={d.noteNum || "i"} />}
                            </td>
                            {numCells(d.values)}
                            {noteCol && <td className="bsheet__notecell">{d.noteNum && <span className="bsheet__noteno">{d.noteNum}</span>}{d.note}</td>}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
            <tr className="bsheet__check"><td>TOTAL ACTIVOS</td>{numCells(activos)}{noteCell()}</tr>
            <tr className="bsheet__check"><td>TOTAL PATRIMONIO</td>{numCells(patrimonio)}{noteCell()}</tr>
            <tr className="bsheet__check">
              <td>TOTAL PASIVOS + PATRIMONIO</td>{numCells(pasPat)}{noteCell()}
            </tr>
            {/* Solo se muestra si el balance NO cuadra (alerta de descuadre). Cuando
                cuadra —el caso normal— se omite para no dejar una fila de ceros de ruido. */}
            {!cuadra && (
              <tr className="bsheet__dif">
                <td>Diferencia (descuadre)</td>
                {numCells(dif)}{noteCell()}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

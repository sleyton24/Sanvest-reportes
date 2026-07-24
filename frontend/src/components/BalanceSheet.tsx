// Balance contable: secciones ACTIVOS / PASIVOS / PATRIMONIO con subtotales por
// segmento (N3), tipo de cuenta (N2) y —si se pide subField (N1)— el detalle de
// cuentas, todos colapsables; sin filas en cero, y el cuadre Activos = Pasivos +
// Patrimonio al pie. Soporta varias columnas de valor (valueFields, como el BI:
// Mercado/Costo en UF y USD) y notas al hover (noteField).
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
  subField?: string;                 // 4º nivel (más profundo, p.ej. N1): detalle de cuentas
  orderField?: string;               // si se pasa, respeta ESE orden (p.ej. "Indice" del Excel) en vez de ordenar por monto
  showZeros?: boolean;               // muestra también cuentas/grupos en cero (replica exacta del Excel)
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
  groupField = "N3", detailField = "N2", subField, orderField, showZeros, noteField = "Nota", noteNumField, noteCol, onExpand, fmt = fmtUF,
}: Props) {
  const HAS_SUB = !!subField;
  // columnas de valor: varias (valueFields) o la única retrocompatible (valueField)
  const fields = useMemo<BalanceValueField[]>(
    () => valueFields ?? [{ key: valueField, label: valueField.replace(/\s*(LQ|QAC)$/, "") }],
    [valueFields, valueField]);
  // formato por columna: USD con separador de miles sin "UF"; el resto, fmt (UF)
  const colFmt = (i: number) => fields[i].fmt ?? (/USD/i.test(fields[i].key) ? fmtInt : fmt);

  const sections = useMemo(() => {
    const zero = () => fields.map(() => 0);
    const addTo = (acc: number[], v: number[]) => v.forEach((x, i) => { acc[i] += x; });
    type Bucket = { vals: number[]; notes: string[]; nums: number[]; ord: number };
    // sec -> grp (N3) -> det (N2) -> sub (N1, o el propio det si no hay subField)
    const sm = new Map<string, Map<string, Map<string, Map<string, Bucket>>>>();
    for (const r of rows) {
      const sec = String(r[sectionField] ?? "").trim();
      if (!sec) continue;
      const grp = String(r[groupField] ?? "").trim() || "Otros";
      const det = String(r[detailField] ?? "").trim() || grp;
      const sub = subField ? (String(r[subField] ?? "").trim() || det) : det;
      const ordv = orderField ? (num(r[orderField]) ?? Infinity) : 0;   // orden Excel (Indice)
      const gm = sm.get(sec) ?? sm.set(sec, new Map()).get(sec)!;
      const dm = gm.get(grp) ?? gm.set(grp, new Map()).get(grp)!;
      const subm = dm.get(det) ?? dm.set(det, new Map()).get(det)!;
      const cur = subm.get(sub) ?? { vals: zero(), notes: [], nums: [], ord: Infinity };
      fields.forEach((f, i) => { cur.vals[i] += num(r[f.key]) ?? 0; });
      cur.ord = Math.min(cur.ord, ordv);
      const nota = String(r[noteField] ?? "").trim();
      if (nota && !cur.notes.includes(nota)) cur.notes.push(nota);
      const nn = noteNumField ? num(r[noteNumField]) : null;
      if (nn != null && nn > 0 && !cur.nums.includes(nn)) cur.nums.push(nn);
      subm.set(sub, cur);
    }
    const rank = (s: string) => { const i = SECTION_ORDER.indexOf(s); return i === -1 ? 99 : i; };
    const mkLeaf = (name: string, b: Bucket) => ({
      name, values: b.vals, note: b.notes.join("\n"), noteNum: b.nums.sort((a, c) => a - c).join(", "), ord: b.ord,
    });
    // filtro de "no-cero": oculta filas/grupos en cero, salvo showZeros (replica del Excel)
    const nz = (v: number[]) => showZeros || v.some((x) => Math.abs(x) > 0.5);
    // orden: por Indice del Excel (replica el balance del archivo) si se pasó orderField;
    // si no, por monto descendente (comportamiento clásico).
    const byVal = (a: { values?: number[]; total?: number[] }, b: { values?: number[]; total?: number[] }) =>
      Math.abs((b.values ?? b.total!)[0]) - Math.abs((a.values ?? a.total!)[0]);
    const byOrd = (a: { ord: number }, b: { ord: number }) => a.ord - b.ord;
    const sortNodes = <T extends { ord: number; values?: number[]; total?: number[] }>(xs: T[]) =>
      orderField ? xs.sort(byOrd) : xs.sort(byVal);
    return [...sm.keys()].sort((a, b) => rank(a) - rank(b)).map((sec) => {
      const gm = sm.get(sec)!;
      const groups = [...gm].map(([gname, dm]) => {
        const details = [...dm].map(([dname, subm]) => {
          let subs = sortNodes([...subm].map(([sname, b]) => mkLeaf(sname, b)).filter((x) => nz(x.values)));
          const total = zero(); for (const s of subs) addTo(total, s.values);
          const ord = subs.length ? Math.min(...subs.map((s) => s.ord)) : Infinity;
          // Nota del grupo (N2), como en el Excel: la nota va en la fila del grupo, no en
          // cada cuenta. Si TODAS las cuentas comparten una única nota, es del grupo → se
          // muestra en el grupo y se quita de las cuentas. Si difieren, cada cuenta conserva
          // la suya (notas a nivel de cuenta, como también las trae el Excel).
          let dNote = "", dNum = "";
          if (HAS_SUB) {
            const nums = subs.map((s) => s.noteNum).filter(Boolean);
            const uniq = [...new Set(nums)];
            if (uniq.length === 1 && nums.length === subs.length) {
              const src = subs.find((s) => s.noteNum);
              dNote = src?.note ?? ""; dNum = uniq[0];
              subs = subs.map((s) => ({ ...s, note: "", noteNum: "" }));
            }
          } else {
            const leaf = subs.length === 1 ? subs[0] : null;
            dNote = leaf?.note ?? ""; dNum = leaf?.noteNum ?? "";
          }
          return { name: dname, total, subs, ord, note: dNote, noteNum: dNum };
        }).filter((d) => nz(d.total));
        const dets = sortNodes(details);
        const total = zero(); for (const d of dets) addTo(total, d.total);
        const ord = dets.length ? Math.min(...dets.map((d) => d.ord)) : Infinity;
        return { name: gname, total, details: dets, ord };
      }).filter((g) => nz(g.total));
      const grps = sortNodes(groups);
      const total = zero(); for (const g of grps) addTo(total, g.total);
      return { name: sec, total, groups: grps };
    });
  }, [rows, fields, sectionField, groupField, detailField, subField, orderField, showZeros, noteField, noteNumField, HAS_SUB]);

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
  const noteCell = (text?: string) => noteCol ? <td className="bsheet__notecell">{text ?? ""}</td> : null;

  const secKey = (s: string) => "S|" + s;
  const grpKey = (s: string, g: string) => "G|" + s + "|" + g;
  const detKey = (s: string, g: string, d: string) => "D|" + s + "|" + g + "|" + d;
  const allKeys = [
    ...sections.map((s) => secKey(s.name)),
    ...sections.flatMap((s) => s.groups.map((g) => grpKey(s.name, g.name))),
    ...(HAS_SUB ? sections.flatMap((s) => s.groups.flatMap((g) => g.details.map((d) => detKey(s.name, g.name, d.name)))) : []),
  ];
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setOpen((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const allOpen = allKeys.length > 0 && allKeys.every((k) => open.has(k));

  // fila de detalle final (hoja): N2 cuando no hay subField, N1 cuando sí
  const leafRow = (key: string, name: string, values: number[], note: string, noteNum: string, pad: number) => (
    <tr className="bsheet__detail" key={key}>
      <td style={{ paddingLeft: pad }}>
        {name}
        {note && <NoteTip text={note} mark={noteNum || "i"} />}
      </td>
      {numCells(values)}
      {noteCol && <td className="bsheet__notecell">{noteNum && <span className="bsheet__noteno">{noteNum}</span>}{note}</td>}
    </tr>
  );

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
                  <th key={g.label} className={i > 0 ? "grp" : ""} style={{ textAlign: "center" }} colSpan={g.cols}>{g.label}</th>
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
                  <tr className={"bsheet__section" + (sec.name === "Patrimonio" ? " bsheet__section--green" : "")} onClick={() => toggle(secKey(sec.name))}>
                    <td><span className="bsheet__chev">{sOpen ? "▾" : "▸"}</span>{SECTION_LABEL[sec.name] ?? sec.name}</td>
                    {numCells(sec.total)}
                    {noteCell()}
                  </tr>
                  {sOpen && sec.groups.map((g) => {
                    const gk = grpKey(sec.name, g.name);
                    const gOpen = open.has(gk);
                    return (
                      <Fragment key={gk}>
                        <tr className="bsheet__group" onClick={() => toggle(gk)}>
                          <td><span className="bsheet__chev">{gOpen ? "▾" : "▸"}</span>{g.name}</td>
                          {numCells(g.total)}
                          {noteCell()}
                        </tr>
                        {gOpen && g.details.map((d) => {
                          // sin subField: N2 es la hoja (comportamiento clásico)
                          if (!HAS_SUB) return leafRow(gk + "|" + d.name, d.name, d.total, d.note, d.noteNum, 54);
                          // con subField: N2 es subgrupo colapsable con el detalle N1 debajo
                          const dk = detKey(sec.name, g.name, d.name);
                          const dOpen = open.has(dk);
                          return (
                            <Fragment key={dk}>
                              <tr className="bsheet__subgroup" onClick={() => toggle(dk)}>
                                <td style={{ paddingLeft: 48 }}>
                                  <span className="bsheet__chev">{dOpen ? "▾" : "▸"}</span>{d.name}
                                  {d.note && <NoteTip text={d.note} mark={d.noteNum || "i"} />}
                                </td>
                                {numCells(d.total)}
                                {noteCol && <td className="bsheet__notecell">{d.noteNum && <span className="bsheet__noteno">{d.noteNum}</span>}{d.note}</td>}
                              </tr>
                              {dOpen && d.subs.map((s) => leafRow(dk + "|" + s.name, s.name, s.values, s.note, s.noteNum, 68))}
                            </Fragment>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
            <tr className="bsheet__check"><td>TOTAL PASIVOS + PATRIMONIO</td>{numCells(pasPat)}{noteCell()}</tr>
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

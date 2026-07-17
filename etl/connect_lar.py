"""Conexión LAR: aplica un Informe de Gestión mensual a las tablas planas del
panel preservando el HISTÓRICO (upsert por clave de negocio, no replace).

- Indicadores Financieros: upsert por (Nombre activo, Item, FechaID); recalcula
  YTD REAL/PPTO (acumulado del año).
- Real+PPTO+LY: upsert por (Activo, Fecha ID) actualizando las columnas R/p del
  informe; recalcula YTD (cumsum del año) y LY (Real mes-12) sobre TODA la tabla
  (usa el histórico ya cargado para el año anterior).

Las filas de periodos/activos no tocados por el informe se conservan intactas.
"""
from __future__ import annotations

import pandas as pd
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from .informes_lar import (FLOW, LY_COLS, RPL_COLS, TARIFF_YTD_COLS,
                           assemble_real_ppto_ly, consolidado_largroup_facts,
                           consolidado_to_indicadores_lar, extract_facts,
                           extract_kpi_ytd, facts_to_indicadores)


def _read(engine: Engine, table: str) -> pd.DataFrame:
    return pd.read_sql_query(f'SELECT * FROM "{table}"', engine)


def _write(engine: Engine, table: str, df: pd.DataFrame) -> None:
    """Escribe a SQL convirtiendo fechas (Timestamp/datetime) a string, para que
    el upsert sea idempotente (SQLite no liga objetos Timestamp)."""
    df = df.copy()
    for c in df.columns:
        if str(df[c].dtype).startswith("datetime"):
            df[c] = df[c].astype(str)
        elif df[c].dtype == object:
            df[c] = df[c].map(
                lambda v: v.isoformat(sep=" ") if (hasattr(v, "isoformat") and not isinstance(v, str)) else v)
    # Reemplazo de datos SIN DDL: si la tabla existe (prod), vaciar e insertar en
    # una transacción (requiere solo DELETE/INSERT, no CREATE en el schema — el
    # usuario de la app NO tiene CREATE en 'public' en Postgres 15+). Solo crea la
    # tabla si aún no existe (instalación nueva / dev).
    if inspect(engine).has_table(table):
        with engine.begin() as con:
            con.exec_driver_sql(f'DELETE FROM "{table}"')
            df.to_sql(table, con, if_exists="append", index=False)
    else:
        df.to_sql(table, engine, if_exists="replace", index=False)


def _fid(v) -> int:
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return -1


# ----------------------------- Indicadores Financieros -----------------------
def upsert_indicadores(engine: Engine, new_ind: pd.DataFrame) -> dict:
    cur = _read(engine, "indicadores_financieros")
    cols = list(cur.columns)
    # metadatos por Item (Indice, Indice2, Item 2) tomados del histórico
    meta = (cur.dropna(subset=["Item"]).groupby("Item")
            .agg({c: "first" for c in ["Indice", "Indice2", "Item 2"] if c in cols})
            .to_dict("index"))

    cur["_k"] = [f"{a}|{i}|{_fid(f)}"
                 for a, i, f in zip(cur["Nombre activo"], cur["Item"], cur["FechaID"])]
    existing = set(cur["_k"])
    new_by_k = {f"{r['Nombre activo']}|{r['Item']}|{_fid(r['FechaID'])}": r
                for _, r in new_ind.iterrows()}

    n_upd = 0  # actualizar EN SITIO (conserva Versión_Proyección y demás columnas)
    for k, r in new_by_k.items():
        if k in existing:
            sel = cur["_k"] == k
            cur.loc[sel, "Versión_Real"] = r["Versión_Real"]
            cur.loc[sel, "Versión_Ppto"] = r["Versión_Ppto"]
            n_upd += 1
    inserts = []
    for k, r in new_by_k.items():
        if k not in existing:
            row = {c: None for c in cols}
            m = meta.get(r["Item"], {})
            row.update({
                "Nombre activo": r["Nombre activo"], "Item": r["Item"],
                "Periodo": r["Periodo"], "mes": r["mes"], "anio": r["anio"],
                "FechaID": _fid(r["FechaID"]),
                "Versión_Real": r["Versión_Real"], "Versión_Ppto": r["Versión_Ppto"],
                "Indice": m.get("Indice"), "Indice2": m.get("Indice2"),
                "Item 2": m.get("Item 2"),
            })
            inserts.append(row)
    cur = cur.drop(columns=["_k"])
    merged = (pd.concat([cur, pd.DataFrame(inserts, columns=cols)], ignore_index=True)
              if inserts else cur)
    keep = cur  # para el reporte

    # YTD = acumulado del año por (activo, item)
    merged = merged.sort_values(["Nombre activo", "Item", "FechaID"])
    g = merged.groupby(["Nombre activo", "Item", "anio"])
    merged["YTD REAL"] = g["Versión_Real"].cumsum()
    merged["YTD PPTO"] = g["Versión_Ppto"].cumsum()
    _write(engine, "indicadores_financieros", merged)
    return {"filas_resultantes": len(merged), "filas_actualizadas": n_upd,
            "filas_insertadas": len(inserts)}


# ----------------------------- Real+PPTO+LY ----------------------------------
def upsert_real_ppto_ly(engine: Engine, facts: pd.DataFrame,
                        kpi_ytd: dict | None = None) -> dict:
    cur = _read(engine, "real_ppto_ly").copy()
    asm = assemble_real_ppto_ly(facts)  # columnas R/p del informe (+YTD/LY parciales)
    upd_cols = [c for pair in RPL_COLS.values() for c in pair if c in cur.columns]

    cur["_k"] = [f"{a}|{_fid(f)}" for a, f in zip(cur["Activo"], cur["Fecha ID"])]
    existing = set(cur["_k"])
    asm = asm.reset_index(drop=True)
    asm_keys = [f"{a}|{_fid(f)}" for a, f in zip(asm["Activo"], asm["Fecha ID"])]

    inserts = []
    n_upd = 0
    for i, key in enumerate(asm_keys):
        a = asm.iloc[i]
        if key in existing:
            sel = cur["_k"] == key
            for c in upd_cols:
                if c in asm.columns and pd.notna(a.get(c)):
                    cur.loc[sel, c] = a[c]
            n_upd += 1
        else:
            row = {c: None for c in cur.columns}
            row.update({"Activo": a["Activo"], "Periodo": a.get("Periodo"),
                        "Fecha ID": _fid(a["Fecha ID"]), "Año": a.get("Año"),
                        "Mes": a.get("Mes"), "Año p": a.get("Año"), "Mes p": a.get("Mes")})
            for c in upd_cols:
                if c in asm.columns:
                    row[c] = a.get(c)
            inserts.append(row)
    if inserts:
        cur = pd.concat([cur, pd.DataFrame(inserts, columns=cur.columns)], ignore_index=True)
    cur = cur.drop(columns=["_k"], errors="ignore")

    # recomputar YTD (cumsum del año) y LY (Real mes-12) sobre TODA la tabla
    cur = cur.sort_values(["Activo", "Fecha ID"]).reset_index(drop=True)
    for m in FLOW:
        rc, pc = RPL_COLS[m]
        for src, suff in ((rc, "R"), (pc, "p")):
            ycol = f"{m} YTD {suff}"
            if src in cur.columns and ycol in cur.columns:
                cur[ycol] = cur.groupby(["Activo", "Año"])[src].cumsum()
    # YTD de tarifas UF/m²: el informe mensual no los trae (venían precalculados
    # en la fuente original) → el mes nuevo quedaba en 0. Se RELLENAN solo las
    # celdas 0/NULL —sin pisar el histórico validado— con el promedio acumulado
    # del año de los meses con dato (0 = sin dato: una tarifa real nunca es 0).
    for m, (ytd_r, ytd_p) in TARIFF_YTD_COLS.items():
        rc, pc = RPL_COLS[m]
        for src, ycol in ((rc, ytd_r), (pc, ytd_p)):
            if src not in cur.columns or ycol not in cur.columns:
                continue
            s = pd.to_numeric(cur[src], errors="coerce")
            s = s.mask(s == 0)
            calc = s.groupby([cur["Activo"], cur["Año"]]).transform(
                lambda g: g.expanding().mean())
            stored = pd.to_numeric(cur[ycol], errors="coerce")
            fill = (stored.isna() | (stored == 0)) & calc.notna()
            cur.loc[fill, ycol] = calc[fill]

    # si el informe trae el bloque "YTD <año>" (extract_kpi_ytd), ese valor EXACTO
    # pisa el promedio en el mes reportado ({activo: {metric: {fid, Real, Ppto}}})
    for activo, mets in (kpi_ytd or {}).items():
        for m, d in mets.items():
            ytd_r, ytd_p = TARIFF_YTD_COLS[m]
            sel = (cur["Activo"] == activo) & (cur["Fecha ID"].map(_fid) == d["fid"])
            if ytd_r in cur.columns and d.get("Real") is not None:
                cur.loc[sel, ytd_r] = d["Real"]
            if ytd_p in cur.columns and d.get("Ppto") is not None:
                cur.loc[sel, ytd_p] = d["Ppto"]

    lookup = {}
    for m in LY_COLS:
        rc = RPL_COLS[m][0]
        if rc in cur.columns:
            for _, r in cur.iterrows():
                lookup[(m, r["Activo"], _fid(r["Fecha ID"]))] = r.get(rc)
    for m, ly in LY_COLS.items():
        if ly in cur.columns:
            cur[ly] = cur.apply(lambda r: lookup.get((m, r["Activo"], _fid(r["Fecha ID"]) - 100)), axis=1)

    _write(engine, "real_ppto_ly", cur)
    return {"filas_resultantes": len(cur), "filas_actualizadas": n_upd,
            "filas_insertadas": len(inserts)}


# ----------------------------- Indicadores Financieros Lar (holding) ---------
def upsert_indicadores_lar(engine: Engine, new_df: pd.DataFrame) -> dict:
    cur = _read(engine, "indicadores_financieros_lar")
    cols = list(cur.columns)
    n1c = "Nivel 1 " if "Nivel 1 " in cols else "Nivel 1"

    def key(n1, n2, fid):
        return f"{str(n1).strip()}|{str(n2).strip()}|{_fid(fid)}"

    cur["_k"] = [key(a, b, f) for a, b, f in zip(cur[n1c], cur["Nivel 2"], cur["FechaID"])]
    existing = set(cur["_k"])
    upd_cols = ["Real Peso", "PPTO Peso", "Versión_Real", "Versión_Ppto", "UF Mes",
                "YTD REAL", "YTD PPTO"]
    n_upd, inserts = 0, []
    for _, r in new_df.iterrows():
        k = key(r["Nivel 1 "], r["Nivel 2"], r["FechaID"])
        if k in existing:
            sel = cur["_k"] == k
            for c in upd_cols:
                if c in new_df.columns and c in cur.columns:
                    cur.loc[sel, c] = r.get(c)
            n_upd += 1
        else:
            row = {c: None for c in cols}
            row[n1c] = r["Nivel 1 "]
            for c in ["Nivel 2", "Periodo", "Mes", "Año", "Indice", "FechaID"] + upd_cols:
                if c in cols:
                    row[c] = r.get(c)
            inserts.append(row)
    cur = cur.drop(columns=["_k"])
    merged = (pd.concat([cur, pd.DataFrame(inserts, columns=cols)], ignore_index=True)
              if inserts else cur)
    _write(engine, "indicadores_financieros_lar", merged)
    return {"filas_resultantes": len(merged), "filas_actualizadas": n_upd,
            "filas_insertadas": len(inserts)}


# ----------------------------- orquestación ----------------------------------
def apply_informes(engine: Engine, specs: list[tuple], consolidado=None) -> dict:
    """specs = [(ruta_informe, activo), ...] (SOHO, PARK) de un mismo mes.
    `consolidado` (opcional) = ruta del Informe LAR GROUP consolidado -> alimenta
    Indicadores Financieros Lar (holding) + las filas LARGROUP de las otras dos."""
    facts = [extract_facts(p, a) for p, a in specs]
    kpi_ytd = {a: y for p, a in specs if (y := extract_kpi_ytd(p, a))}
    if consolidado:
        facts.append(consolidado_largroup_facts(consolidado))
    facts = pd.concat(facts, ignore_index=True)
    ind = facts_to_indicadores(facts)
    out = {
        "indicadores_financieros": upsert_indicadores(engine, ind),
        "real_ppto_ly": upsert_real_ppto_ly(engine, facts, kpi_ytd),
    }
    if consolidado:
        out["indicadores_financieros_lar"] = upsert_indicadores_lar(
            engine, consolidado_to_indicadores_lar(consolidado))
    return out

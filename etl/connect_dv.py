"""Conexión DV (Desarrollo para la Venta): aplica los informes mensuales crudos a
las tablas planas DV, ACUMULATIVO y con estado (ver docs/dv_actualizacion.md).

Por proyecto:
 - Millalongo: full (Rentabilidad→Egresos, Escrituración→ventas, Informe Mensual→KPIs).
 - Sta. Victoria 99: 100% vendido → ventas/KPIs CONGELADOS (carry-forward); solo Egresos.
 - Sta. Victoria 155: preventa → Egresos (Rentabilidad); ventas carry-forward; Línea/Preventas
   manual → carry-forward del mes anterior (recalcula Capital).
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

import pandas as pd
from sqlalchemy.engine import Engine

from .connect_lar import _read, _write
from . import informes_dv as I

PROJ = list(I.PROJECTS.keys())            # Millalongo, Sta. Victoria 99, Sta. Victoria 155
ML, SV99, SV155 = PROJ[0], PROJ[1], PROJ[2]


def _num(s):
    return pd.to_numeric(s, errors="coerce")


def _fid_at(cur: pd.DataFrame, proj_col: str, proj: str, fid_col: str, fid: int) -> pd.DataFrame:
    return cur[(cur[proj_col].astype(str) == proj) & (_num(cur[fid_col]) == fid)]


def _carry(prev: pd.DataFrame, period_vals: dict) -> pd.DataFrame:
    """Copia las filas del mes anterior cambiando solo las columnas de período."""
    out = prev.copy()
    for k, v in period_vals.items():
        if k in out.columns:
            out[k] = v
    return out


def _upsert(engine: Engine, table: str, new: pd.DataFrame, proj_col: str, fid_col: str) -> dict:
    """Reemplaza las filas (proyecto, FechID) presentes en `new`, conserva el resto."""
    cur = _read(engine, table)
    if new.empty:
        return {"tabla": table, "filas_resultantes": int(len(cur)), "filas_actualizadas": 0, "filas_insertadas": 0}
    key = lambda d: d[proj_col].astype(str) + "|" + _num(d[fid_col]).astype("Int64").astype(str)
    nk, ck = set(key(new)), set(key(cur))
    keep = cur[~key(cur).isin(nk)]
    merged = pd.concat([keep, new[list(cur.columns)]], ignore_index=True)
    _write(engine, table, merged)
    return {"tabla": table, "filas_resultantes": int(len(merged)),
            "filas_actualizadas": int(len(nk & ck)), "filas_insertadas": int(len(nk - ck))}


def apply_dv(engine: Engine, paths: dict) -> dict:
    """`paths` = {rentabilidad, estadistica, informe_mensual, escrituracion: {proj: path}}."""
    rent = paths["rentabilidad"]
    estad = paths.get("estadistica")
    inf_men = paths.get("informe_mensual")
    escr = paths.get("escrituracion", {})           # {proyecto: ruta}

    year, month = I.rentab_asof(rent, "MI.72")
    fid = year * 100 + month
    py, pm = (year - 1, 12) if month == 1 else (year, month - 1)
    prev_fid = py * 100 + pm
    res = {}

    # ---------------- USOS Y FONDOS ----------------
    uf = _read(engine, "dv_uso_y_fondo")
    rows = []
    for proj in PROJ:
        sheet = I.PROJECTS[proj]["rentab"]
        flujo = I.rentab_flujo(rent, sheet, year, month)
        prev = _fid_at(uf, "Nombre proyecto", proj, "Fecha ID", prev_fid)
        def prevmonto(sub):
            r = prev[prev["SUBCATEGORIA"] == sub]
            return float(_num(r["Monto"]).iloc[0]) if len(r) else 0.0
        prev_egr = prevmonto("EGRESOS A LA FECHA")
        sv155_lin = prevmonto("LÍNEA DE CRÉDITO GIRADA") if proj == SV155 else None   # manual → carry
        sv155_pag = prevmonto("PREVENTAS") if proj == SV155 else None                 # carry
        rows += I.usos_y_fondos_rows({"egresos": prev_egr}, proj, year, month, flujo, sv155_pag, sv155_lin)
    res["dv_uso_y_fondo"] = _upsert(engine, "dv_uso_y_fondo", pd.DataFrame(rows), "Nombre proyecto", "Fecha ID")

    # ---------------- Amortización ----------------
    am = _read(engine, "amortizacion")
    arows = []
    for proj in PROJ:
        lin = next((r for r in rows if r["Nombre proyecto"] == proj
                    and r["SUBCATEGORIA"] == "LÍNEA DE CRÉDITO GIRADA"), {}).get("Monto", 0.0)
        arows.append(I.amortizacion_rows(proj, year, month, lin))
    res["amortizacion"] = _upsert(engine, "amortizacion", pd.DataFrame(arows), "Proyecto", "FechaID")

    # ---------------- Evolución de Costos (Costos Reales = Egresos/1000) ----------------
    ec = _read(engine, "dv_evolucion_de_costos")
    erows = []
    for proj in PROJ:
        egr = next((r for r in rows if r["Nombre proyecto"] == proj
                    and r["SUBCATEGORIA"] == "EGRESOS A LA FECHA"), {}).get("Monto", 0.0)
        prev = _fid_at(ec, "Nombre proyecto", proj, "Fecha Id", prev_fid)
        prev_row = prev.iloc[0].to_dict() if len(prev) else {}
        erows.append(I.evol_costos_row(prev_row, proj, year, month, egr))
    res["dv_evolucion_de_costos"] = _upsert(engine, "dv_evolucion_de_costos", pd.DataFrame(erows), "Nombre proyecto", "Fecha Id")

    # ---------------- Escrituras / Ventas ----------------
    for table, fcol, ventas in [("dv_escrituras", "Fehca ID ", False), ("dv_ventas", "Fecha ID ", True)]:
        cur = _read(engine, table)
        proy = I.PROY_VTA_VENTAS if ventas else I.PROY_VTA_ESCR
        out = []
        for proj in PROJ:
            ep = escr.get(proj)
            est = I.estadistica_venta(estad, I.PROJECTS[proj]["estad"]) if estad else None
            if proj == ML and ep:                       # Millalongo: desde Escrituración
                src = I.escrituracion_resumen(ep)
                out.append(I.escrituras_ventas_row(proj, "REAL", year, month, src, proy[proj], ventas))
            elif est and est.get("recaud") is not None and est.get("por_rec") is not None:
                # SV99/SV155: RECOMPUTAR desde la Estadística de Ventas (antes se hacía
                # carry-forward del mes anterior, que congelaba abril/mayo con valores de
                # marzo). Recaud/PorRec = Pagado (col P); VtasAcum escrituras = Recaud+PorRec;
                # VtasAcum ventas SV99 = Sub-Total Precio Venta; unidades desde 'Deptos.'.
                unid = est.get("unid_vendidas") or 0
                if proj == SV99:                          # 100% escriturado
                    esc_rec, esc_firm, res_prom = unid, 0, 0
                    vtas_acum = est["vtas_acum"] if ventas else (est["recaud"] + est["por_rec"])
                else:                                     # SV155 en preventa
                    esc_rec, esc_firm, res_prom = 0, 0, unid
                    vtas_acum = est["recaud"] + est["por_rec"]
                src = {"vtas_acum": vtas_acum, "recaud": est["recaud"], "por_rec": est["por_rec"],
                       "esc_rec": esc_rec, "esc_firm": esc_firm, "res_prom": res_prom}
                out.append(I.escrituras_ventas_row(proj, "REAL", year, month, src, proy[proj], ventas))
            else:                                        # sin Estadística: fallback carry-forward
                prev = _fid_at(cur, "Nombre proyecto", proj, fcol, prev_fid)
                pcol = "Año Mes " if ventas else "Periodo"
                out.append(_carry(prev, {pcol: f"{year}-{month:02d}-01", fcol: fid,
                                         "Mes de carga": month, "Año de carga": year}))
        new = pd.concat([d if isinstance(d, pd.DataFrame) else pd.DataFrame([d]) for d in out], ignore_index=True)
        res[table] = _upsert(engine, table, new, "Nombre proyecto", fcol)

    # ---------------- KPIS ----------------
    # UNIDADES_VENDIDAS = acumulado autoritativo de la Estadística de Ventas (fila
    # 'Deptos.', col D), para los 3 proyectos — NO prev+neto ni carry-forward, que
    # perdían/congelaban el dato (ML marcaba 4/6 en vez de 120/122; SV155 quedaba en
    # la proyección vieja). Las netas del mes salen del Informe Mensual (ML) o se
    # derivan del acumulado previo. Sin Estadística → carry-forward como antes.
    kp = _read(engine, "dv_kpis")
    krows = []
    for proj in PROJ:
        sheet = I.PROJECTS[proj]["estad"]
        est = I.estadistica_venta(estad, sheet) if estad else {}
        cum = est.get("unid_vendidas")
        prev = _fid_at(kp, "Nombre proyecto", proj, "Fecha ID", prev_fid)
        prevnp = prev[prev["Versión"].astype(str).str.upper() != "PPTO"]  # excluir presupuesto
        prev_cum = float(_num(prevnp["UNIDADES_VENDIDAS"]).max()) if len(prevnp) else 0.0
        if cum is None:  # sin Estadística disponible → conservar comportamiento previo
            krows.append(_carry(prev, {"Periodo": f"{year}-{month:02d}-01", "Fecha ID": fid, "Mes": month, "Año": year}))
            continue
        if proj == ML and inf_men:
            im = I.informe_mensual(inf_men, sheet, year, month)
            netas = im.get("ventas_mes_unid")
            if netas is None:
                netas = cum - prev_cum
        else:
            netas = cum - prev_cum
        krows.append(I.kpis_row(proj, year, month, netas, cum))
    new_k = pd.concat([d if isinstance(d, pd.DataFrame) else pd.DataFrame([d]) for d in krows], ignore_index=True)
    res["dv_kpis"] = _upsert(engine, "dv_kpis", new_k, "Nombre proyecto", "Fecha ID")

    # ---------------- Construcción / Indicadores (carry-forward) ----------------
    for table, fcol, pcols in [
        ("dv_construccion", "Fecha ID ", {"Periodo": f"{year}-{month:02d}-01", "Mes de carga ": month, "Año de carga": year}),
        ("dv_indicadores_financieros", "fecha ID ", {"Periodo": f"{year}-{month:02d}-01", "Mes": month, "Año": year}),
    ]:
        cur = _read(engine, table)
        out = []
        for proj in PROJ:
            prev = _fid_at(cur, "Nombre proyecto", proj, fcol, prev_fid)
            out.append(_carry(prev, {**pcols, fcol: fid}))
        new = pd.concat(out, ignore_index=True) if out else pd.DataFrame()
        res[table] = _upsert(engine, table, new, "Nombre proyecto", fcol)

    return {"periodo": fid, "tablas": res}

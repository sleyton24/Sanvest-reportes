"""Transforms: Informe de Gestión (SOHO/PARK) -> tablas planas del panel RR.

Arquitectura (mantiene histórico):
  informe -> extract_facts (largo: Activo, Periodo, métrica, Real, Ppto)
          -> [upsert en almacén de hechos, semilla = histórico del panel]
          -> assemble_*  (Indicadores Financieros / Real+PPTO+LY)

Reglas derivadas y VERIFICADAS por value-matching contra el panel:
 - filas por etiqueta en col B (difieren entre SOHO/PARK)
 - columnas en pares Real/Ppto por mes (marcadores en la fila "KPIs de Gestión")
 - EBITDA UF y Flujo UF: celdas directas; Ingresos/Costos UF = $ / tasa_UF
 - tasa_UF = EBITDA$ / EBITDA_UF ; LY = Real mes-12 ; YTD = acumulado del año
"""
from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

import openpyxl
import pandas as pd

SHEET = "INFORME GESTIÓN"

# métrica canónica -> etiqueta(s) de fila en el informe ('@calc' = se computa)
FIN_ROWS = {
    "Ingresos totales UF": ("@ing_clp", "Total Ingresos Explotación", "Sub Total Total Ingresos"),
    "Costos operacionales UF": ("@gas_clp", "Total Gastos"),
    "EBITDA UF": ("@uf", "EBITDA (INGRESOS -GASTOS) UF", "EBITDA (INGRESOS - GASTOS) UF"),
    "Flujo UF": ("@uf", "FLUJO INVERSIONISTA (UF)"),
}
KPI_ROWS = {
    "EBITDA UF/CUOTA BANCO": ("EBITDA AJUSTADO/CUOTA BANCO",),
    "Ocupación departamentos 2022 (%)": ("Ocupación Deptos (%)",),
    "Gastos Comunes (UF/M2)": ("Ingresos Gasto Común (UF/m2)",),
    "UF/M2_DEPARTAMENTOS": ("Arriendo Deptos (UF/m2)",),
    "UF/ESTACIONAMIENTO": ("Arriendo Estacionamientos (UF/uni)",),
    "UF/M2 (DEPTO+ESTAC.)": ("Arriendo Deptos + Estacio. (UF/m2)",),
}


def _load(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(wb[SHEET].iter_rows(values_only=True))
    wb.close()
    return rows


def _row(rows, labels):
    wants = [l.strip().lower() for l in labels]
    for ri, r in enumerate(rows):
        if r[1] and str(r[1]).strip().lower() in wants:
            return ri
    for ri, r in enumerate(rows):
        lbl = str(r[1]).strip().lower() if r[1] else ""
        if any(w in lbl for w in wants):
            return ri
    return None


def _row_ns(rows, *needles, exclude=()):
    """Encuentra fila por etiqueta normalizada (sin espacios, minúscula). Tolera
    variaciones de espaciado entre informes (SOHO 'INGRESOS -GASTOS', PARK 'INGRESOS- GASTOS')."""
    norm = lambda s: re.sub(r"\s+", "", str(s).strip().lower())
    nd = [norm(n) for n in needles]
    ex = [norm(e) for e in exclude]
    for ri, r in enumerate(rows):
        lbl = norm(r[1]) if len(r) > 1 and r[1] else ""
        if lbl and all(n in lbl for n in nd) and not any(e in lbl for e in ex):
            return ri
    return None


def _month_cols(rows):
    """[(date, real_col, ppto_col)] usando los marcadores Real/Ppto y la fila fechas."""
    marker = next((r for r in rows if r[1] and "kpis de gesti" in str(r[1]).strip().lower()), None)
    if marker is None:
        raise RuntimeError("No hay fila de marcadores Real/Ppto")
    real_cols = [ci for ci, v in enumerate(marker) if v == "Real"]
    drow = max(rows[:8], key=lambda r: sum(isinstance(v, dt.datetime) for v in r))
    out = []
    for rc in real_cols:
        d = drow[rc]
        if isinstance(d, dt.datetime):
            out.append((d, rc, rc + 1))
    return out


def _num(rows, ri, ci):
    if ri is None:
        return None
    v = rows[ri][ci]
    return float(v) if isinstance(v, (int, float)) else None


def extract_facts(path, activo) -> pd.DataFrame:
    """Largo: Activo, Periodo, FechaID, anio, mes, metric, Real, Ppto."""
    rows = _load(path)
    months = _month_cols(rows)
    r_ing = _row(rows, FIN_ROWS["Ingresos totales UF"][1:])
    r_gas = _row(rows, FIN_ROWS["Costos operacionales UF"][1:])
    # tolerante a espaciado: SOHO 'INGRESOS -GASTOS', PARK 'INGRESOS- GASTOS'
    r_eb_uf = _row_ns(rows, "ebitda(ingresos-gastos)uf", exclude=("ajustado",))
    r_eb_clp = _row_ns(rows, "ebitda(ingresos-gastos)$", exclude=("ajustado",))
    r_flujo = _row(rows, ["FLUJO INVERSIONISTA (UF)"])
    kpi_idx = {m: _row(rows, labels) for m, labels in KPI_ROWS.items()}

    recs = []
    for d, rc, pc in months:
        for ver, col in (("Real", rc), ("Ppto", pc)):
            eb_uf, eb_clp = _num(rows, r_eb_uf, col), _num(rows, r_eb_clp, col)
            rate = eb_clp / eb_uf if eb_clp and eb_uf else None
            ing, gas = _num(rows, r_ing, col), _num(rows, r_gas, col)
            vals = {
                "Ingresos totales UF": ing / rate if ing is not None and rate else None,
                "Costos operacionales UF": gas / rate if gas is not None and rate else None,
                "EBITDA UF": eb_uf,
                "Flujo UF": _num(rows, r_flujo, col),
            }
            for m, ri in kpi_idx.items():
                vals[m] = _num(rows, ri, col)
            for m, v in vals.items():
                recs.append({"Activo": activo, "Periodo": d, "anio": d.year, "mes": d.month,
                             "FechaID": d.year * 100 + d.month, "metric": m, "ver": ver, "value": v})
    df = pd.DataFrame(recs)
    return (df.pivot_table(index=["Activo", "Periodo", "anio", "mes", "FechaID", "metric"],
                           columns="ver", values="value", aggfunc="first")
            .reset_index().rename(columns={"Real": "Real", "Ppto": "Ppto"}))


def extract_kpi_ytd(path, activo) -> dict:
    """YTD exacto de tarifas UF/m² desde el bloque "YTD <año> Real/Ppto" del
    informe (a la derecha de los 12 meses). Se asigna al ÚLTIMO mes reportado
    (max mes con EBITDA UF Real, igual criterio que el panel).
    Devuelve {metric: {"fid": AAAAMM, "Real": v, "Ppto": v}} (vacío si no hay bloque)."""
    rows = _load(path)
    months = _month_cols(rows)
    marker = next((r for r in rows if r[1] and "kpis de gesti" in str(r[1]).strip().lower()), None)
    if marker is None:
        return {}
    norm = lambda v: str(v).strip().lower() if v else ""
    ytd_rc = next((ci for ci, v in enumerate(marker)
                   if norm(v).startswith("ytd") and norm(v).endswith("real")), None)
    if ytd_rc is None:
        return {}
    r_eb_uf = _row_ns(rows, "ebitda(ingresos-gastos)uf", exclude=("ajustado",))
    reported = [d for d, rc, _ in months if _num(rows, r_eb_uf, rc)]
    if not reported:
        return {}
    fid = max(reported).year * 100 + max(reported).month
    out = {}
    for m in ("UF/M2_DEPARTAMENTOS", "UF/ESTACIONAMIENTO", "UF/M2 (DEPTO+ESTAC.)"):
        ri = _row(rows, KPI_ROWS[m])
        vr, vp = _num(rows, ri, ytd_rc), _num(rows, ri, ytd_rc + 1)
        if vr is not None or vp is not None:
            out[m] = {"fid": fid, "Real": vr, "Ppto": vp}
    return out


_FIN_ITEMS = ["Ingresos totales UF", "Costos operacionales UF", "EBITDA UF", "Flujo UF"]


def facts_to_indicadores(f: pd.DataFrame) -> pd.DataFrame:
    """Tabla 'Indicadores Financieros' (largo: Item x Versión_Real/Ppto) desde hechos."""
    fin = f[f["metric"].isin(_FIN_ITEMS)]
    return fin.rename(columns={"metric": "Item", "Activo": "Nombre activo",
                               "Real": "Versión_Real", "Ppto": "Versión_Ppto"})[
        ["Nombre activo", "Item", "Periodo", "anio", "mes", "FechaID", "Versión_Real", "Versión_Ppto"]]


def informe_to_indicadores(path, activo) -> pd.DataFrame:
    return facts_to_indicadores(extract_facts(path, activo))


def consolidado_largroup_facts(path) -> pd.DataFrame:
    """Informe LAR GROUP consolidado -> hechos del holding (Activo=LARGROUP) para
    los 4 ítems financieros. Mismo formato que extract_facts (enchufa al upsert)."""
    rows = _load(path)
    marker = next(r for r in rows
                  if "Real" in [str(x) for x in r] and "Ppto" in [str(x) for x in r])
    real_cols = [ci for ci, v in enumerate(marker) if v == "Real"]
    drow = max(rows[:8], key=lambda r: sum(isinstance(v, dt.datetime) for v in r))
    rate_row = next(r for r in rows
                    if sum(isinstance(v, (int, float)) and 30000 < v < 60000 for v in r) >= 3)
    r_ing, r_gas = _row(rows, ["Total Ingresos Explotación"]), _row(rows, ["Total Gastos"])
    r_eb, r_fl = _row(rows, ["EBITDA (UF)"]), _row(rows, ["RESULTADO (UF)"])
    recs = []
    for rc in real_cols:
        d = drow[rc]
        if not isinstance(d, dt.datetime):
            continue
        for ver, col in (("Real", rc), ("Ppto", rc + 1)):
            rate = rate_row[col] if isinstance(rate_row[col], (int, float)) else None
            ing, gas = _num(rows, r_ing, col), _num(rows, r_gas, col)
            vals = {"Ingresos totales UF": ing / rate if ing is not None and rate else None,
                    "Costos operacionales UF": gas / rate if gas is not None and rate else None,
                    "EBITDA UF": _num(rows, r_eb, col), "Flujo UF": _num(rows, r_fl, col)}
            for m, v in vals.items():
                recs.append({"Activo": "LARGROUP", "Periodo": d, "anio": d.year, "mes": d.month,
                             "FechaID": d.year * 100 + d.month, "metric": m, "ver": ver, "value": v})
    df = pd.DataFrame(recs)
    return (df.pivot_table(index=["Activo", "Periodo", "anio", "mes", "FechaID", "metric"],
                           columns="ver", values="value", aggfunc="first").reset_index())


def consolidado_to_indicadores_lar(path) -> pd.DataFrame:
    """Informe LAR GROUP consolidado -> tabla 'Indicadores Financieros Lar'
    (P&L del holding por Nivel 1/Nivel 2). Versión_Real = Real Peso $ / tasa UF."""
    rows = _load(path)
    marker = next(r for r in rows
                  if "Real" in [str(x) for x in r] and "Ppto" in [str(x) for x in r])
    real_cols = [ci for ci, v in enumerate(marker) if v == "Real"]
    drow = max(rows[:8], key=lambda r: sum(isinstance(v, dt.datetime) for v in r))
    rate_row = next(r for r in rows if sum(isinstance(v, (int, float)) and 30000 < v < 60000
                                           for v in r) >= 3)  # fila de tasa UF (~38000)

    def label_row(*subs):
        return _row(rows, list(subs))

    r_ing_hdr = label_row("Cuentas  -  INGRESOS OPERACIONALES", "Cuentas - INGRESOS OPERACIONALES")
    r_ing_tot = label_row("Total Ingresos Explotación")
    r_gas_hdr = label_row("Cuentas  -  GASTOS OPERACIONALES", "Cuentas - GASTOS OPERACIONALES")
    r_gas_tot = label_row("Total Gastos")
    r_eb_uf = label_row("EBITDA (UF)")
    r_res_uf = label_row("RESULTADO (UF)")

    def accounts(r0, r1):
        out = []
        for ri in range(r0 + 1, r1):
            lbl = rows[ri][1]
            if lbl and str(lbl).strip() and not str(lbl).lower().startswith(("total", "cuentas")):
                out.append((ri, str(lbl).strip()))
        return out

    secciones = [("Ingresos ", 1, accounts(r_ing_hdr, r_ing_tot)),
                 ("Gastos Operacionales", 2, accounts(r_gas_hdr, r_gas_tot))]

    recs = []
    for rc in real_cols:
        d = drow[rc]
        if not isinstance(d, dt.datetime):
            continue
        pc = rc + 1
        rate_r = rate_row[rc] if isinstance(rate_row[rc], (int, float)) else None
        rate_p = rate_row[pc] if isinstance(rate_row[pc], (int, float)) else rate_r
        base = {"Nombre activo": "Lar Group", "Periodo": d, "Mes": d.month, "Año": d.year,
                "FechaID": d.year * 100 + d.month, "UF Mes": rate_r}
        for n1, indice, accs in secciones:
            for ri, n2 in accs:
                rp = _num(rows, ri, rc)
                pp = _num(rows, ri, pc)
                recs.append({**base, "Nivel 1 ": n1, "Nivel 2": n2, "Indice": indice,
                             "Real Peso": rp, "PPTO Peso": pp,
                             "Versión_Real": rp / rate_r if rp is not None and rate_r else None,
                             "Versión_Ppto": pp / rate_p if pp is not None and rate_p else None})
        # EBITDA (UF) e RESULTADO (UF) directos
        for n1, indice, ri in [("EBITDA", 4, r_eb_uf), ("Resultado", 5, r_res_uf)]:
            recs.append({**base, "Nivel 1 ": n1, "Nivel 2": n1, "Indice": indice,
                         "Real Peso": None, "PPTO Peso": None,
                         "Versión_Real": _num(rows, ri, rc), "Versión_Ppto": _num(rows, ri, pc)})

    df = pd.DataFrame(recs).sort_values(["Nivel 1 ", "Nivel 2", "FechaID"])
    g = df.groupby(["Nivel 1 ", "Nivel 2", "Año"])
    df["YTD REAL"] = g["Versión_Real"].cumsum()
    df["YTD PPTO"] = g["Versión_Ppto"].cumsum()
    return df


# --------------------- apertura por cuenta (SOHO / PARK) ---------------------
def _cuentas(rows, r0, r1):
    """Cuentas entre dos filas ancla: etiquetas 'Total Ingresos - X' / 'Total Gastos - X'
    (se descarta el prefijo; el nombre conserva su casing). Ignora subtotales y memos
    ('Sub Total…', 'Total Clientes…')."""
    out = []
    for ri in range(r0 + 1, r1):
        lbl = rows[ri][1] if len(rows[ri]) > 1 else None
        if not lbl:
            continue
        s = re.sub(r"\s+", " ", str(lbl).strip())
        if s.lower().startswith(("total ingresos -", "total gastos -")):
            out.append((ri, s.split("-", 1)[1].strip() or s))
    return out


def _otros(rows, r0, r1):
    """Líneas entre EBITDA Ajustado y Resultado, clasificadas para que la sección
    SUME hasta el Resultado: devuelve (fila, nombre, unidad, signo, memo).

    OJO: bajo el EBITDA el informe cambia a UF — todas estas filas vienen en UF
    aunque conserven el prefijo '$' de arriba. Signos verificados contra el propio
    informe en los 12 meses de SOHO y PARK (Real y Ppto):
        Resultado = EBITDA Ajustado − Provisión CAPEX − Intereses pagados
                    − otros gastos (p.ej. Impto Timbre) + Intereses ganados
    'Total Gastos - Rehabilitación del Edificio (Capex)' es INFORMATIVA (es el capex
    efectivamente gastado, que se financia con la provisión) y NO entra en la fórmula:
    excluirla es lo que hace cuadrar todos los meses."""
    out = []
    for ri in range(r0 + 1, r1):
        lbl = rows[ri][1] if len(rows[ri]) > 1 else None
        if not lbl or not str(lbl).strip():
            continue
        s = re.sub(r"\s+", " ", str(lbl).strip())
        low = s.lower()
        if low.startswith(("total ingresos -", "total gastos -")):
            n2 = s.split("-", 1)[1].strip()
            es_ingreso = low.startswith("total ingresos")
            memo = not es_ingreso and "capex" in low      # capex gastado: informativo
            out.append((ri, n2, "UF", 1 if es_ingreso else -1, memo))
        elif "(uf)" in low:                                # Provisión CAPEX, Intereses pagados
            out.append((ri, re.sub(r"\s*\(UF\)\s*", " ", s, flags=re.I).strip(), "UF", -1, False))
    return out


def informe_to_apertura(path, activo) -> pd.DataFrame:
    """Informe de Gestión SOHO/PARK -> apertura COMPLETA por cuenta, mismo formato
    que 'Indicadores Financieros Lar' del holding (Nombre activo distingue).

    Replica la estructura del informe: Ingresos y Gastos Operacionales cuenta a
    cuenta, EBITDA, los gastos bajo EBITDA (seguros, patentes, asesorías…),
    EBITDA Ajustado, Capex/Intereses, Resultado, Amortización y Flujo Inversionista.
    Trae los 12 meses del año (Real solo de meses reportados —EBITDA UF ≠ 0 y tasa
    UF real, los futuros traen placeholder 1—; Ppto del año completo) con $ y UF
    (tasa de la fila UF del informe) y YTD (cumsum del año, criterio del holding).
    Las líneas de resultado llevan Nivel 2 == Nivel 1 (así las reconoce el front).

    Signos: sobre el EBITDA se conserva la convención del informe y del holding ya
    cargado (ingresos y gastos en positivo); BAJO el EBITDA las filas van signadas
    para que cada sección SUME hasta su línea de resultado:
        EBITDA + Ajustes bajo EBITDA        = EBITDA Ajustado
        EBITDA Ajustado + Capex/Int./Otros  = Resultado
    Así el cuadro se puede auditar sumando. `_conciliar` avisa por log si un informe
    futuro deja de cuadrar (cambio de formato o cuenta nueva mal clasificada)."""
    rows = _load(path)
    months = _month_cols(rows)
    rate_row = next((r for r in rows
                     if sum(isinstance(v, (int, float)) and 30000 < v < 60000 for v in r) >= 3), None)

    r_ing_hdr = _row_ns(rows, "cuentas-ingresos")
    r_ing_sub = _row_ns(rows, "subtotaltotalingresos")
    r_gas_hdr = _row_ns(rows, "cuentas-gastos")
    r_gas_tot = _row(rows, ["Total Gastos"])
    r_eb_uf = _row_ns(rows, "ebitda(ingresos-gastos)uf", exclude=("ajustado",))
    r_eb_clp = _row_ns(rows, "ebitda(ingresos-gastos)$", exclude=("ajustado",))
    r_eb_adj = _row_ns(rows, "ebitdaajustado(uf)")
    r_res = _row(rows, ["RESULTADO (UF)"])
    r_amort = _row(rows, ["Amortización (UF)", "Amortizacion (UF)"])
    r_flujo = _row(rows, ["FLUJO INVERSIONISTA (UF)"])
    anclas = {"tasa UF": rate_row, "Cuentas-INGRESOS": r_ing_hdr, "Sub Total Ingresos": r_ing_sub,
              "Cuentas-GASTOS": r_gas_hdr, "Total Gastos": r_gas_tot, "EBITDA UF": r_eb_uf,
              "EBITDA AJUSTADO": r_eb_adj, "RESULTADO": r_res, "FLUJO": r_flujo}
    faltan = [k for k, v in anclas.items() if v is None]
    if faltan:
        raise RuntimeError(f"{activo}: el informe no trae las anclas {faltan} "
                           f"(¿cambió el formato de la hoja '{SHEET}'?)")

    otros = _otros(rows, r_eb_adj, r_res)
    # (indice, Nivel 1, [(fila, Nivel 2, unidad, signo)])
    secciones = [
        (1, "Ingresos", [(ri, n2, "$", 1) for ri, n2 in _cuentas(rows, r_ing_hdr, r_ing_sub)]),
        (2, "Gastos Operacionales", [(ri, n2, "$", 1) for ri, n2 in _cuentas(rows, r_gas_hdr, r_gas_tot)]),
        # bajo el EBITDA el informe está en UF y las secciones suman hasta su resultado
        (4, "Ajustes bajo EBITDA", [(ri, n2, "UF", -1) for ri, n2 in _cuentas(rows, r_eb_uf, r_eb_adj)]),
        (6, "Capex, Intereses y Otros",
         [(ri, n2, un, sg) for ri, n2, un, sg, memo in otros if not memo]),
        (7, "Informativos (fuera del Resultado)",
         [(ri, n2, un, 1) for ri, n2, un, _sg, memo in otros if memo]),
    ]
    resultados = [
        (3, "EBITDA", r_eb_uf, r_eb_clp),
        (5, "EBITDA Ajustado", r_eb_adj, None),
        (8, "Resultado", r_res, None),
        (9, "Amortización", r_amort, None),
        (10, "Flujo Inversionista", r_flujo, None),
    ]

    recs = []
    for d, rc, pc in months:            # meses ascendentes: el cumsum YTD depende de esto
        _rate = lambda ci: (rate_row[ci]
                            if isinstance(rate_row[ci], (int, float)) and rate_row[ci] > 1000 else None)
        rate_r, rate_p = _rate(rc), _rate(pc)
        eb = _num(rows, r_eb_uf, rc)
        real_ok = rate_r is not None and eb is not None and eb != 0
        base = {"Nombre activo": activo, "Periodo": d, "Mes": d.month, "Año": d.year,
                "FechaID": d.year * 100 + d.month, "UF Mes": rate_r, "UF Mes PPTO": rate_p}
        for indice, n1, accs in secciones:
            for ri, n2, un, sg in accs:
                vr = _num(rows, ri, rc) if real_ok else None
                vp = _num(rows, ri, pc)
                if un == "$":
                    recs.append({**base, "Nivel 1 ": n1, "Nivel 2": n2, "Indice": indice,
                                 "Real Peso": sg * vr if vr is not None else None,
                                 "PPTO Peso": sg * vp if vp is not None else None,
                                 "Versión_Real": sg * vr / rate_r if vr is not None and rate_r else None,
                                 "Versión_Ppto": sg * vp / rate_p if vp is not None and rate_p else None})
                else:                    # la fila ya viene en UF
                    recs.append({**base, "Nivel 1 ": n1, "Nivel 2": n2, "Indice": indice,
                                 "Real Peso": None, "PPTO Peso": None,
                                 "Versión_Real": sg * vr if vr is not None else None,
                                 "Versión_Ppto": sg * vp if vp is not None else None})
        for indice, n2, ri, ri_clp in resultados:
            if ri is None:
                continue
            recs.append({**base, "Nivel 1 ": n2, "Nivel 2": n2, "Indice": indice,
                         "Real Peso": _num(rows, ri_clp, rc) if real_ok else None,
                         "PPTO Peso": _num(rows, ri_clp, pc),
                         "Versión_Real": _num(rows, ri, rc) if real_ok else None,
                         "Versión_Ppto": _num(rows, ri, pc)})

    df = pd.DataFrame(recs)
    g = df.groupby(["Nivel 1 ", "Nivel 2", "Año"])
    df["YTD REAL"] = g["Versión_Real"].cumsum()
    df["YTD PPTO"] = g["Versión_Ppto"].cumsum()
    for msg in conciliar_apertura(df, activo):
        print(f"[apertura] {msg}")
    return df


# Cuadraturas del informe: (línea de partida | None, [secciones], línea de llegada).
# Las líneas son las de resultado (Nivel 1 == Nivel 2) y las secciones, Nivel 1.
CUADRATURAS = [("EBITDA", ["Ajustes bajo EBITDA"], "EBITDA Ajustado"),
               ("EBITDA Ajustado", ["Capex, Intereses y Otros"], "Resultado")]


def conciliar_apertura(df: pd.DataFrame, activo: str = "", n1_col: str = "Nivel 1 ",
                       cuadraturas: list | None = None) -> list[str]:
    """Verifica que cada sección sume hasta su línea de resultado, mes a mes, en Real
    y Ppto. Devuelve la lista de descuadres (vacía = todo cuadra). No lanza: un informe
    con una cuenta nueva mal clasificada debe AVISAR, no tumbar la carga."""
    out = []
    for fid, g in df.groupby("FechaID"):
        for col in ("Versión_Real", "Versión_Ppto"):
            # líneas de resultado del mes (Nivel 1 == Nivel 2): EBITDA, Resultado, …
            res_de = dict(zip(g.loc[g[n1_col] == g["Nivel 2"], "Nivel 2"],
                              g.loc[g[n1_col] == g["Nivel 2"], col]))
            for base, secciones, destino in (cuadraturas or CUADRATURAS):
                v1 = res_de.get(destino)
                v0 = 0.0 if base is None else res_de.get(base)
                if v0 is None or v1 is None or pd.isna(v0) or pd.isna(v1):
                    continue          # mes sin Real (futuro) o informe sin esa línea
                suma = g.loc[g[n1_col].isin(secciones), col].sum()
                dif = (v0 + suma) - v1
                if abs(dif) > max(0.05, abs(v1) * 1e-6):
                    origen = f"{base} + " if base else ""
                    out.append(f"{activo} {int(fid)} {col}: {origen}{'+'.join(secciones)} "
                               f"= {v0 + suma:.2f} ≠ {destino} {v1:.2f} (dif {dif:+.2f})")
    return out


# métrica -> (col Real, col Ppto) en real_ppto_ly
RPL_COLS = {
    "Ingresos totales UF": ("Ingresos totales UF R", "Ingresos totales UF p"),
    "Costos operacionales UF": ("Costos operacionales UF R", "Costos operacionales UF p"),
    "EBITDA UF": ("EBITDA UF R", "EBITDA UF p"),
    "Flujo UF": ("Flujo UF R", "Flujo UF p"),
    "EBITDA UF/CUOTA BANCO": ("EBITDA UF/CUOTA BANCO R", "EBITDA UF/CUOTA BANCO p"),
    "Ocupación departamentos 2022 (%)": ("Ocupación departamentos 2022 (%) R", "Ocupación departamentos 2022 (%) p"),
    "Gastos Comunes (UF/M2)": ("Gastos Comunes (UF/M2) R", "Gastos Comunes (UF/M2) P"),
    "UF/M2_DEPARTAMENTOS": ("UF/M2_DEPARTAMENTOS R ", "UF/M2_DEPARTAMENTOS p"),
    "UF/ESTACIONAMIENTO": ("UF/ESTACIONAMIENTO R", "UF/ESTACIONAMIENTO p"),
    "UF/M2 (DEPTO+ESTAC.)": ("UF/M2 (DEPTO+ESTAC.) R", "UF/M2 (DEPTO+ESTAC.) p"),
}
FLOW = ["Ingresos totales UF", "Costos operacionales UF", "EBITDA UF", "Flujo UF"]
# métricas de tarifa cuyo YTD vive en real_ppto_ly. A diferencia de FLOW (cumsum),
# el YTD de una tarifa es el PROMEDIO acumulado del año (validado contra el
# histórico del panel: coincide a ~3 decimales).
TARIFF_YTD_COLS = {
    "UF/M2_DEPARTAMENTOS": ("UF/M2_YTD R", "UF/M2_YTD p"),
    "UF/ESTACIONAMIENTO": ("UF/ESTACIONAMIENTO_YTD R", "UF/ESTACIONAMIENTO_YTD p"),
    "UF/M2 (DEPTO+ESTAC.)": ("UF/M2 (DEPTO+ESTAC.)_YTD R", "UF/M2 (DEPTO+ESTAC.)_YTD p"),
}
# métricas cuyo LY (Real mes-12) está en real_ppto_ly y su nombre de columna
LY_COLS = {
    "Ingresos totales UF": "Ingresos totales UF R LY",
    "Costos operacionales UF": "Costos operacionales UF LY",
    "EBITDA UF": "EBITDA UF R LY",
    "Flujo UF": "Flujo UF R LY",
    "EBITDA UF/CUOTA BANCO": "EBITDA UF/CUOTA BANCO R LY",
    "Ocupación departamentos 2022 (%)": "Ocupación departamentos 2022 (%) R7 LY",
    # faltaban: quedaban congelados en la semilla (SOHO Gasto comun LY en 0 desde
    # feb-2025) — el gráfico "Año anterior" salía plano en cero
    "Gastos Comunes (UF/M2)": "Gasto comun LY",
    "UF/M2_DEPARTAMENTOS": "Tarifa LY",
}


def assemble_real_ppto_ly(facts: pd.DataFrame) -> pd.DataFrame:
    """Ensambla Real+PPTO+LY (núcleo) desde el almacén de hechos (con histórico).
    YTD = acumulado del año por métrica de flujo; LY = Real mes-12."""
    facts = facts.sort_values(["Activo", "metric", "FechaID"]).copy()
    out_rows = []
    for (activo, periodo, fid, anio, mes), grp in facts.groupby(["Activo", "Periodo", "FechaID", "anio", "mes"]):
        row = {"Activo": activo, "Periodo": periodo, "Fecha ID": fid, "Año": anio, "Mes": mes,
               "Año p": anio, "Mes p": mes}
        for _, fr in grp.iterrows():
            cols = RPL_COLS.get(fr["metric"])
            if cols:
                row[cols[0]] = fr["Real"]
                row[cols[1]] = fr["Ppto"]
        out_rows.append(row)
    wide = pd.DataFrame(out_rows)

    # YTD (acumulado del año) para métricas de flujo, Real y Ppto
    rmap = {m: RPL_COLS[m] for m in FLOW}
    wide = wide.sort_values(["Activo", "Fecha ID"]).reset_index(drop=True)
    for m, (rc, pc) in rmap.items():
        for src, suff in ((rc, "R"), (pc, "p")):
            if src not in wide.columns:        # métrica ausente (ej. fila no hallada) → NaN, no crash
                wide[src] = pd.NA
            ytd_col = f"{m} YTD {suff}"
            wide[ytd_col] = (wide.groupby(["Activo", "Año"])[src].cumsum())

    # LY = Real mes-12 (lookup por Activo + FechaID-100 mismo mes)
    real_lookup = {}
    for m in LY_COLS:
        rc = RPL_COLS[m][0]
        if rc not in wide.columns:
            wide[rc] = pd.NA
        for _, r in wide.iterrows():
            real_lookup[(m, r["Activo"], int(r["Fecha ID"]))] = r.get(rc)
    for m, ly_col in LY_COLS.items():
        wide[ly_col] = wide.apply(
            lambda r: real_lookup.get((m, r["Activo"], int(r["Fecha ID"]) - 100)), axis=1)
    return wide

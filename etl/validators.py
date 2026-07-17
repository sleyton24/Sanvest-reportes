"""Validadores duros de estados financieros (crudo → tabla plana).

Cada validador recibe el DataFrame plano que produce `statement_extractor` y
devuelve un resultado ESTRUCTURADO (no lanza): `{ok, checks, errors}`. Así lo
puede consumir tanto la carga (`connect_grupo`, que aborta si `ok` es falso)
como el agente mantenedor de F4 (que necesita el detalle para decidir/reportar).

Reglas (F3):
- Balance  : ACTIVOS = PASIVOS + Patrimonio por Trimestre y por cada columna de
             valor con datos (identidad contable; tolerancia relativa).
- EERR     : estructura (columnas, secciones INGRESOS/EGRESOS, Trimestre único)
             y sanidad (al menos un escenario con utilidad ≠ 0).
- Cascada  : cuadre interno vs EERR — la suma de `Monto` por escenario debe
             igualar la utilidad (Ingresos − Egresos) del EERR para la columna
             fuente de ese escenario (guarda la derivación y el sign_map).

`check(result)` reduce a un booleano; `raise_if_bad(result)` lanza
`ValidationError` con el detalle formateado (para responder 422 en la carga).
"""
from __future__ import annotations

from typing import Any

import pandas as pd


class ValidationError(Exception):
    """Falla de cuadre/estructura. `.result` trae el dict estructurado."""

    def __init__(self, message: str, result: dict | None = None):
        super().__init__(message)
        self.result = result or {}


def _ok(name: str, detail: str = "") -> dict:
    return {"check": name, "ok": True, "detail": detail}


def _fail(name: str, detail: str) -> dict:
    return {"check": name, "ok": False, "detail": detail}


def _result(checks: list[dict]) -> dict:
    errors = [c for c in checks if not c["ok"]]
    return {"ok": not errors, "checks": checks, "errors": errors}


def _close(a: float, b: float, *, rel_tol: float, abs_tol: float) -> bool:
    return abs(a - b) <= max(abs_tol, rel_tol * max(abs(a), abs(b)))


def check(result: dict) -> bool:
    return bool(result.get("ok"))


def raise_if_bad(result: dict, *, context: str = "") -> None:
    if result.get("ok"):
        return
    msgs = [f"- {c['check']}: {c['detail']}" for c in result.get("errors", [])]
    head = f"Validación falló{f' ({context})' if context else ''}:"
    raise ValidationError(head + "\n" + "\n".join(msgs), result)


# --------------------------------- Balance -----------------------------------
def validate_balance(
    df: "pd.DataFrame",
    *,
    section_col: str = "N4",
    activo: str = "ACTIVOS",
    pasivo: str = "PASIVOS",
    patrimonio: str = "Patrimonio",
    trimestre_col: str = "Trimestre",
    value_cols: list[str] | None = None,
    rel_tol: float = 1e-3,
    abs_tol: float = 1.0,
) -> dict:
    """ACTIVOS = PASIVOS + Patrimonio, por Trimestre y por columna de valor.

    Solo exige el cuadre en columnas con datos reales (suma |·| sobre el umbral);
    una columna vacía en un trimestre no genera error. Al menos una columna debe
    tener datos, o el balance se considera vacío (error)."""
    checks: list[dict] = []

    if df is None or len(df) == 0:
        return _result([_fail("no_vacio", "el Balance no produjo filas")])

    for col in (section_col, trimestre_col):
        if col not in df.columns:
            checks.append(_fail("columnas", f"falta la columna '{col}'"))
    if checks:
        return _result(checks)

    if df[trimestre_col].isna().all():
        return _result([_fail("trimestre", "ninguna fila trae Trimestre")])

    if value_cols is None:
        value_cols = [c for c in df.columns
                      if any(k in c for k in ("UF", "USD")) and c not in (section_col,)]
    if not value_cols:
        return _result([_fail("columnas_valor", "no hay columnas de valor")])

    trimestres = [t for t in df[trimestre_col].dropna().unique()]
    checks.append(_ok("trimestre", f"{trimestres}"))

    any_data = False
    for tri in trimestres:
        sub = df[df[trimestre_col] == tri]
        for vc in value_cols:
            vals = pd.to_numeric(sub[vc], errors="coerce")
            by = vals.groupby(sub[section_col]).sum()
            a = float(by.get(activo, 0.0))
            p = float(by.get(pasivo, 0.0)) + float(by.get(patrimonio, 0.0))
            magnitude = max(abs(a), abs(p))
            if magnitude <= abs_tol:      # columna vacía en este trimestre
                continue
            any_data = True
            name = f"cuadre[{tri} / {vc}]"
            if _close(a, p, rel_tol=rel_tol, abs_tol=abs_tol):
                checks.append(_ok(name, f"ACTIVOS={a:,.2f} ~= PAS+PAT={p:,.2f}"))
            else:
                checks.append(_fail(
                    name,
                    f"ACTIVOS={a:,.2f} != PASIVOS+Patrimonio={p:,.2f} "
                    f"(dif={a - p:,.2f})"))

    if not any_data:
        checks.append(_fail("columnas_valor", "todas las columnas de valor vacías"))
    return _result(checks)


# ----------------------------------- EERR ------------------------------------
def validate_eerr(
    df: "pd.DataFrame",
    *,
    section_col: str = "N1",
    trimestre_col: str = "Trimestre",
    ingresos: str = "INGRESOS",
    egresos: str = "EGRESOS",
    scenario_cols: list[str] | None = None,
) -> dict:
    """Estructura + sanidad del EERR (no una identidad estricta: el reporte trae
    errores de fórmula conocidos). Exige columnas, ambas secciones, un solo
    Trimestre y al menos un escenario con utilidad ≠ 0."""
    checks: list[dict] = []

    if df is None or len(df) == 0:
        return _result([_fail("no_vacio", "el EERR no produjo filas")])

    for col in (section_col, trimestre_col):
        if col not in df.columns:
            checks.append(_fail("columnas", f"falta la columna '{col}'"))
    if checks:
        return _result(checks)

    secs = set(df[section_col].dropna().unique())
    for need in (ingresos, egresos):
        if need in secs:
            checks.append(_ok(f"seccion[{need}]", ""))
        else:
            checks.append(_fail(f"seccion[{need}]", f"no aparece la sección '{need}'"))

    tri = [t for t in df[trimestre_col].dropna().unique()]
    if len(tri) == 1:
        checks.append(_ok("trimestre", f"{tri[0]}"))
    elif not tri:
        checks.append(_fail("trimestre", "ninguna fila trae Trimestre"))
    else:
        checks.append(_fail("trimestre", f"múltiples trimestres en un EERR: {tri}"))

    if scenario_cols is None:
        scenario_cols = [c for c in ("Real", "Forecast", "Presupuesto")
                         if c in df.columns]
    sign = df[section_col].map({ingresos: 1, egresos: -1}).fillna(0)
    utils = {}
    for sc in scenario_cols:
        utils[sc] = float((pd.to_numeric(df[sc], errors="coerce").fillna(0) * sign).sum())
    if any(abs(u) > 1.0 for u in utils.values()):
        checks.append(_ok("utilidad", ", ".join(f"{k}={v:,.2f}" for k, v in utils.items())))
    else:
        checks.append(_fail("utilidad", f"todos los escenarios con utilidad ~= 0: {utils}"))
    return _result(checks)


# --------------------------------- Cascada -----------------------------------
def validate_cascada(
    cascada_df: "pd.DataFrame",
    eerr_df: "pd.DataFrame",
    spec: dict,
    *,
    rel_tol: float = 1e-3,
    abs_tol: float = 1.0,
) -> dict:
    """Cuadre interno: Σ Monto (por escenario en la Cascada) = utilidad del EERR
    (Ingresos − Egresos) sobre la columna fuente de ese escenario. Guarda que la
    derivación no perdió filas ni erró el signo."""
    checks: list[dict] = []
    if cascada_df is None or len(cascada_df) == 0:
        return _result([_fail("no_vacio", "la Cascada no produjo filas")])

    ccfg = spec["cascada"]
    scen_map = ccfg["scenarios"]               # {escenario_salida: columna_eerr}
    out = ccfg["out_cols"]
    monto_col, scen_out_col = out["monto"], out["scenario"]
    sign_col = ccfg["sign_col"]                # N1 (INGRESOS/EGRESOS) en el EERR
    sign_map = ccfg["sign_map"]

    def _norm(s: Any) -> str:
        return " ".join(str(s).upper().split()) if s is not None else ""

    sign = eerr_df[sign_col].map(lambda s: sign_map.get(_norm(s), 0))

    emitted = [s for s in cascada_df[scen_out_col].dropna().unique()]
    checks.append(_ok("escenarios", f"{emitted}"))
    for scen in emitted:
        src = scen_map.get(scen)
        if src is None or src not in eerr_df.columns:
            checks.append(_fail(f"fuente[{scen}]",
                                f"no hay columna EERR fuente para '{scen}'"))
            continue
        eerr_util = float((pd.to_numeric(eerr_df[src], errors="coerce").fillna(0) * sign).sum())
        casc_sum = float(pd.to_numeric(
            cascada_df.loc[cascada_df[scen_out_col] == scen, monto_col],
            errors="coerce").fillna(0).sum())
        if _close(casc_sum, eerr_util, rel_tol=rel_tol, abs_tol=abs_tol):
            checks.append(_ok(f"cuadre[{scen}]",
                              f"suma cascada={casc_sum:,.2f} ~= utilidadEERR={eerr_util:,.2f}"))
        else:
            checks.append(_fail(f"cuadre[{scen}]",
                                f"suma cascada={casc_sum:,.2f} != utilidadEERR={eerr_util:,.2f} "
                                f"(dif={casc_sum - eerr_util:,.2f})"))
    return _result(checks)

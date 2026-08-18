# -*- coding: utf-8 -*-
"""Pruebas de la APERTURA POR CUENTA (SOHO / PARK / Hotel) contra los Excel reales.

Verifica lo que un cambio de formato o una regresión del ETL rompería:
  · valores puntuales leídos a mano del informe (Real y Ppto, $ y UF)
  · que cada sección SUME hasta su línea de resultado, en los 12 meses y en las dos
    versiones (es lo que pilló que 'Impto Timbre' sí entra en el Resultado y que
    'Rehabilitación del Edificio (Capex)' es informativa)
  · que los meses futuros no traigan Real (el informe deja placeholders: EBITDA 0 y
    tasa UF = 1, y en algunos meses basura en pesos en las filas de resultado)
  · regresión: recargar un informe VIEJO no debe borrar el Real de un mes ya cargado
  · regresión: el upsert no debe borrar columnas que el df nuevo no calcula

Uso:  .venv\\Scripts\\python scripts/test_apertura.py
No toca ninguna base de datos real: usa SQLite en memoria.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from etl.connect_hotel import upsert_hotel_pnl  # noqa: E402
from etl.connect_lar import _read, _write, upsert_indicadores_lar  # noqa: E402
from etl.hotel_ccpp import CUADRATURAS_HOTEL, ccpp_to_hotel_pnl  # noqa: E402
from etl.informes_lar import (conciliar_apertura, consolidado_to_indicadores_lar,  # noqa: E402
                             informe_to_apertura)

EJ = ROOT / "Ejemplos para subir"
LAR = EJ / "LAR GROUP"
SOHO_MAY = LAR / "Informe de Gestión Soho 2026_Mayo (SV).xlsx"
PARK_MAY = LAR / "Informe de Gestion PARK 2026_Mayo (SV).xlsx"
CONS_MAY = LAR / "Informe LAR GROUP Mayo- 2026.xlsx"
SOHO_ABR = ROOT / "2026" / "5. Mayo" / "LAR Group" / "Informe de Gestión SOHO 2026_Abril (SV).xlsx"
CCPP_MAY = EJ / "CCPP OLÁ Providencia 2026 May.xlsx"

_ok, _fail = 0, 0


def check(name: str, cond: bool, extra: str = "") -> None:
    global _ok, _fail
    if cond:
        _ok += 1
        print(f"  OK   {name}")
    else:
        _fail += 1
        print(f"  FALLA {name} {extra}")


def val(df, fid, n2, col, n1_col="Nivel 1 "):
    m = df[(df["FechaID"] == fid) & (df["Nivel 2"] == n2)]
    return m.iloc[0][col] if len(m) else None


def approx(a, b, tol=0.01):
    return a is not None and b is not None and abs(a - b) <= tol


def main() -> None:
    faltan = [p.name for p in (SOHO_MAY, PARK_MAY, SOHO_ABR, CCPP_MAY) if not p.exists()]
    if faltan:
        sys.exit(f"faltan archivos de prueba: {faltan}")

    print("== SOHO / PARK: valores contra el informe ==")
    soho = informe_to_apertura(SOHO_MAY, "SOHO")
    park = informe_to_apertura(PARK_MAY, "PARK")
    # Ingresos y gastos operacionales: en $ y con el signo del informe (= holding)
    check("SOHO Arriendos Deptos Real $ may",
          approx(val(soho, 202605, "Arriendos Departamentos", "Real Peso"), 55409313, 1))
    check("SOHO Arriendos Deptos Ppto $ may",
          approx(val(soho, 202605, "Arriendos Departamentos", "PPTO Peso"), 56414011.2168))
    check("PARK Arriendos Deptos Real $ may",
          approx(val(park, 202605, "Arriendos Departamentos", "Real Peso"), 163671787, 1))
    check("SOHO suma ingresos = Total Ingresos Explotación",
          approx(soho[(soho["FechaID"] == 202605) & (soho["Indice"] == 1)]["Real Peso"].sum(),
                 81773960, 1))
    check("SOHO suma gastos op. = Total Gastos",
          approx(soho[(soho["FechaID"] == 202605) & (soho["Indice"] == 2)]["Real Peso"].sum(),
                 22363401.63, 0.02))
    check("PARK suma gastos op. = Total Gastos",
          approx(park[(park["FechaID"] == 202605) & (park["Indice"] == 2)]["Real Peso"].sum(),
                 56224009.40, 0.02))
    check("SOHO EBITDA UF Real may", approx(val(soho, 202605, "EBITDA", "Versión_Real"), 1462.9291, 0.001))
    check("SOHO EBITDA UF Ppto may", approx(val(soho, 202605, "EBITDA", "Versión_Ppto"), 1439.1143, 0.001))
    check("SOHO tasa UF may", approx(val(soho, 202605, "EBITDA", "UF Mes"), 40610.69, 0.1))
    check("cuentas propias de cada edificio",
          (soho["Nivel 2"] == "Arriendos Desistidos").any()
          and (park["Nivel 2"] == "Locales Comerciales").any()
          and (park["Nivel 2"] == "Bombas").any())

    print("== SOHO / PARK: las secciones cuadran (12 meses, Real y Ppto) ==")
    for act, df in (("SOHO", soho), ("PARK", park)):
        desc = conciliar_apertura(df, act)
        check(f"{act}: sin descuadres", not desc, "\n      " + "\n      ".join(desc[:6]))
    # el capex gastado va aparte y NO entra en la fórmula del Resultado
    check("Rehabilitación (Capex) es informativa",
          (soho[soho["Nivel 2"] == "Rehabilitación del Edificio (Capex)"]["Nivel 1 "]
           == "Informativos (fuera del Resultado)").all())
    # y el impuesto de timbre SÍ (marzo de PARK lo tiene ≠ 0: 1.158,48 UF)
    check("Impto Timbre entra en Capex/Intereses",
          (park[park["Nivel 2"] == "Impto Timbre y Estampilla Pagarés"]["Nivel 1 "]
           == "Capex, Intereses y Otros").all())
    check("PARK marzo: Capex/Int. incluye el Impto Timbre",
          approx(val(park, 202603, "Impto Timbre y Estampilla Pagarés", "Versión_Real"),
                 -1158.48, 0.01))

    print("== meses futuros y basura del informe ==")
    for act, df in (("SOHO", soho), ("PARK", park)):
        fut = df[df["FechaID"] > 202605]
        check(f"{act}: jun–dic sin Real",
              fut["Versión_Real"].isna().all() and fut["Real Peso"].isna().all())
        check(f"{act}: jun–dic con Ppto", fut["Versión_Ppto"].notna().any())
        check(f"{act}: 12 meses de 2026",
              sorted(df["FechaID"].unique()) == list(range(202601, 202613)))
    # SOHO trae basura en pesos en ago/oct (residuo de fórmula): el gate la excluye
    check("SOHO: la basura de ago/oct no entra como Real",
          soho[soho["FechaID"].isin([202608, 202610])]["Versión_Real"].isna().all())

    print("== archivo del mes anterior (abril) ==")
    soho_abr = informe_to_apertura(SOHO_ABR, "SOHO")
    check("abril: EBITDA UF Real", approx(val(soho_abr, 202604, "EBITDA", "Versión_Real"), 1474.0405, 0.001))
    check("abril: YTD EBITDA = 5.895,1476 del informe",
          approx(val(soho_abr, 202604, "EBITDA", "YTD REAL"), 5895.1476, 0.01))
    check("abril: mayo aún sin Real",
          soho_abr[soho_abr["FechaID"] == 202605]["Versión_Real"].isna().all())
    check("abril: sin descuadres", not conciliar_apertura(soho_abr, "SOHO"))

    print("== Hotel: valores y cuadratura ==")
    pnl = ccpp_to_hotel_pnl(CCPP_MAY)
    v = lambda fid, n2, col: val(pnl, fid, n2, col, "Nivel 1")
    check("Habitaciones Real $ may", approx(v(202605, "Habitaciones", "Real Peso"), 411780774, 1))
    check("GOP Real $ may", approx(v(202605, "GOP", "Real Peso"), 150818006, 1))
    check("GOP Real UF may", approx(v(202605, "GOP", "Versión_Real"), 3713.7514, 0.001))
    check("EBITDA Real UF may", approx(v(202605, "EBITDA", "Versión_Real"), 4082.9772, 0.001))
    check("Flujo Consolidado Real UF may",
          approx(v(202605, "Total Flujo Caja Consolidado", "Versión_Real"), 559.4194, 0.001))
    check("suma ingresos = Total Ingresos Explotación",
          approx(pnl[(pnl["FechaID"] == 202605) & (pnl["Indice"] == 1)]["Real Peso"].sum(),
                 482532015, 1))
    check("suma gastos = Total Gastos (negativo, como el CCPP)",
          approx(pnl[(pnl["FechaID"] == 202605) & (pnl["Indice"] == 2)]["Real Peso"].sum(),
                 -331714009, 1))
    check("tasa UF implícita (GOP $ / GOP UF)", approx(v(202605, "GOP", "UF Mes"), 40610.7, 1))
    desc = conciliar_apertura(pnl, "OLA HOTEL", "Nivel 1", CUADRATURAS_HOTEL)
    check("Hotel: sin descuadres", not desc, "\n      " + "\n      ".join(desc[:6]))
    fut = pnl[pnl["FechaID"] > 202605]
    check("Hotel: jun–dic sin Real", fut["Versión_Real"].isna().all())
    check("Hotel: jun–dic con Ppto", fut["Versión_Ppto"].notna().any())
    check("Hotel: 12 meses de 2026",
          sorted(pnl["FechaID"].unique()) == list(range(202601, 202613)))

    print("== regresión: recargar un informe VIEJO no borra lo ya cargado ==")
    # Hotel: la BD tiene junio cargado; se recarga el CCPP de mayo (junio viene vacío)
    eng = create_engine("sqlite://")
    db = pnl.copy()
    sel = db["FechaID"] == 202606
    for c, x in (("Versión_Real", 111.0), ("Real Peso", 222.0), ("YTD REAL", 333.0)):
        db.loc[sel, c] = x
    _write(eng, "hotel_pnl", db)
    upsert_hotel_pnl(eng, pnl)
    after = _read(eng, "hotel_pnl")
    jun = after[after["FechaID"] == 202606]
    check("hotel_pnl: junio conserva su Real tras recargar mayo",
          jun["Versión_Real"].notna().all() and approx(float(jun["Versión_Real"].iloc[0]), 111.0),
          f"notna={jun['Versión_Real'].notna().sum()}/{len(jun)}")
    check("hotel_pnl: mayo se actualizó igual",
          after[after["FechaID"] == 202605]["Versión_Real"].notna().all())

    # RR: el consolidado no calcula 'UF Mes PPTO' → no debe borrarlo del holding
    cons = consolidado_to_indicadores_lar(CONS_MAY)
    eng2 = create_engine("sqlite://")
    seed = cons.copy()
    seed["Nombre activo"] = None            # como las filas legadas de prod
    seed["UF Mes PPTO"] = 38888.0
    _write(eng2, "indicadores_financieros_lar", seed)
    upsert_indicadores_lar(eng2, pd.concat([soho, park, cons], ignore_index=True))
    tab = _read(eng2, "indicadores_financieros_lar")
    hold = tab[tab["Nombre activo"] == "Lar Group"]
    check("holding: 'UF Mes PPTO' sobrevive al upsert",
          hold["UF Mes PPTO"].notna().all()
          and approx(float(hold["UF Mes PPTO"].iloc[0]), 38888.0),
          f"nulos={hold['UF Mes PPTO'].isna().sum()}/{len(hold)}")
    check("holding: no se duplicó (NULL se normaliza a 'Lar Group')", len(hold) == len(cons))
    check("apertura de los edificios insertada",
          set(tab["Nombre activo"].unique()) == {"Lar Group", "SOHO", "PARK"},
          str(set(tab["Nombre activo"].unique())))
    check("sin claves duplicadas",
          tab.groupby(["Nombre activo", "Nivel 1 ", "Nivel 2", "FechaID"]).size().max() == 1)
    n_antes = len(tab)
    upsert_indicadores_lar(eng2, pd.concat([soho, park, cons], ignore_index=True))
    check("re-aplicar no duplica", len(_read(eng2, "indicadores_financieros_lar")) == n_antes)

    print(f"\n{_ok} OK, {_fail} FALLAS")
    sys.exit(1 if _fail else 0)


if __name__ == "__main__":
    main()

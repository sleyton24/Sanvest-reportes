# Carga incremental de Atémpora (Civitas) desde el Flujo de Caja (FC).
#
# El FC ("FC Civitas_Modelo Venta Retail YYYY_MM vF#.xlsx") ya trae, en la hoja
# `CIVITAS_mensual`, un "ESTADO DE RESULTADOS (UF)" mensual con los 22 rubros
# exactos del EERR (verificado: reproduce `eerr_civitas` con diff 0). Este ETL:
#   1. lee ese bloque UF (ya convertido a UF) por mes,
#   2. ELIMINA las líneas de venta (Promesa Compra Venta, Costo Venta Activo) → 0,
#      para dejar solo la operación de ARRIENDO,
#   3. actualiza `Monto` (Real) y recalcula `YTD Real` en `eerr_civitas`,
#   4. PRESERVA `ppto`/`YTD PPTO` (el presupuesto congelado NO sale del FC mensual;
#      viene del baseline que cargó el negocio con el Excel CIVITAS).
#
# Solo toca los meses CERRADOS (fechaID ≤ período del archivo); los futuros quedan
# como placeholders (Monto vacío) para que el dashboard sepa hasta dónde hay Real.
# El mapeo completo está documentado en docs/atempora_fc_mapping.md.
from __future__ import annotations

import datetime as _dt
import os
import re
import unicodedata
from collections import defaultdict

import openpyxl
import pandas as pd
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from .connect_lar import _read, _write

FC_SHEET = "CIVITAS_mensual"
TABLE = "eerr_civitas"
# rubros de VENTA que se eliminan (Monto → 0) para dejar la operación de arriendo
VENTA_RUBROS = ("Promesa Compra Venta", "Costo Venta Activo")
# ancla única del bloque de detalle en la hoja (evita los resúmenes de arriba, que
# repiten rótulos como "Otros ingresos")
ANCHOR = "Ingresos por Arriendo Oficina"


def _norm(s) -> str:
    """Normaliza un rótulo: sin acentos, minúsculas, espacios colapsados."""
    if s is None:
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip().lower()


def _filename_fid(path: str) -> int | None:
    """Período del archivo desde el nombre: 'FC Civitas ... 2026_05 vF3' → 202605."""
    base = os.path.basename(path)
    for m in re.finditer(r"(20\d\d)[ _\-](\d{1,2})\b", base):
        y, mo = int(m.group(1)), int(m.group(2))
        if 1 <= mo <= 12:
            return y * 100 + mo
    return None


def _read_fc_eerr(path: str, norm_map: dict[str, str]
                  ) -> dict[tuple[int, str], float]:
    """Lee el bloque EERR (UF) del FC → {(fechaID, Nivel 1 exacto): valor UF} para
    TODOS los meses (cerrados y proyectados) desde 202501. El llamador decide, según
    el período del archivo, cuáles son Real (Monto) y cuáles proyección (ppto)."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        if FC_SHEET not in wb.sheetnames:
            raise ValueError(f"El archivo no tiene la hoja '{FC_SHEET}'")
        ws = wb[FC_SHEET]
        # columnas-mes desde la fila 7 (la fecha real; la fila de índice de mes está
        # corrupta en 2026 tardío). Las columnas de total anual traen None o un año.
        monthcol: dict[int, int] = {}
        for c in range(1, ws.max_column + 1):
            v = ws.cell(7, c).value
            if isinstance(v, _dt.datetime):
                monthcol[v.year * 100 + v.month] = c
        # ancla del bloque de detalle (UF): primera fila cuyo rótulo == ANCHOR.
        # Como el EERR aparece dos veces (M$ y UF) y el ancla está en ambos, tomamos
        # la ÚLTIMA (la del bloque UF, más abajo).
        target = _norm(ANCHOR)
        anchor = None
        for r in range(1, ws.max_row + 1):
            if _norm(ws.cell(r, 3).value) == target:
                anchor = r  # sigue hasta la última ocurrencia (bloque UF)
        if anchor is None:
            raise ValueError(f"No encontré el rubro ancla '{ANCHOR}' en {FC_SHEET}")
        # desde el ancla, mapear rótulos → fila (primera ocurrencia de cada rubro)
        rubro_row: dict[str, int] = {}
        r = anchor
        while r <= anchor + 40 and len(rubro_row) < len(norm_map):
            key = _norm(ws.cell(r, 3).value)
            if key in norm_map and norm_map[key] not in rubro_row:
                rubro_row[norm_map[key]] = r
            r += 1
        # valores UF por mes (desde 202501; el matching contra la tabla filtra el resto)
        out: dict[tuple[int, str], float] = {}
        for fid, col in monthcol.items():
            if fid < 202501:
                continue
            for n1, row in rubro_row.items():
                v = ws.cell(row, col).value
                out[(fid, n1)] = float(v) if isinstance(v, (int, float)) else 0.0
        return out
    finally:
        wb.close()


def apply_atempora(engine: Engine, path: str) -> dict:
    """Actualiza `eerr_civitas` (Real + YTD Real) desde el FC, eliminando ventas.
    Preserva ppto/YTD PPTO y solo toca meses cerrados. Idempotente."""
    if not inspect(engine).has_table(TABLE):
        raise ValueError(
            f"La tabla '{TABLE}' no existe todavía. Cargue primero el Excel CIVITAS "
            "(carga completa) para sembrar el EERR y el presupuesto (ppto).")
    cur = _read(engine, TABLE)
    if cur.empty:
        raise ValueError(f"La tabla '{TABLE}' está vacía; cargue primero el Excel CIVITAS.")

    # canónico: norm(Nivel 1) → Nivel 1 exacto (con su padding/acentos reales de la BD)
    norm_map: dict[str, str] = {}
    for n1 in cur["Nivel 1 "].dropna().unique():
        norm_map[_norm(n1)] = n1

    asof = _filename_fid(path)
    if asof is None:  # sin período en el nombre → hasta el último mes de la tabla
        asof = int(pd.to_numeric(cur["fechaID"], errors="coerce").max())

    fc = _read_fc_eerr(path, norm_map)
    if not fc:
        raise ValueError("No pude leer valores del EERR (UF) del FC; ¿hoja/estructura correcta?")

    # posiciones de columnas
    c_fid = cur.columns.get_loc("fechaID")
    c_n1 = cur.columns.get_loc("Nivel 1 ")
    c_monto = cur.columns.get_loc("Monto")
    c_ppto = cur.columns.get_loc("ppto")
    c_ytd = cur.columns.get_loc("YTD Real")
    c_ytdp = cur.columns.get_loc("YTD PPTO")

    # Recorre la tabla: meses CERRADOS (fechaID ≤ período del archivo) → Real (Monto);
    # meses FUTUROS (> período) → proyección del FC en ppto (el presupuesto de los
    # meses cerrados se deja como está). Solo toca filas que existen (UPDATE in-place).
    real_keys: set[tuple[int, str]] = set()   # (fid, n1) con Real actualizado
    ppto_keys: set[tuple[int, str]] = set()    # (fid, n1) con ppto proyectado
    rowidx: dict[tuple[int, str], int] = {}
    for i in range(len(cur)):
        try:
            fid = int(cur.iat[i, c_fid])
        except (TypeError, ValueError):
            continue
        n1 = cur.iat[i, c_n1]
        key = (fid, n1)
        rowidx[key] = i
        if key not in fc:
            continue
        if fid <= asof:
            cur.iat[i, c_monto] = fc[key]
            real_keys.add(key)
        else:
            cur.iat[i, c_ppto] = fc[key]   # proyección del ppto para meses siguientes
            ppto_keys.add(key)

    # YTD Real: acumulado anual (reinicia en enero), por rubro; solo meses cerrados.
    for (yr, n1) in {(f // 100, k) for (f, k) in real_keys}:
        run = 0.0
        for mo in range(1, 13):
            key = (yr * 100 + mo, n1)
            if key in real_keys:
                run += fc[key]
                cur.iat[rowidx[key], c_ytd] = round(run)

    # YTD PPTO: recalcular SOLO los meses futuros (cuyo ppto cambió), acumulando el
    # ppto vigente (pasado congelado + futuro proyectado). El YTD PPTO de los meses
    # cerrados no se toca.
    def _pp(i: int) -> float:
        v = cur.iat[i, c_ppto]
        return float(v) if isinstance(v, (int, float)) and pd.notna(v) else 0.0
    for (yr, n1) in {(f // 100, k) for (f, k) in ppto_keys}:
        run = 0.0
        for mo in range(1, 13):
            key = (yr * 100 + mo, n1)
            if key in rowidx:
                run += _pp(rowidx[key])
                if key in ppto_keys:
                    cur.iat[rowidx[key], c_ytdp] = round(run)

    # ELIMINAR ventas por completo: Real Y Ppto (y sus YTD) en 0 en TODOS los meses,
    # para que la operación de arriendo no arrastre la venta ni en el presupuesto.
    venta_n1 = {norm_map.get(_norm(l)) for l in VENTA_RUBROS} - {None}
    for i in range(len(cur)):
        if cur.iat[i, c_n1] in venta_n1:
            cur.iat[i, c_monto] = 0.0
            cur.iat[i, c_ppto] = 0.0
            cur.iat[i, c_ytd] = 0
            cur.iat[i, c_ytdp] = 0

    _write(engine, TABLE, cur)

    months = sorted({f for (f, _n1) in real_keys})
    fut = sorted({f for (f, _n1) in ppto_keys})
    meses_txt = f"{months[0]}–{months[-1]}" if months else "—"
    fut_txt = f"{fut[0]}–{fut[-1]}" if fut else "—"
    # Formato de retorno homologado a los demás connect_* ({tabla: {...}}) para que
    # el panel de carga arme su resumen "tabla N↻/M+".
    return {
        TABLE: {
            "filas_actualizadas": len(real_keys),
            "filas_insertadas": 0,
            "archivo": os.path.basename(path),
            "periodo_archivo": asof,
            "meses_real": meses_txt,
            "meses_ppto_proyectado": fut_txt,
            "ventas_eliminadas": list(VENTA_RUBROS),
            "nota": "Real de meses cerrados; ppto de meses cerrados congelado; ppto de "
                    "meses futuros = proyección del FC.",
        }
    }

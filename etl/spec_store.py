"""Almacén de specs de ETL con staging / backup / promote / rollback (F4).

El agente mantenedor (`api/agent_etl.py`) NUNCA escribe el spec vivo ni la BD: solo
propone un spec en STAGING y corre dry-runs. La promoción del spec (staging → vivo)
y la carga a la BD las dispara el ADMIN (aprobación humana), respaldando primero el
spec vivo para poder revertir.

Layout (bajo `etl/specs/`):
  <Unit>.<statement>.json              # spec VIVO (lo que usa la carga real)
  _staging/<Unit>/<statement>.json     # spec PROPUESTO por el agente
  _staging/<Unit>/raw/<archivo>        # crudo(s) subido(s) para diagnosticar
  _staging/<Unit>/meta.json            # mapeo archivo→tipo (balance/eerr) + notas
  _backups/<Unit>/<statement>.<ts>.json# respaldo del spec vivo antes de promover

Hoy solo Grupo es spec-driven (Balance/EERR). Otras unidades se agregan a
UNIT_STATEMENTS cuando migren al framework declarativo.
"""
from __future__ import annotations

import datetime as _dt
import json
import shutil
from pathlib import Path

SPECS_DIR = Path(__file__).resolve().parent / "specs"
STAGING_DIR = SPECS_DIR / "_staging"
BACKUP_DIR = SPECS_DIR / "_backups"

# Unidades spec-driven y sus estados. La clave 'kinds' mapea el tipo de archivo
# crudo (como lo clasifica connect_*.classify_*) al 'statement' del spec.
UNIT_STATEMENTS: dict[str, list[str]] = {
    "Grupo": ["balance", "eerr"],
}


def is_spec_driven(unit: str) -> bool:
    return unit in UNIT_STATEMENTS


def statements(unit: str) -> list[str]:
    return UNIT_STATEMENTS.get(unit, [])


# ------------------------------------------------------------------ paths ----
def live_spec_path(unit: str, statement: str) -> Path:
    return SPECS_DIR / f"{unit}.{statement}.json"


def staging_unit_dir(unit: str) -> Path:
    return STAGING_DIR / unit


def raw_dir(unit: str) -> Path:
    return staging_unit_dir(unit) / "raw"


def staged_spec_path(unit: str, statement: str) -> Path:
    return staging_unit_dir(unit) / f"{statement}.json"


def _meta_path(unit: str) -> Path:
    return staging_unit_dir(unit) / "meta.json"


# ------------------------------------------------------------- lectura -------
def read_live_spec(unit: str, statement: str) -> dict:
    return json.loads(live_spec_path(unit, statement).read_text(encoding="utf-8"))


def has_staged_spec(unit: str, statement: str) -> bool:
    return staged_spec_path(unit, statement).exists()


def read_effective_spec(unit: str, statement: str) -> tuple[dict, str]:
    """Spec efectivo: el de staging si existe, si no el vivo. Devuelve (dict, origen)."""
    if has_staged_spec(unit, statement):
        return (json.loads(staged_spec_path(unit, statement).read_text(encoding="utf-8")),
                "staging")
    return read_live_spec(unit, statement), "vivo"


def staged_specs(unit: str) -> dict[str, dict]:
    """{statement: dict} solo para los estados con spec en staging."""
    out: dict[str, dict] = {}
    for st in statements(unit):
        if has_staged_spec(unit, st):
            out[st] = json.loads(staged_spec_path(unit, st).read_text(encoding="utf-8"))
    return out


# -------------------------------------------------------- crudos subidos -----
def read_meta(unit: str) -> dict:
    p = _meta_path(unit)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"files": {}}


def save_raw(unit: str, kind: str, filename: str, data: bytes) -> Path:
    """Guarda un crudo en staging y registra su tipo (balance/eerr). `kind` debe ser
    un statement válido de la unidad."""
    if kind not in statements(unit):
        raise ValueError(f"tipo '{kind}' no válido para {unit} (esperado {statements(unit)})")
    rd = raw_dir(unit)
    rd.mkdir(parents=True, exist_ok=True)
    safe = Path(filename).name  # anti path-traversal
    dest = rd / safe
    dest.write_bytes(data)
    meta = read_meta(unit)
    meta.setdefault("files", {})[kind] = safe
    _meta_path(unit).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return dest


def staged_raw_paths(unit: str) -> dict[str, Path]:
    """{kind: Path} de los crudos subidos que aún existen en disco."""
    meta = read_meta(unit)
    out: dict[str, Path] = {}
    for kind, name in meta.get("files", {}).items():
        p = raw_dir(unit) / name
        if p.exists():
            out[kind] = p
    return out


# ------------------------------------------------------- escribir staging ----
def write_staged_spec(unit: str, statement: str, spec: dict) -> Path:
    """Guarda un spec PROPUESTO en staging. Valida que sea un objeto JSON serializable
    y que conserve la identidad (unit/statement) para no cruzar specs por error."""
    if statement not in statements(unit):
        raise ValueError(f"statement '{statement}' no válido para {unit}")
    if not isinstance(spec, dict):
        raise ValueError("el spec debe ser un objeto JSON (dict)")
    su, ss = spec.get("unit"), spec.get("statement")
    if su not in (None, unit) or ss not in (None, statement):
        raise ValueError(f"el spec dice unit={su}/statement={ss}, se esperaba {unit}/{statement}")
    d = staging_unit_dir(unit)
    d.mkdir(parents=True, exist_ok=True)
    p = staged_spec_path(unit, statement)
    p.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
    return p


def diff_spec(unit: str, statement: str) -> list[str]:
    """Diff unificado (líneas) del spec vivo vs el de staging. Vacío si no hay staging."""
    import difflib
    if not has_staged_spec(unit, statement):
        return []
    live = json.dumps(read_live_spec(unit, statement), ensure_ascii=False, indent=2, sort_keys=True).splitlines()
    stg = json.dumps(json.loads(staged_spec_path(unit, statement).read_text(encoding="utf-8")),
                     ensure_ascii=False, indent=2, sort_keys=True).splitlines()
    return list(difflib.unified_diff(live, stg, fromfile=f"{statement}.vivo", tofile=f"{statement}.staging", lineterm=""))


# --------------------------------------------- promover / revertir / limpiar --
def _ts() -> str:
    return _dt.datetime.now().strftime("%Y%m%d_%H%M%S")


def promote(unit: str) -> dict:
    """Promueve los specs de staging a VIVO, respaldando primero cada spec vivo que se
    va a pisar. Devuelve {promovidos: [...], backups: {statement: path}}. Aprobación
    humana requerida — lo llama el endpoint de 'Aplicar', no el agente."""
    stg = staged_specs(unit)
    if not stg:
        raise ValueError(f"no hay specs en staging para {unit}")
    bdir = BACKUP_DIR / unit
    bdir.mkdir(parents=True, exist_ok=True)
    ts = _ts()
    backups: dict[str, str] = {}
    promoted: list[str] = []
    for st, spec in stg.items():
        live = live_spec_path(unit, st)
        if live.exists():
            bkp = bdir / f"{st}.{ts}.json"
            shutil.copyfile(live, bkp)
            backups[st] = str(bkp)
        live.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
        promoted.append(st)
    return {"promovidos": promoted, "backups": backups, "ts": ts}


def rollback(unit: str) -> dict:
    """Restaura cada spec vivo desde su backup MÁS RECIENTE. Devuelve {restaurados:[...]}."""
    bdir = BACKUP_DIR / unit
    if not bdir.exists():
        raise ValueError(f"no hay backups para {unit}")
    restored: list[str] = []
    for st in statements(unit):
        bkps = sorted(bdir.glob(f"{st}.*.json"))
        if not bkps:
            continue
        shutil.copyfile(bkps[-1], live_spec_path(unit, st))
        restored.append(st)
    if not restored:
        raise ValueError(f"no hay backups de ningún statement para {unit}")
    return {"restaurados": restored}


def clear_staging(unit: str) -> None:
    """Borra staging (specs propuestos + crudos). Se llama tras aplicar o al descartar."""
    d = staging_unit_dir(unit)
    if d.exists():
        shutil.rmtree(d, ignore_errors=True)


def status(unit: str) -> dict:
    """Resumen para la UI: qué hay en staging, qué crudos, si hay backups."""
    return {
        "unit": unit,
        "spec_driven": is_spec_driven(unit),
        "statements": statements(unit),
        "staged_specs": sorted(staged_specs(unit).keys()),
        "raw_files": {k: p.name for k, p in staged_raw_paths(unit).items()},
        "has_backups": (BACKUP_DIR / unit).exists() and any((BACKUP_DIR / unit).glob("*.json")),
    }

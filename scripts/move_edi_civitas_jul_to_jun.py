"""Mueve el corte de comercialización del EDIFICIO (kpis_atempora_edificio) de
julio-2026 (202607) a junio-2026 (202606). El corte se cargó bajo julio pero
corresponde al estado de junio; con esto el gauge 'Ocupación total' de junio queda
cuadrado con el cuadro 'Estado de comercialización — Edificio' y los meses previos
mantienen el cálculo antiguo (no hay corte de edificio antes de junio)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from etl.db import get_engine
from sqlalchemy import text

SRC, DST = 202607, 202606

def main(apply: bool):
    eng = get_engine()
    with eng.begin() as c:
        src = c.execute(text('SELECT COUNT(*) FROM kpis_atempora_edificio WHERE "Fecha ID"=:f'), {"f": SRC}).scalar()
        dst = c.execute(text('SELECT COUNT(*) FROM kpis_atempora_edificio WHERE "Fecha ID"=:f'), {"f": DST}).scalar()
        print(f"filas en {SRC} (jul)={src} · filas en {DST} (jun)={dst}")
        if dst:
            print(f"  ¡ya existen filas en {DST}! aborto para no duplicar."); return
        if not src:
            print(f"  no hay filas en {SRC}, nada que mover."); return
        if not apply:
            print("  (dry-run) usar --apply para mover"); return
        n = c.execute(text('UPDATE kpis_atempora_edificio SET "Fecha ID"=:d WHERE "Fecha ID"=:s'),
                      {"d": DST, "s": SRC}).rowcount
        print(f"  movidas {n} filas {SRC} -> {DST}")
        rows = c.execute(text('SELECT "Estado","Superficie","Pct" FROM kpis_atempora_edificio WHERE "Fecha ID"=:d ORDER BY "Estado"'), {"d": DST}).fetchall()
        tot = sum((r[1] or 0) for r in rows)
        disp = next((r[1] for r in rows if str(r[0]).strip()=="Disponible"), 0) or 0
        print(f"  jun-2026: ocup={(tot-disp)/tot:.4f}  ({tot-disp:.2f}/{tot:.2f} m²)  estados={len(rows)}")

if __name__ == "__main__":
    main("--apply" in sys.argv)

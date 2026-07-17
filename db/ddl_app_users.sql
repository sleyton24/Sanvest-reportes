-- Login de la app Sanvest BI: tabla de usuarios en la base 'sanvest'.
--
-- Contexto: en el clúster compartido, la base/schema 'sanvest' figura a nombre de
-- 'danacorp' (otro proyecto). Tu usuario 'sleyton@sanvest.cl' es dueño de las 57
-- tablas del reporte, pero NO puede crear tablas nuevas en el schema public.
--
-- Opción recomendada (una línea, la corre danacorp UNA vez): darte permiso de
-- crear tablas; después tú creas app_users y queda de TU propiedad, y danacorp no
-- vuelve a intervenir. Esto es lo que hace scripts/setup_prod_auth.py.

--   Como danacorp (dueño del schema):
GRANT CREATE ON SCHEMA public TO "sleyton@sanvest.cl";

-- Luego, ya con tu usuario (sleyton), la tabla la crea la app / el script:
--   python scripts/setup_prod_auth.py --grant-to "sleyton@sanvest.cl" --admin "sleyton@sanvest.cl"
-- o manualmente:

CREATE TABLE IF NOT EXISTS app_users (
  username      TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'viewer',   -- 'admin' | 'viewer'
  units         TEXT NOT NULL DEFAULT '[]',        -- JSON array de ids de unidad (solo viewer)
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT
);

-- En dev (SQLite) nada de esto hace falta: auth.init_db() crea la tabla sola.

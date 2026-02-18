-- ══════════════════════════════════════════════════════════════════════════════
-- SETUP COMPLETO EBD-Chamada
-- Execute este arquivo no Supabase:
--   https://supabase.com/dashboard → SQL Editor → New Query → Cole tudo e execute
-- ══════════════════════════════════════════════════════════════════════════════

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- TABELAS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS turmas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL,
  descricao     TEXT,
  faixa_etaria  TEXT,
  sala          TEXT,
  cor           TEXT NOT NULL DEFAULT 'bg-blue-500',
  ativa         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  especialidade   TEXT,
  telefone        TEXT,
  email           TEXT,
  foto_url        TEXT,
  turma_aluno_id  UUID REFERENCES turmas(id) ON DELETE SET NULL,
  data_ingresso   DATE,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professor_turmas (
  professor_id  UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  turma_id      UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  PRIMARY KEY (professor_id, turma_id)
);

CREATE TABLE IF NOT EXISTS alunos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome             TEXT NOT NULL,
  data_nascimento  DATE,
  responsavel      TEXT,
  telefone         TEXT,
  email            TEXT,
  endereco         TEXT,
  foto_url         TEXT,
  turma_id         UUID REFERENCES turmas(id) ON DELETE SET NULL,
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chamadas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id      UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  professor_id  UUID REFERENCES professores(id) ON DELETE SET NULL,
  data          DATE NOT NULL,
  trimestre     SMALLINT GENERATED ALWAYS AS (CEIL(EXTRACT(MONTH FROM data) / 3.0)::SMALLINT) STORED,
  ano           SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR FROM data)::SMALLINT) STORED,
  oferta        NUMERIC(10,2) NOT NULL DEFAULT 0,
  anotacoes     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (turma_id, data)
);

CREATE TABLE IF NOT EXISTS presencas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamada_id      UUID NOT NULL REFERENCES chamadas(id) ON DELETE CASCADE,
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  presente        BOOLEAN NOT NULL DEFAULT FALSE,
  trouxe_biblia   BOOLEAN NOT NULL DEFAULT FALSE,
  trouxe_revista  BOOLEAN NOT NULL DEFAULT FALSE,
  justificativa   TEXT,
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chamada_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS visitantes (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                 TEXT NOT NULL,
  telefone             TEXT,
  email                TEXT,
  observacao           TEXT,
  convertido_em_aluno  BOOLEAN NOT NULL DEFAULT FALSE,
  aluno_id             UUID REFERENCES alunos(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historico_visitantes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitante_id    UUID NOT NULL REFERENCES visitantes(id) ON DELETE CASCADE,
  turma_id        UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  chamada_id      UUID REFERENCES chamadas(id) ON DELETE SET NULL,
  data            DATE NOT NULL,
  presente        BOOLEAN NOT NULL DEFAULT TRUE,
  trouxe_biblia   BOOLEAN NOT NULL DEFAULT FALSE,
  trouxe_revista  BOOLEAN NOT NULL DEFAULT FALSE,
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data          DATE NOT NULL,
  turma_id      UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  professor_id  UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  trimestre     SMALLINT GENERATED ALWAYS AS (CEIL(EXTRACT(MONTH FROM data) / 3.0)::SMALLINT) STORED,
  ano           SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR FROM data)::SMALLINT) STORED,
  confirmado    BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['turmas','professores','alunos','chamadas','presencas','visitantes','historico_visitantes','escalas']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON %I;
      CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alunos_turma_id        ON alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_chamadas_turma_data     ON chamadas(turma_id, data);
CREATE INDEX IF NOT EXISTS idx_chamadas_data           ON chamadas(data);
CREATE INDEX IF NOT EXISTS idx_presencas_chamada_id    ON presencas(chamada_id);
CREATE INDEX IF NOT EXISTS idx_presencas_aluno_id      ON presencas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_visitante_id  ON historico_visitantes(visitante_id);
CREATE INDEX IF NOT EXISTS idx_escalas_data            ON escalas(data);
CREATE INDEX IF NOT EXISTS idx_escalas_turma_id        ON escalas(turma_id);
CREATE INDEX IF NOT EXISTS idx_escalas_professor_id    ON escalas(professor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — permite acesso anônimo E autenticado (sem login)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE turmas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE professores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_turmas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamadas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitantes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas              ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'turmas','professores','professor_turmas','alunos',
    'chamadas','presencas','visitantes','historico_visitantes','escalas'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "authenticated_all" ON %I;
      DROP POLICY IF EXISTS "anon_all" ON %I;
      CREATE POLICY "anon_all" ON %I
        FOR ALL TO anon, authenticated
        USING (TRUE) WITH CHECK (TRUE);
    ', t, t, t);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL — deve retornar todas as 9 tabelas
-- ─────────────────────────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'turmas','professores','professor_turmas','alunos',
    'chamadas','presencas','visitantes','historico_visitantes','escalas'
  )
ORDER BY table_name;

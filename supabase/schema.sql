-- ══════════════════════════════════════════════════════════════════════════════
-- Schema EBD-Chamada — Escola Bíblica Dominical
-- Execute este arquivo no SQL Editor do Supabase:
--   https://supabase.com/dashboard → SQL Editor → New Query → Cole e execute
-- ══════════════════════════════════════════════════════════════════════════════

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TURMAS
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROFESSORES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  especialidade   TEXT,
  telefone        TEXT,
  email           TEXT,
  foto_url        TEXT,
  turma_aluno_id  UUID REFERENCES turmas(id) ON DELETE SET NULL,  -- turma em que é aluno
  data_ingresso   DATE,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROFESSOR_TURMAS (N:N — turmas que o professor leciona)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professor_turmas (
  professor_id  UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  turma_id      UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  PRIMARY KEY (professor_id, turma_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ALUNOS
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CHAMADAS (cabeçalho por turma/data)
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PRESENÇAS (por aluno por chamada)
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VISITANTES (por chamada)
-- ─────────────────────────────────────────────────────────────────────────────
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

-- Histórico de presença do visitante (qual chamada ele compareceu)
CREATE TABLE IF NOT EXISTS historico_visitantes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitante_id  UUID NOT NULL REFERENCES visitantes(id) ON DELETE CASCADE,
  turma_id      UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  chamada_id    UUID REFERENCES chamadas(id) ON DELETE SET NULL,
  data          DATE NOT NULL,
  presente      BOOLEAN NOT NULL DEFAULT TRUE,
  trouxe_biblia   BOOLEAN NOT NULL DEFAULT FALSE,
  trouxe_revista  BOOLEAN NOT NULL DEFAULT FALSE,
  observacao    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ESCALAS
-- ─────────────────────────────────────────────────────────────────────────────
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
-- 9. TRIGGERS — atualizar updated_at automaticamente
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
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
-- 10. VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- Resumo de chamadas por turma e data
CREATE OR REPLACE VIEW vw_resumo_chamadas_dia AS
SELECT
  c.data,
  COUNT(DISTINCT c.id)::INT                                          AS total_turmas,
  COALESCE(SUM(p.presente::INT), 0)::INT                             AS total_presentes,
  COALESCE(SUM((NOT p.presente)::INT), 0)::INT                       AS total_faltas,
  COALESCE((SELECT COUNT(*) FROM historico_visitantes hv WHERE hv.data = c.data AND hv.presente), 0)::INT AS total_visitantes,
  COALESCE(SUM(p.trouxe_biblia::INT), 0)::INT                        AS total_biblias_alunos,
  COALESCE(SUM(p.trouxe_revista::INT), 0)::INT                       AS total_revistas_alunos,
  COALESCE(SUM(c.oferta), 0)                                         AS total_oferta
FROM chamadas c
LEFT JOIN presencas p ON p.chamada_id = c.id
GROUP BY c.data;

-- Alunos por turma com dados completos
CREATE OR REPLACE VIEW vw_alunos_por_turma AS
SELECT
  t.id      AS turma_id,
  t.nome    AS turma_nome,
  t.cor     AS turma_cor,
  t.sala    AS turma_sala,
  a.id      AS aluno_id,
  a.nome    AS aluno_nome,
  a.data_nascimento,
  a.responsavel,
  a.telefone,
  a.email,
  a.ativo
FROM turmas t
LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = TRUE
WHERE t.ativa = TRUE;

-- Frequência geral por aluno
CREATE OR REPLACE VIEW vw_frequencia_alunos AS
SELECT
  a.id                                                       AS aluno_id,
  a.nome                                                     AS aluno_nome,
  t.id                                                       AS turma_id,
  t.nome                                                     AS turma_nome,
  COUNT(p.id)::INT                                           AS total_aulas,
  COALESCE(SUM(p.presente::INT), 0)::INT                    AS presencas,
  COALESCE(SUM((NOT p.presente)::INT), 0)::INT              AS faltas,
  CASE WHEN COUNT(p.id) > 0
    THEN ROUND(SUM(p.presente::INT) * 100.0 / COUNT(p.id), 1)
    ELSE 0
  END                                                        AS percentual_presenca
FROM alunos a
LEFT JOIN turmas t ON t.id = a.turma_id
LEFT JOIN presencas p ON p.aluno_id = a.id
WHERE a.ativo = TRUE
GROUP BY a.id, a.nome, t.id, t.nome;

-- Escalas detalhadas
CREATE OR REPLACE VIEW vw_escalas_detalhadas AS
SELECT
  e.id,
  e.data,
  e.trimestre,
  e.ano,
  e.confirmado,
  e.observacoes,
  t.id    AS turma_id,
  t.nome  AS turma_nome,
  t.cor   AS turma_cor,
  t.sala,
  pr.id   AS professor_id,
  pr.nome AS professor_nome,
  pr.telefone AS professor_telefone,
  pr.email    AS professor_email
FROM escalas e
JOIN turmas t     ON t.id  = e.turma_id
JOIN professores pr ON pr.id = e.professor_id;

-- Visitantes com histórico de presença
CREATE OR REPLACE VIEW vw_visitantes_com_historico AS
SELECT
  v.id,
  v.nome,
  v.telefone,
  v.email,
  v.observacao,
  v.convertido_em_aluno,
  v.aluno_id,
  COALESCE(SUM(hv.presente::INT), 0)::INT    AS total_presencas,
  COALESCE(SUM((NOT hv.presente)::INT), 0)::INT AS total_faltas,
  MAX(hv.data)                               AS ultima_presenca,
  v.created_at
FROM visitantes v
LEFT JOIN historico_visitantes hv ON hv.visitante_id = v.id
GROUP BY v.id, v.nome, v.telefone, v.email, v.observacao,
         v.convertido_em_aluno, v.aluno_id, v.created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
-- Habilita RLS em todas as tabelas
ALTER TABLE turmas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE professores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_turmas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamadas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitantes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas             ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados têm acesso total (ajuste conforme necessário)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'turmas','professores','professor_turmas','alunos',
    'chamadas','presencas','visitantes','historico_visitantes','escalas'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "authenticated_all" ON %I;
      CREATE POLICY "authenticated_all" ON %I
        FOR ALL TO authenticated
        USING (TRUE) WITH CHECK (TRUE);
    ', t, t);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. ÍNDICES
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

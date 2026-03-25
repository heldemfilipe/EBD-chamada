-- ═══════════════════════════════════════════════════════════════════════════════
-- Migração: Notificações WhatsApp
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Configuração global (uma única linha)
CREATE TABLE IF NOT EXISTS notificacoes_config (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo           boolean     NOT NULL DEFAULT false,
  dia_envio       smallint    NOT NULL DEFAULT 1,        -- 0=dom..6=sab
  horario_envio   text        NOT NULL DEFAULT '09:00',  -- HH:MM
  dia_aula        smallint    NOT NULL DEFAULT 0,        -- dia da semana da aula
  template        text        NOT NULL DEFAULT
    'Paz do Senhor, *{professor}*! Tudo bem? 🙏

Lembrete: você está escalado para a *Aula {aula}* no *{dia_semana} ({data})* na sala *{sala}*.

Pode contar com você? 😊',
  zapi_instance_id text       NOT NULL DEFAULT '',
  zapi_token       text       NOT NULL DEFAULT '',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Garante que só exista uma linha
CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_config_single ON notificacoes_config ((true));

-- 2. Controle por semana (silenciar / mensagem personalizada por professor+data)
CREATE TABLE IF NOT EXISTS notificacoes_semana (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  data_aula             date    NOT NULL,
  professor_id          uuid    NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  turma_id              uuid    NOT NULL REFERENCES turmas(id)      ON DELETE CASCADE,
  silenciado            boolean NOT NULL DEFAULT false,
  mensagem_personalizada text,
  UNIQUE (data_aula, professor_id, turma_id)
);

-- 3. Log de envios
CREATE TABLE IF NOT EXISTS notificacoes_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id     uuid        REFERENCES professores(id),
  turma_id         uuid        REFERENCES turmas(id),
  data_aula        date,
  numero_telefone  text,
  mensagem         text,
  status           text        NOT NULL,   -- 'enviado' | 'erro' | 'silenciado' | 'sem_telefone'
  erro             text,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notif_semana_data   ON notificacoes_semana (data_aula);
CREATE INDEX IF NOT EXISTS idx_notif_log_criado    ON notificacoes_log    (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_professor ON notificacoes_log    (professor_id);

-- RLS: apenas service_role e admin podem acessar
ALTER TABLE notificacoes_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_semana  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_log     ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura e escrita apenas para autenticados (ajuste conforme sua política)
CREATE POLICY "autenticados podem ler config"    ON notificacoes_config  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem alterar config" ON notificacoes_config FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados podem ler semana"    ON notificacoes_semana  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem alterar semana" ON notificacoes_semana FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados podem ler log"       ON notificacoes_log     FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_role pode inserir log"    ON notificacoes_log     FOR INSERT TO service_role  WITH CHECK (true);

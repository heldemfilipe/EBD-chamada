-- Migração: adicionar suporte ao Baileys via Evolution API
-- Execute no Supabase SQL Editor após notificacoes-meta.sql

ALTER TABLE notificacoes_config
  ADD COLUMN IF NOT EXISTS baileys_url       text,
  ADD COLUMN IF NOT EXISTS baileys_instance  text,
  ADD COLUMN IF NOT EXISTS baileys_token     text;

COMMENT ON COLUMN notificacoes_config.baileys_url      IS 'URL base do servidor Evolution API (ex: http://localhost:8080)';
COMMENT ON COLUMN notificacoes_config.baileys_instance IS 'Nome da instância criada no Evolution API';
COMMENT ON COLUMN notificacoes_config.baileys_token    IS 'API Key do servidor Evolution API (opcional)';

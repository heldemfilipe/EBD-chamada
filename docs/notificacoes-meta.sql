-- Migração: adicionar suporte à Meta Cloud API (WhatsApp Business API)
-- Execute no Supabase SQL Editor após notificacoes-whatsapp.sql

ALTER TABLE notificacoes_config
  ADD COLUMN IF NOT EXISTS provedor              text    DEFAULT 'zapi',         -- 'zapi' | 'meta'
  ADD COLUMN IF NOT EXISTS meta_access_token     text,
  ADD COLUMN IF NOT EXISTS meta_phone_number_id  text,
  ADD COLUMN IF NOT EXISTS meta_template_name    text,
  ADD COLUMN IF NOT EXISTS meta_template_language text   DEFAULT 'pt_BR';

COMMENT ON COLUMN notificacoes_config.provedor              IS 'Provedor de envio: zapi (Z-API) ou meta (Meta Cloud API)';
COMMENT ON COLUMN notificacoes_config.meta_access_token     IS 'Token de acesso permanente do Meta for Developers';
COMMENT ON COLUMN notificacoes_config.meta_phone_number_id  IS 'Phone Number ID do painel Meta for Developers';
COMMENT ON COLUMN notificacoes_config.meta_template_name    IS 'Nome do template aprovado pela Meta (ex: ebd_lembrete)';
COMMENT ON COLUMN notificacoes_config.meta_template_language IS 'Código do idioma do template (padrão: pt_BR)';

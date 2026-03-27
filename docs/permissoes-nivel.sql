-- Adiciona nivel de permissao por modulo
-- Execute no Supabase SQL Editor
ALTER TABLE permissoes_modulos
  ADD COLUMN IF NOT EXISTS nivel TEXT NOT NULL DEFAULT 'editar'
  CHECK (nivel IN ('ver', 'editar'));

COMMENT ON COLUMN permissoes_modulos.nivel IS 'ver = somente visualizar, editar = visualizar + editar';

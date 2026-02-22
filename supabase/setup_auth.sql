-- ============================================================
-- SETUP AUTH: Perfis e Permissões de Usuários
-- Execute APÓS setup_completo.sql no Supabase SQL Editor
-- ============================================================

-- ─── 1. TABELAS ─────────────────────────────────────────────────────────────

-- Perfil de usuário (vinculado ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS perfis (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'usuario' CHECK (role IN ('admin', 'usuario')),
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Módulos que o colaborador pode acessar
-- (admins têm acesso automático a tudo — não precisam de registros aqui)
CREATE TABLE IF NOT EXISTS permissoes_modulos (
  perfil_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  modulo    TEXT NOT NULL CHECK (modulo IN ('dashboard','alunos','professores','turmas','chamada','escala','relatorios')),
  PRIMARY KEY (perfil_id, modulo)
);

-- Turmas que o colaborador pode gerenciar na chamada
CREATE TABLE IF NOT EXISTS permissoes_turmas (
  perfil_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  turma_id  UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, turma_id)
);

-- ─── 2. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissoes_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissoes_turmas ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode LER perfis e permissões (para o sistema funcionar)
CREATE POLICY "perfis_select"    ON perfis            FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "perm_mod_select"  ON permissoes_modulos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "perm_turm_select" ON permissoes_turmas  FOR SELECT TO authenticated USING (TRUE);

-- Escrita apenas pelo service_role (via API Routes com SUPABASE_SERVICE_ROLE_KEY)
-- authenticated não pode inserir/atualizar/deletar diretamente

-- ─── 3. PRIMEIRO ADMIN ───────────────────────────────────────────────────────
--
-- Passo 1: No Supabase Dashboard → Authentication → Users → "Add User"
--          Crie o primeiro usuário admin com email e senha.
--
-- Passo 2: Copie o UUID gerado e substitua abaixo, depois execute:
--
-- INSERT INTO perfis (id, nome, role)
-- VALUES ('<UUID-DO-USUARIO-CRIADO>', 'Administrador', 'admin');
--
-- Após isso, o admin poderá criar novos usuários pelo sistema.

-- ─── 4. VERIFICAÇÃO ──────────────────────────────────────────────────────────
SELECT 'Tabelas de auth criadas com sucesso!' AS status;

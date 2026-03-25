-- =========================================================
-- Migration 005: Corrige escala 2T/2026 (versão final)
-- Nomes exatos conforme cadastro na migration 003.
-- =========================================================

-- ─── Passo 1: Remove escala 2T/2026 existente ────────────
DELETE FROM escalas WHERE data BETWEEN '2026-04-05' AND '2026-06-28';

-- ─── Passo 2: Adiciona novos professores se necessário ───
INSERT INTO professores (nome)
SELECT 'Vitoria Aparecida'
WHERE NOT EXISTS (SELECT 1 FROM professores WHERE nome = 'Vitoria Aparecida');

INSERT INTO professores (nome)
SELECT 'Vitoria Bento'
WHERE NOT EXISTS (SELECT 1 FROM professores WHERE nome = 'Vitoria Bento');

-- ─── Passo 3: Insere escala corrigida ────────────────────
-- Notas:
--   ★ = 2° domingo do mês — Filhas do Rei unida com Heróis
--   Heldem → Shekinah (L4, L7, L10)
--   Leandro → Dynamo (L1) e Filhas (L12)
--   Leandro fora dos 2os domingos

-- ── L1 – 05/04/2026 ──────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Nathielly' AND ativo=true LIMIT 1),
  '2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Julia' AND ativo=true LIMIT 1),
  '2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Leandro' AND ativo=true LIMIT 1),
  '2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Abner%' AND ativo=true LIMIT 1),
  '2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Carla' AND ativo=true LIMIT 1),
  '2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Fabio' AND ativo=true LIMIT 1),
  '2026-04-05');

-- ── L2★ – 12/04/2026 (2° domingo — Filhas do Rei unida) ──
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),
  '2026-04-12');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Samantha' AND ativo=true LIMIT 1),
  '2026-04-12');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Livys' AND ativo=true LIMIT 1),
  '2026-04-12');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Emyly' AND ativo=true LIMIT 1),
  '2026-04-12');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Cleber' AND ativo=true LIMIT 1),
  '2026-04-12');

-- ── L3 – 19/04/2026 ──────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Bento' AND ativo=true LIMIT 1),
  '2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Julia' AND ativo=true LIMIT 1),
  '2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Mirian' AND ativo=true LIMIT 1),
  '2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Mikael' AND ativo=true LIMIT 1),
  '2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Gabriela' AND ativo=true LIMIT 1),
  '2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Eder%' AND ativo=true LIMIT 1),
  '2026-04-19');

-- ── L4 – 26/04/2026 ──────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Nathielly' AND ativo=true LIMIT 1),
  '2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),
  '2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Livys' AND ativo=true LIMIT 1),
  '2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Heldem%' AND ativo=true LIMIT 1),
  '2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Adriana' AND ativo=true LIMIT 1),
  '2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Fabio' AND ativo=true LIMIT 1),
  '2026-04-26');

-- ── L5 – 03/05/2026 ──────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Viviana' AND ativo=true LIMIT 1),
  '2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Julia' AND ativo=true LIMIT 1),
  '2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Mirian' AND ativo=true LIMIT 1),
  '2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Abner%' AND ativo=true LIMIT 1),
  '2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Gabriela' AND ativo=true LIMIT 1),
  '2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Eder%' AND ativo=true LIMIT 1),
  '2026-05-03');

-- ── L6★ – 10/05/2026 (2° domingo — Filhas do Rei unida) ──
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Bento' AND ativo=true LIMIT 1),
  '2026-05-10');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),
  '2026-05-10');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Daniel%' AND ativo=true LIMIT 1),
  '2026-05-10');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Emyly' AND ativo=true LIMIT 1),
  '2026-05-10');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Fabio' AND ativo=true LIMIT 1),
  '2026-05-10');

-- ── L7 – 17/05/2026 ──────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Viviana' AND ativo=true LIMIT 1),
  '2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Julia' AND ativo=true LIMIT 1),
  '2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Livys' AND ativo=true LIMIT 1),
  '2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Heldem%' AND ativo=true LIMIT 1),
  '2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Maria Fernandes' AND ativo=true LIMIT 1),
  '2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Cleber' AND ativo=true LIMIT 1),
  '2026-05-17');

-- ── L8 – 24/05/2026 ──────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),
  '2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Bento' AND ativo=true LIMIT 1),
  '2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Mirian' AND ativo=true LIMIT 1),
  '2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Marconiel' AND ativo=true LIMIT 1),
  '2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Adriana' AND ativo=true LIMIT 1),
  '2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Fabio' AND ativo=true LIMIT 1),
  '2026-05-24');

-- ── L9 – 31/05/2026 ──────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Viviana' AND ativo=true LIMIT 1),
  '2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Samantha' AND ativo=true LIMIT 1),
  '2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Livys' AND ativo=true LIMIT 1),
  '2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Abner%' AND ativo=true LIMIT 1),
  '2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Carla' AND ativo=true LIMIT 1),
  '2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Eder%' AND ativo=true LIMIT 1),
  '2026-05-31');

-- ── L10 – 07/06/2026 ─────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Nathielly' AND ativo=true LIMIT 1),
  '2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Bento' AND ativo=true LIMIT 1),
  '2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Daniel%' AND ativo=true LIMIT 1),
  '2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Heldem%' AND ativo=true LIMIT 1),
  '2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Maria Fernandes' AND ativo=true LIMIT 1),
  '2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Fabio' AND ativo=true LIMIT 1),
  '2026-06-07');

-- ── L11★ – 14/06/2026 (2° domingo — Filhas do Rei unida) ─
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),
  '2026-06-14');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Samantha' AND ativo=true LIMIT 1),
  '2026-06-14');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Mirian' AND ativo=true LIMIT 1),
  '2026-06-14');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Emyly' AND ativo=true LIMIT 1),
  '2026-06-14');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Cleber' AND ativo=true LIMIT 1),
  '2026-06-14');

-- ── L12 – 21/06/2026 ─────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Vitoria Bento' AND ativo=true LIMIT 1),
  '2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Julia' AND ativo=true LIMIT 1),
  '2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Livys' AND ativo=true LIMIT 1),
  '2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Marconiel' AND ativo=true LIMIT 1),
  '2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Leandro' AND ativo=true LIMIT 1),
  '2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Fabio' AND ativo=true LIMIT 1),
  '2026-06-21');

-- ── L13 – 28/06/2026 ─────────────────────────────────────
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Nathielly' AND ativo=true LIMIT 1),
  '2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Guerreiros de Cristo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Samantha' AND ativo=true LIMIT 1),
  '2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Dynamo' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Mirian' AND ativo=true LIMIT 1),
  '2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Shekinah' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Mikael' AND ativo=true LIMIT 1),
  '2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Filhas do Rei' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome='Carla' AND ativo=true LIMIT 1),
  '2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES (
  (SELECT id FROM turmas WHERE nome='Heróis da Fé' AND ativa=true LIMIT 1),
  (SELECT id FROM professores WHERE nome ILIKE '%Eder%' AND ativo=true LIMIT 1),
  '2026-06-28');

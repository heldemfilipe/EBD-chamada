-- ============================================================
-- MIGRATION 004 — Escala 2° Trimestre 2026 (v2 — corrigida)
-- Gerado em: 2026-03-25
--
-- Sem bloco DO $$: usa subqueries escalares inline, compatível
-- com o SQL Editor do Supabase e qualquer client PostgreSQL.
--
-- Correções em relação à v1 (003):
--   • L1 (05/04): Adriana e Cleber não podem lecionar (aula 13 do 1T = 29/03)
--   • Nenhum professor com domingos consecutivos ENTRE turmas
--   • Livys e Mirian: foco no Dynamo (5 aulas cada)
--   • VitoriaA e VitoriaB: rotação sem consecutivos
--
-- Professores que lecionaram em 29/03 (não podem fazer L1):
--   Viviana, Adriana, Samantha, Cleber, Marconiel, Livys
--
-- Resumo da escala:
--   L    Data   Cordeirinhos  Guerreiros  Dynamo  Shekinah   Filhas     Heróis
--   1   05/04   Nathielly     Julia       Heldem  Abner      Carla      Fabio
--   2★  12/04   VitoriaA      Samantha    Livys   Emyly      —          Leandro
--   3   19/04   VitoriaB      Julia       Mirian  Mikael     Gabriela   Eder
--   4   26/04   Nathielly     Samantha    Livys   Marconiel  Adriana    Heldem
--   5   03/05   VitoriaA      Julia       Mirian  Abner      Carla      Eder
--   6★  10/05   VitoriaB      Samantha    Daniel  Emyly      —          Fabio
--   7   17/05   Nathielly     Julia       Livys   Cleber     Maria F.   Heldem
--   8   24/05   VitoriaA      Samantha    Mirian  Marconiel  Adriana    Fabio
--   9   31/05   VitoriaB      Julia       Livys   Abner      Carla      Eder
--   10  07/06   Nathielly     Samantha    Daniel  Mikael     Maria F.   Heldem
--   11★ 14/06   VitoriaA      Julia       Mirian  Emyly      —          Cleber
--   12  21/06   VitoriaB      Samantha    Livys   Marconiel  Adriana    Fabio
--   13  28/06   Nathielly     Julia       Mirian  Cleber     Gabriela   Eder
--   ★ = Filhas do Rei unida com Heróis da Fé (2º domingo do mês)
-- ============================================================

-- ---- Apagar escala existente do 2° trimestre de 2026 ----
DELETE FROM escalas
WHERE data BETWEEN '2026-04-05' AND '2026-06-28';

-- ============================================================
-- L1 — 05/04/2026: Nathielly | Julia | Heldem | Abner | Carla | Fabio
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo' AND ativa = true  LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Nathielly'              AND ativo = true  LIMIT 1),
   '2026-04-05', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'   AND ativa = true  LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Julia'                  AND ativo = true  LIMIT 1),
   '2026-04-05', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                 AND ativa = true  LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Heldem%'           AND ativo = true  LIMIT 1),
   '2026-04-05', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'               AND ativa = true  LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Abner%'            AND ativo = true  LIMIT 1),
   '2026-04-05', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'          AND ativa = true  LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Carla'                  AND ativo = true  LIMIT 1),
   '2026-04-05', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'           AND ativa = true  LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Fabio'                  AND ativo = true  LIMIT 1),
   '2026-04-05', 2);

-- ============================================================
-- L2★ — 12/04/2026 (2º dom — Filhas do Rei unida com Heróis):
-- VitoriaA | Samantha | Livys | Emyly | — | Leandro
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Vitoria Aparecida'        AND ativo = true LIMIT 1),
   '2026-04-12', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'     AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Samantha'                 AND ativo = true LIMIT 1),
   '2026-04-12', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Livys'                    AND ativo = true LIMIT 1),
   '2026-04-12', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Emyly'                    AND ativo = true LIMIT 1),
   '2026-04-12', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'             AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Leandro'                  AND ativo = true LIMIT 1),
   '2026-04-12', 2);
-- Nota: Filhas do Rei unida com Heróis neste domingo (2º domingo)

-- ============================================================
-- L3 — 19/04/2026: VitoriaB | Julia | Mirian | Mikael | Gabriela | Eder
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo' AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Vitoria Bento'          AND ativo = true LIMIT 1),
   '2026-04-19', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Julia'                  AND ativo = true LIMIT 1),
   '2026-04-19', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Mirian'                 AND ativo = true LIMIT 1),
   '2026-04-19', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'               AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Mikael'                 AND ativo = true LIMIT 1),
   '2026-04-19', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'          AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Gabriela'               AND ativo = true LIMIT 1),
   '2026-04-19', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'           AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Eder%'             AND ativo = true LIMIT 1),
   '2026-04-19', 2);

-- ============================================================
-- L4 — 26/04/2026: Nathielly | Samantha | Livys | Marconiel | Adriana | Heldem
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo' AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Nathielly'              AND ativo = true LIMIT 1),
   '2026-04-26', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Samantha'               AND ativo = true LIMIT 1),
   '2026-04-26', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Livys'                  AND ativo = true LIMIT 1),
   '2026-04-26', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'               AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Marconiel'              AND ativo = true LIMIT 1),
   '2026-04-26', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'          AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Adriana'                AND ativo = true LIMIT 1),
   '2026-04-26', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'           AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Heldem%'           AND ativo = true LIMIT 1),
   '2026-04-26', 2);

-- ============================================================
-- L5 — 03/05/2026: VitoriaA | Julia | Mirian | Abner | Carla | Eder
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Vitoria Aparecida'        AND ativo = true LIMIT 1),
   '2026-05-03', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'     AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Julia'                    AND ativo = true LIMIT 1),
   '2026-05-03', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Mirian'                   AND ativo = true LIMIT 1),
   '2026-05-03', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Abner%'              AND ativo = true LIMIT 1),
   '2026-05-03', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'            AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Carla'                    AND ativo = true LIMIT 1),
   '2026-05-03', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'             AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Eder%'               AND ativo = true LIMIT 1),
   '2026-05-03', 2);

-- ============================================================
-- L6★ — 10/05/2026 (2º dom — Filhas do Rei unida com Heróis):
-- VitoriaB | Samantha | Daniel | Emyly | — | Fabio
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Vitoria Bento'            AND ativo = true LIMIT 1),
   '2026-05-10', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'     AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Samantha'                 AND ativo = true LIMIT 1),
   '2026-05-10', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Daniel%'             AND ativo = true LIMIT 1),
   '2026-05-10', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Emyly'                    AND ativo = true LIMIT 1),
   '2026-05-10', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'             AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Fabio'                    AND ativo = true LIMIT 1),
   '2026-05-10', 2);
-- Nota: Filhas do Rei unida com Heróis neste domingo (2º domingo)

-- ============================================================
-- L7 — 17/05/2026: Nathielly | Julia | Livys | Cleber | Maria F. | Heldem
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo' AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Nathielly'              AND ativo = true LIMIT 1),
   '2026-05-17', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Julia'                  AND ativo = true LIMIT 1),
   '2026-05-17', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Livys'                  AND ativo = true LIMIT 1),
   '2026-05-17', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'               AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Cleber'                 AND ativo = true LIMIT 1),
   '2026-05-17', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'          AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Maria%'            AND ativo = true LIMIT 1),
   '2026-05-17', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'           AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Heldem%'           AND ativo = true LIMIT 1),
   '2026-05-17', 2);

-- ============================================================
-- L8 — 24/05/2026: VitoriaA | Samantha | Mirian | Marconiel | Adriana | Fabio
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Vitoria Aparecida'        AND ativo = true LIMIT 1),
   '2026-05-24', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'     AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Samantha'                 AND ativo = true LIMIT 1),
   '2026-05-24', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Mirian'                   AND ativo = true LIMIT 1),
   '2026-05-24', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Marconiel'                AND ativo = true LIMIT 1),
   '2026-05-24', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'            AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Adriana'                  AND ativo = true LIMIT 1),
   '2026-05-24', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'             AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Fabio'                    AND ativo = true LIMIT 1),
   '2026-05-24', 2);

-- ============================================================
-- L9 — 31/05/2026: VitoriaB | Julia | Livys | Abner | Carla | Eder
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Vitoria Bento'            AND ativo = true LIMIT 1),
   '2026-05-31', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'     AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Julia'                    AND ativo = true LIMIT 1),
   '2026-05-31', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Livys'                    AND ativo = true LIMIT 1),
   '2026-05-31', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Abner%'              AND ativo = true LIMIT 1),
   '2026-05-31', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'            AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Carla'                    AND ativo = true LIMIT 1),
   '2026-05-31', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'             AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Eder%'               AND ativo = true LIMIT 1),
   '2026-05-31', 2);

-- ============================================================
-- L10 — 07/06/2026: Nathielly | Samantha | Daniel | Mikael | Maria F. | Heldem
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo' AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Nathielly'              AND ativo = true LIMIT 1),
   '2026-06-07', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Samantha'               AND ativo = true LIMIT 1),
   '2026-06-07', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Daniel%'           AND ativo = true LIMIT 1),
   '2026-06-07', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'               AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Mikael'                 AND ativo = true LIMIT 1),
   '2026-06-07', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'          AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Maria%'            AND ativo = true LIMIT 1),
   '2026-06-07', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'           AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Heldem%'           AND ativo = true LIMIT 1),
   '2026-06-07', 2);

-- ============================================================
-- L11★ — 14/06/2026 (2º dom — Filhas do Rei unida com Heróis):
-- VitoriaA | Julia | Mirian | Emyly | — | Cleber
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Vitoria Aparecida'        AND ativo = true LIMIT 1),
   '2026-06-14', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'     AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Julia'                    AND ativo = true LIMIT 1),
   '2026-06-14', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Mirian'                   AND ativo = true LIMIT 1),
   '2026-06-14', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Emyly'                    AND ativo = true LIMIT 1),
   '2026-06-14', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'             AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Cleber'                   AND ativo = true LIMIT 1),
   '2026-06-14', 2);
-- Nota: Filhas do Rei unida com Heróis neste domingo (2º domingo)

-- ============================================================
-- L12 — 21/06/2026: VitoriaB | Samantha | Livys | Marconiel | Adriana | Fabio
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Vitoria Bento'            AND ativo = true LIMIT 1),
   '2026-06-21', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'     AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Samantha'                 AND ativo = true LIMIT 1),
   '2026-06-21', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Livys'                    AND ativo = true LIMIT 1),
   '2026-06-21', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Marconiel'                AND ativo = true LIMIT 1),
   '2026-06-21', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'            AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Adriana'                  AND ativo = true LIMIT 1),
   '2026-06-21', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'             AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Fabio'                    AND ativo = true LIMIT 1),
   '2026-06-21', 2);

-- ============================================================
-- L13 — 28/06/2026: Nathielly | Julia | Mirian | Cleber | Gabriela | Eder
-- ============================================================
INSERT INTO escalas (turma_id, professor_id, data, trimestre)
VALUES
  ((SELECT id FROM turmas      WHERE nome = 'Cordeirinhos de Cristo' AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Nathielly'              AND ativo = true LIMIT 1),
   '2026-06-28', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Guerreiros de Cristo'   AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Julia'                  AND ativo = true LIMIT 1),
   '2026-06-28', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Dynamo'                 AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Mirian'                 AND ativo = true LIMIT 1),
   '2026-06-28', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Shekinah'               AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Cleber'                 AND ativo = true LIMIT 1),
   '2026-06-28', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Filhas do Rei'          AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome = 'Gabriela'               AND ativo = true LIMIT 1),
   '2026-06-28', 2),
  ((SELECT id FROM turmas      WHERE nome = 'Heróis da Fé'           AND ativa = true LIMIT 1),
   (SELECT id FROM professores WHERE nome ILIKE '%Eder%'             AND ativo = true LIMIT 1),
   '2026-06-28', 2);

-- ============================================================
-- Verificação final: contar registros inseridos
-- ============================================================
SELECT COUNT(*) AS total_inserido,
       MIN(data) AS primeira_aula,
       MAX(data) AS ultima_aula
FROM escalas
WHERE data BETWEEN '2026-04-05' AND '2026-06-28';

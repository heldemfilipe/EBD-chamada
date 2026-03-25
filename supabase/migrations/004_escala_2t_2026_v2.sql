-- ============================================================
-- MIGRATION 004 — Escala 2° Trimestre 2026 (v2 — corrigida)
-- Gerado em: 2026-03-25
--
-- Colunas geradas (trimestre, ano) NAO sao inseridas.
--
-- Resumo da escala:
--   L    Data   Cordeirinhos  Guerreiros  Dynamo  Shekinah   Filhas     Herois
--   1   05/04   Nathielly     Julia       Heldem  Abner      Carla      Fabio
--   2*  12/04   VitoriaA      Samantha    Livys   Emyly      -          Leandro
--   3   19/04   VitoriaB      Julia       Mirian  Mikael     Gabriela   Eder
--   4   26/04   Nathielly     Samantha    Livys   Marconiel  Adriana    Heldem
--   5   03/05   VitoriaA      Julia       Mirian  Abner      Carla      Eder
--   6*  10/05   VitoriaB      Samantha    Daniel  Emyly      -          Fabio
--   7   17/05   Nathielly     Julia       Livys   Cleber     Maria F.   Heldem
--   8   24/05   VitoriaA      Samantha    Mirian  Marconiel  Adriana    Fabio
--   9   31/05   VitoriaB      Julia       Livys   Abner      Carla      Eder
--   10  07/06   Nathielly     Samantha    Daniel  Mikael     Maria F.   Heldem
--   11* 14/06   VitoriaA      Julia       Mirian  Emyly      -          Cleber
--   12  21/06   VitoriaB      Samantha    Livys   Marconiel  Adriana    Fabio
--   13  28/06   Nathielly     Julia       Mirian  Cleber     Gabriela   Eder
--   * = Filhas do Rei unida com Herois da Fe (2 domingo do mes)
-- ============================================================

DELETE FROM escalas WHERE data BETWEEN '2026-04-05' AND '2026-06-28';

-- L1 05/04
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Nathielly' AND ativo=true LIMIT 1),'2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Julia'     AND ativo=true LIMIT 1),'2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Heldem%' AND ativo=true LIMIT 1),'2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Abner%'  AND ativo=true LIMIT 1),'2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Carla'     AND ativo=true LIMIT 1),'2026-04-05');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Fabio'     AND ativo=true LIMIT 1),'2026-04-05');

-- L2 12/04 (2 domingo - Filhas do Rei unida)
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),'2026-04-12');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Samantha'          AND ativo=true LIMIT 1),'2026-04-12');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Livys'             AND ativo=true LIMIT 1),'2026-04-12');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Emyly'             AND ativo=true LIMIT 1),'2026-04-12');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Leandro'           AND ativo=true LIMIT 1),'2026-04-12');

-- L3 19/04
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Vitoria Bento' AND ativo=true LIMIT 1),'2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Julia'         AND ativo=true LIMIT 1),'2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Mirian'        AND ativo=true LIMIT 1),'2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Mikael'        AND ativo=true LIMIT 1),'2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Gabriela'      AND ativo=true LIMIT 1),'2026-04-19');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Eder%'  AND ativo=true LIMIT 1),'2026-04-19');

-- L4 26/04
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Nathielly'          AND ativo=true LIMIT 1),'2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Samantha'           AND ativo=true LIMIT 1),'2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Livys'              AND ativo=true LIMIT 1),'2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Marconiel'          AND ativo=true LIMIT 1),'2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Adriana'            AND ativo=true LIMIT 1),'2026-04-26');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Heldem%'     AND ativo=true LIMIT 1),'2026-04-26');

-- L5 03/05
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),'2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Julia'             AND ativo=true LIMIT 1),'2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Mirian'            AND ativo=true LIMIT 1),'2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Abner%'     AND ativo=true LIMIT 1),'2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Carla'             AND ativo=true LIMIT 1),'2026-05-03');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Eder%'      AND ativo=true LIMIT 1),'2026-05-03');

-- L6 10/05 (2 domingo - Filhas do Rei unida)
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Vitoria Bento'  AND ativo=true LIMIT 1),'2026-05-10');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Samantha'       AND ativo=true LIMIT 1),'2026-05-10');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Daniel%' AND ativo=true LIMIT 1),'2026-05-10');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Emyly'          AND ativo=true LIMIT 1),'2026-05-10');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Fabio'          AND ativo=true LIMIT 1),'2026-05-10');

-- L7 17/05
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Nathielly'      AND ativo=true LIMIT 1),'2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Julia'          AND ativo=true LIMIT 1),'2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Livys'          AND ativo=true LIMIT 1),'2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Cleber'         AND ativo=true LIMIT 1),'2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Maria%'  AND ativo=true LIMIT 1),'2026-05-17');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Heldem%' AND ativo=true LIMIT 1),'2026-05-17');

-- L8 24/05
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),'2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Samantha'          AND ativo=true LIMIT 1),'2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Mirian'            AND ativo=true LIMIT 1),'2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Marconiel'         AND ativo=true LIMIT 1),'2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Adriana'           AND ativo=true LIMIT 1),'2026-05-24');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Fabio'             AND ativo=true LIMIT 1),'2026-05-24');

-- L9 31/05
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Vitoria Bento' AND ativo=true LIMIT 1),'2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Julia'         AND ativo=true LIMIT 1),'2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Livys'         AND ativo=true LIMIT 1),'2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Abner%' AND ativo=true LIMIT 1),'2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Carla'         AND ativo=true LIMIT 1),'2026-05-31');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Eder%'  AND ativo=true LIMIT 1),'2026-05-31');

-- L10 07/06
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Nathielly'      AND ativo=true LIMIT 1),'2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Samantha'        AND ativo=true LIMIT 1),'2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Daniel%'  AND ativo=true LIMIT 1),'2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Mikael'          AND ativo=true LIMIT 1),'2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Maria%'   AND ativo=true LIMIT 1),'2026-06-07');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Heldem%'  AND ativo=true LIMIT 1),'2026-06-07');

-- L11 14/06 (2 domingo - Filhas do Rei unida)
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Vitoria Aparecida' AND ativo=true LIMIT 1),'2026-06-14');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Julia'             AND ativo=true LIMIT 1),'2026-06-14');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Mirian'            AND ativo=true LIMIT 1),'2026-06-14');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Emyly'             AND ativo=true LIMIT 1),'2026-06-14');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Cleber'            AND ativo=true LIMIT 1),'2026-06-14');

-- L12 21/06
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Vitoria Bento' AND ativo=true LIMIT 1),'2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Samantha'      AND ativo=true LIMIT 1),'2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Livys'         AND ativo=true LIMIT 1),'2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Marconiel'     AND ativo=true LIMIT 1),'2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Adriana'       AND ativo=true LIMIT 1),'2026-06-21');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Fabio'         AND ativo=true LIMIT 1),'2026-06-21');

-- L13 28/06
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Cordeirinhos de Cristo' AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Nathielly' AND ativo=true LIMIT 1),'2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Guerreiros de Cristo'   AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Julia'     AND ativo=true LIMIT 1),'2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Dynamo'                 AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Mirian'    AND ativo=true LIMIT 1),'2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Shekinah'               AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Cleber'    AND ativo=true LIMIT 1),'2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome='Filhas do Rei'          AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome='Gabriela'  AND ativo=true LIMIT 1),'2026-06-28');
INSERT INTO escalas (turma_id, professor_id, data) VALUES ((SELECT id FROM turmas WHERE nome ILIKE 'Her_is da F_'           AND ativa=true LIMIT 1),(SELECT id FROM professores WHERE nome ILIKE '%Eder%' AND ativo=true LIMIT 1),'2026-06-28');

-- Verificacao final
SELECT COUNT(*) AS total, MIN(data) AS primeira, MAX(data) AS ultima
FROM escalas WHERE data BETWEEN '2026-04-05' AND '2026-06-28';

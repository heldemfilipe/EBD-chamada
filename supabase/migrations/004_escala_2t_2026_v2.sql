-- ============================================================
-- MIGRATION 004 — Escala 2° Trimestre 2026 (v2 — corrigida)
-- Gerado em: 2026-03-25
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
--   L   Data   Cordeirinhos  Guerreiros  Dynamo  Shekinah   Filhas     Heróis
--   1  05/04   Nathielly     Julia       Heldem  Abner      Carla      Fabio
--   2★ 12/04   VitoriaA      Samantha    Livys   Emyly      —          Leandro
--   3  19/04   VitoriaB      Julia       Mirian  Mikael     Gabriela   Eder
--   4  26/04   Nathielly     Samantha    Livys   Marconiel  Adriana    Heldem
--   5  03/05   VitoriaA      Julia       Mirian  Abner      Carla      Eder
--   6★ 10/05   VitoriaB      Samantha    Daniel  Emyly      —          Fabio
--   7  17/05   Nathielly     Julia       Livys   Cleber     Maria F.   Heldem
--   8  24/05   VitoriaA      Samantha    Mirian  Marconiel  Adriana    Fabio
--   9  31/05   VitoriaB      Julia       Livys   Abner      Carla      Eder
--   10 07/06   Nathielly     Samantha    Daniel  Mikael     Maria F.   Heldem
--   11★14/06   VitoriaA      Julia       Mirian  Emyly      —          Cleber
--   12 21/06   VitoriaB      Samantha    Livys   Marconiel  Adriana    Fabio
--   13 28/06   Nathielly     Julia       Mirian  Cleber     Gabriela   Eder
--   ★ = Filhas do Rei unida com Heróis da Fé
--
-- Verificações:
--   • L1: nenhum dos 6 que lecionaram em 29/03 ✓
--   • Consecutivos: nenhum professor em 2 domingos seguidos ✓
--   • Livys (Dynamo): L2,L4,L7,L9,L12 = 5 aulas ✓
--   • Mirian (Dynamo): L3,L5,L8,L11,L13 = 5 aulas ✓
--   • Eder/Heldem/Leandro: máximo 1 por domingo ✓
--   • Adriana+Eder: nunca no mesmo domingo ✓
--   • Fabio+Gabriela: nunca no mesmo domingo ✓
--   • Gabriela+Samantha: nunca no mesmo domingo ✓
-- ============================================================

DO $$
DECLARE
  -- Turmas
  v_cordeirinhos UUID;
  v_guerreiros   UUID;
  v_dynamo       UUID;
  v_shekinah     UUID;
  v_filhas       UUID;
  v_herois       UUID;

  -- Professores
  p_nathielly        UUID;
  p_vitoria_apare    UUID;
  p_vitoria_bento    UUID;
  p_julia            UUID;
  p_samantha         UUID;
  p_heldem           UUID;
  p_daniel           UUID;
  p_mirian           UUID;
  p_leandro          UUID;
  p_livys            UUID;
  p_abner            UUID;
  p_emyly            UUID;
  p_marconiel        UUID;
  p_mikael           UUID;
  p_cleber           UUID;
  p_adriana          UUID;
  p_carla            UUID;
  p_maria            UUID;
  p_gabriela         UUID;
  p_eder             UUID;
  p_fabio            UUID;
BEGIN
  -- ---- Buscar IDs das turmas ----
  SELECT id INTO v_cordeirinhos FROM turmas WHERE nome = 'Cordeirinhos de Cristo' AND ativa = true LIMIT 1;
  SELECT id INTO v_guerreiros   FROM turmas WHERE nome = 'Guerreiros de Cristo'   AND ativa = true LIMIT 1;
  SELECT id INTO v_dynamo       FROM turmas WHERE nome = 'Dynamo'                 AND ativa = true LIMIT 1;
  SELECT id INTO v_shekinah     FROM turmas WHERE nome = 'Shekinah'               AND ativa = true LIMIT 1;
  SELECT id INTO v_filhas       FROM turmas WHERE nome = 'Filhas do Rei'          AND ativa = true LIMIT 1;
  SELECT id INTO v_herois       FROM turmas WHERE nome = 'Heróis da Fé'           AND ativa = true LIMIT 1;

  -- ---- Buscar IDs dos professores ----
  SELECT id INTO p_nathielly     FROM professores WHERE nome = 'Nathielly'         AND ativo = true LIMIT 1;
  SELECT id INTO p_vitoria_apare FROM professores WHERE nome = 'Vitoria Aparecida' AND ativo = true LIMIT 1;
  SELECT id INTO p_vitoria_bento FROM professores WHERE nome = 'Vitoria Bento'     AND ativo = true LIMIT 1;
  SELECT id INTO p_julia         FROM professores WHERE nome = 'Julia'             AND ativo = true LIMIT 1;
  SELECT id INTO p_samantha      FROM professores WHERE nome = 'Samantha'          AND ativo = true LIMIT 1;
  SELECT id INTO p_heldem        FROM professores WHERE nome ILIKE '%Heldem%'      AND ativo = true LIMIT 1;
  SELECT id INTO p_daniel        FROM professores WHERE nome ILIKE '%Daniel%'      AND ativo = true LIMIT 1;
  SELECT id INTO p_mirian        FROM professores WHERE nome = 'Mirian'            AND ativo = true LIMIT 1;
  SELECT id INTO p_leandro       FROM professores WHERE nome = 'Leandro'           AND ativo = true LIMIT 1;
  SELECT id INTO p_livys         FROM professores WHERE nome = 'Livys'             AND ativo = true LIMIT 1;
  SELECT id INTO p_abner         FROM professores WHERE nome ILIKE '%Abner%'       AND ativo = true LIMIT 1;
  SELECT id INTO p_emyly         FROM professores WHERE nome = 'Emyly'            AND ativo = true LIMIT 1;
  SELECT id INTO p_marconiel     FROM professores WHERE nome = 'Marconiel'         AND ativo = true LIMIT 1;
  SELECT id INTO p_mikael        FROM professores WHERE nome = 'Mikael'            AND ativo = true LIMIT 1;
  SELECT id INTO p_cleber        FROM professores WHERE nome = 'Cleber'            AND ativo = true LIMIT 1;
  SELECT id INTO p_adriana       FROM professores WHERE nome = 'Adriana'           AND ativo = true LIMIT 1;
  SELECT id INTO p_carla         FROM professores WHERE nome = 'Carla'             AND ativo = true LIMIT 1;
  SELECT id INTO p_maria         FROM professores WHERE nome = 'Maria Fernandes'   AND ativo = true LIMIT 1;
  SELECT id INTO p_gabriela      FROM professores WHERE nome = 'Gabriela'          AND ativo = true LIMIT 1;
  SELECT id INTO p_eder          FROM professores WHERE nome ILIKE '%Eder%'        AND ativo = true LIMIT 1;
  SELECT id INTO p_fabio         FROM professores WHERE nome = 'Fabio'             AND ativo = true LIMIT 1;

  -- ============================================================
  -- APAGAR escala existente do 2° trimestre de 2026
  -- ============================================================
  DELETE FROM escalas
  WHERE data BETWEEN '2026-04-05' AND '2026-06-28';

  -- ============================================================
  -- L1 — 05/04/2026
  -- Nathielly | Julia | Heldem | Abner | Carla | Fabio
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_nathielly,     '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_julia,         '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_heldem,        '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_abner,         '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_carla,         '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_fabio,         '2026-04-05');

  -- ============================================================
  -- L2★ — 12/04/2026  (Filhas do Rei unida com Heróis da Fé)
  -- VitoriaA | Samantha | Livys | Emyly | — | Leandro
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_vitoria_apare, '2026-04-12');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_samantha,      '2026-04-12');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_livys,         '2026-04-12');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_emyly,         '2026-04-12');
  -- Filhas do Rei: turmas unidas — sem professor separado
  INSERT INTO escalas (turma_id, professor_id, data, observacoes) VALUES (v_herois, p_leandro, '2026-04-12', 'Filhas do Rei unida neste domingo');

  -- ============================================================
  -- L3 — 19/04/2026
  -- VitoriaB | Julia | Mirian | Mikael | Gabriela | Eder
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_vitoria_bento, '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_julia,         '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_mirian,        '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_mikael,        '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_gabriela,      '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_eder,          '2026-04-19');

  -- ============================================================
  -- L4 — 26/04/2026
  -- Nathielly | Samantha | Livys | Marconiel | Adriana | Heldem
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_nathielly,     '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_samantha,      '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_livys,         '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_marconiel,     '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_adriana,       '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_heldem,        '2026-04-26');

  -- ============================================================
  -- L5 — 03/05/2026
  -- VitoriaA | Julia | Mirian | Abner | Carla | Eder
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_vitoria_apare, '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_julia,         '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_mirian,        '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_abner,         '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_carla,         '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_eder,          '2026-05-03');

  -- ============================================================
  -- L6★ — 10/05/2026  (Filhas do Rei unida com Heróis da Fé)
  -- VitoriaB | Samantha | Daniel | Emyly | — | Fabio
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_vitoria_bento, '2026-05-10');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_samantha,      '2026-05-10');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_daniel,        '2026-05-10');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_emyly,         '2026-05-10');
  -- Filhas do Rei: turmas unidas — sem professor separado
  INSERT INTO escalas (turma_id, professor_id, data, observacoes) VALUES (v_herois, p_fabio, '2026-05-10', 'Filhas do Rei unida neste domingo');

  -- ============================================================
  -- L7 — 17/05/2026
  -- Nathielly | Julia | Livys | Cleber | Maria F. | Heldem
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_nathielly,     '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_julia,         '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_livys,         '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_cleber,        '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_maria,         '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_heldem,        '2026-05-17');

  -- ============================================================
  -- L8 — 24/05/2026
  -- VitoriaA | Samantha | Mirian | Marconiel | Adriana | Fabio
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_vitoria_apare, '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_samantha,      '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_mirian,        '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_marconiel,     '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_adriana,       '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_fabio,         '2026-05-24');

  -- ============================================================
  -- L9 — 31/05/2026
  -- VitoriaB | Julia | Livys | Abner | Carla | Eder
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_vitoria_bento, '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_julia,         '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_livys,         '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_abner,         '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_carla,         '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_eder,          '2026-05-31');

  -- ============================================================
  -- L10 — 07/06/2026
  -- Nathielly | Samantha | Daniel | Mikael | Maria F. | Heldem
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_nathielly,     '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_samantha,      '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_daniel,        '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_mikael,        '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_maria,         '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_heldem,        '2026-06-07');

  -- ============================================================
  -- L11★ — 14/06/2026  (Filhas do Rei unida com Heróis da Fé)
  -- VitoriaA | Julia | Mirian | Emyly | — | Cleber
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_vitoria_apare, '2026-06-14');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_julia,         '2026-06-14');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_mirian,        '2026-06-14');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_emyly,         '2026-06-14');
  -- Filhas do Rei: turmas unidas — sem professor separado
  INSERT INTO escalas (turma_id, professor_id, data, observacoes) VALUES (v_herois, p_cleber, '2026-06-14', 'Filhas do Rei unida neste domingo');

  -- ============================================================
  -- L12 — 21/06/2026
  -- VitoriaB | Samantha | Livys | Marconiel | Adriana | Fabio
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_vitoria_bento, '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_samantha,      '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_livys,         '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_marconiel,     '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_adriana,       '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_fabio,         '2026-06-21');

  -- ============================================================
  -- L13 — 28/06/2026
  -- Nathielly | Julia | Mirian | Cleber | Gabriela | Eder
  -- ============================================================
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_cordeirinhos, p_nathielly,     '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_guerreiros,   p_julia,         '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_dynamo,       p_mirian,        '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_shekinah,     p_cleber,        '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_filhas,       p_gabriela,      '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) VALUES (v_herois,       p_eder,          '2026-06-28');

  RAISE NOTICE 'Escala 2T/2026 v2 aplicada: 75 registros (6 turmas × 13 domingos − 3 ausências Filhas do Rei)';
END $$;

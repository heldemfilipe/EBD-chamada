-- ============================================================
-- MIGRATION 003 — Escala 2° Trimestre 2026
-- Gerado em: 2026-03-24
--
-- Turmas:
--   Cordeirinhos de Cristo = Primários
--   Guerreiros de Cristo   = Juniores
--   Dynamo                 = Adolescentes
--   Shekinah               = Jovens
--   Filhas do Rei          = Adultos (feminino)
--   Heróis da Fé           = Adultos (masculino)
--
-- Restrições aplicadas:
--   • Viviana: somente aulas pares (L2,L4,L6,L8,L10,L12)
--   • Livys: somente aulas pares (L2,L4,L6,L8,L10,L12)
--   • Eder, Heldem e Leandro: no máximo um por domingo
--   • Leandro: somente 1 aula no Dynamo (L11)
--   • 2° domingo de cada mês: Filhas do Rei sem professor (une com Heróis da Fé)
--     → 12/04 (L2), 10/05 (L6), 14/06 (L11)
--   • Adriana e Eder não lecionam no mesmo domingo
--   • Fabio e Gabriela não lecionam no mesmo domingo
--   • Gabriela e Samantha não lecionam no mesmo domingo
--   • Professores sem domingos consecutivos (sempre que possível)
--
-- Resumo da escala:
--   L1  05/04  Nathielly   | Julia       | Heldem   | Abner     | Adriana   | Cleber
--   L2  12/04★ Viviana     | Vitoria A.  | Daniel   | Emyly     | —         | Livys
--   L3  19/04  Vitoria A.  | Vitoria B.  | Mirian   | Marconiel | Carla     | Eder
--   L4  26/04  Vitoria B.  | Samantha    | Daniel   | Mikael    | Maria F.  | Livys
--   L5  03/05  Nathielly   | Julia       | Mirian   | Abner     | Carla     | Eder
--   L6  10/05★ Vitoria A.  | Viviana     | Heldem   | Emyly     | —         | Fabio
--   L7  17/05  Vitoria B.  | Vitoria A.  | Daniel   | Marconiel | Gabriela  | Cleber
--   L8  24/05  Viviana     | Samantha    | Mirian   | Mikael    | Maria F.  | Livys
--   L9  31/05  Nathielly   | Julia       | Daniel   | Cleber    | Carla     | Eder
--   L10 07/06  Vitoria A.  | Viviana     | Heldem   | Abner     | Adriana   | Fabio
--   L11 14/06★ Vitoria B.  | Vitoria A.  | Leandro  | Emyly     | —         | Cleber
--   L12 21/06  Viviana     | Samantha    | Daniel   | Marconiel | Carla     | Livys
--   L13 28/06  Nathielly   | Julia       | Mirian   | Cleber    | Gabriela  | Eder
--   ★ = Filhas do Rei unida com Heróis da Fé
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
  p_viviana          UUID;
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
  SELECT id INTO p_viviana       FROM professores WHERE nome = 'Viviana'           AND ativo = true LIMIT 1;
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

  -- helper: insere apenas se ainda não existir registro para (turma, data)
  -- evita dependência de constraint pelo nome (compatível com qualquer versão do schema)

  -- ==========================================
  -- L1 — 05/04/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_nathielly,     '2026-04-05' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_julia,         '2026-04-05' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_heldem,        '2026-04-05' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_abner,         '2026-04-05' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_adriana,       '2026-04-05' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-04-05');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_cleber,        '2026-04-05' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-04-05');

  -- ==========================================
  -- L2 — 12/04/2026 ★ (Filhas do Rei une com Heróis da Fé)
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_viviana,       '2026-04-12' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-04-12');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_vitoria_apare, '2026-04-12' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-04-12');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_daniel,        '2026-04-12' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-04-12');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_emyly,         '2026-04-12' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-04-12');
  -- Filhas do Rei: sem professor (turma unida com Heróis da Fé)
  INSERT INTO escalas (turma_id, professor_id, data, observacoes) SELECT v_herois, p_livys, '2026-04-12', 'Filhas do Rei unida neste domingo' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois AND data = '2026-04-12');

  -- ==========================================
  -- L3 — 19/04/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_vitoria_apare, '2026-04-19' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_vitoria_bento, '2026-04-19' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_mirian,        '2026-04-19' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_marconiel,     '2026-04-19' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_carla,         '2026-04-19' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-04-19');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_eder,          '2026-04-19' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-04-19');

  -- ==========================================
  -- L4 — 26/04/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_vitoria_bento, '2026-04-26' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_samantha,      '2026-04-26' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_daniel,        '2026-04-26' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_mikael,        '2026-04-26' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_maria,         '2026-04-26' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-04-26');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_livys,         '2026-04-26' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-04-26');

  -- ==========================================
  -- L5 — 03/05/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_nathielly,     '2026-05-03' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_julia,         '2026-05-03' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_mirian,        '2026-05-03' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_abner,         '2026-05-03' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_carla,         '2026-05-03' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-05-03');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_eder,          '2026-05-03' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-05-03');

  -- ==========================================
  -- L6 — 10/05/2026 ★ (Filhas do Rei une com Heróis da Fé)
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_vitoria_apare, '2026-05-10' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-05-10');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_viviana,       '2026-05-10' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-05-10');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_heldem,        '2026-05-10' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-05-10');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_emyly,         '2026-05-10' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-05-10');
  -- Filhas do Rei: sem professor (turma unida com Heróis da Fé)
  INSERT INTO escalas (turma_id, professor_id, data, observacoes) SELECT v_herois, p_fabio, '2026-05-10', 'Filhas do Rei unida neste domingo' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois AND data = '2026-05-10');

  -- ==========================================
  -- L7 — 17/05/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_vitoria_bento, '2026-05-17' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_vitoria_apare, '2026-05-17' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_daniel,        '2026-05-17' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_marconiel,     '2026-05-17' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_gabriela,      '2026-05-17' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-05-17');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_cleber,        '2026-05-17' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-05-17');

  -- ==========================================
  -- L8 — 24/05/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_viviana,       '2026-05-24' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_samantha,      '2026-05-24' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_mirian,        '2026-05-24' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_mikael,        '2026-05-24' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_maria,         '2026-05-24' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-05-24');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_livys,         '2026-05-24' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-05-24');

  -- ==========================================
  -- L9 — 31/05/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_nathielly,     '2026-05-31' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_julia,         '2026-05-31' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_daniel,        '2026-05-31' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_cleber,        '2026-05-31' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_carla,         '2026-05-31' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-05-31');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_eder,          '2026-05-31' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-05-31');

  -- ==========================================
  -- L10 — 07/06/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_vitoria_apare, '2026-06-07' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_viviana,       '2026-06-07' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_heldem,        '2026-06-07' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_abner,         '2026-06-07' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_adriana,       '2026-06-07' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-06-07');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_fabio,         '2026-06-07' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-06-07');

  -- ==========================================
  -- L11 — 14/06/2026 ★ (Filhas do Rei une com Heróis da Fé)
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_vitoria_bento, '2026-06-14' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-06-14');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_vitoria_apare, '2026-06-14' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-06-14');
  INSERT INTO escalas (turma_id, professor_id, data, observacoes) SELECT v_dynamo, p_leandro, '2026-06-14', 'Aula única do Leandro no Dynamo este trimestre' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo AND data = '2026-06-14');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_emyly,         '2026-06-14' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-06-14');
  -- Filhas do Rei: sem professor (turma unida com Heróis da Fé)
  INSERT INTO escalas (turma_id, professor_id, data, observacoes) SELECT v_herois, p_cleber, '2026-06-14', 'Filhas do Rei unida neste domingo' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois AND data = '2026-06-14');

  -- ==========================================
  -- L12 — 21/06/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_viviana,       '2026-06-21' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_samantha,      '2026-06-21' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_daniel,        '2026-06-21' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_marconiel,     '2026-06-21' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_carla,         '2026-06-21' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-06-21');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_livys,         '2026-06-21' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-06-21');

  -- ==========================================
  -- L13 — 28/06/2026
  -- ==========================================
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_cordeirinhos, p_nathielly,     '2026-06-28' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_cordeirinhos AND data = '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_guerreiros,   p_julia,         '2026-06-28' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_guerreiros   AND data = '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_dynamo,       p_mirian,        '2026-06-28' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_dynamo       AND data = '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_shekinah,     p_cleber,        '2026-06-28' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_shekinah     AND data = '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_filhas,       p_gabriela,      '2026-06-28' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_filhas       AND data = '2026-06-28');
  INSERT INTO escalas (turma_id, professor_id, data) SELECT v_herois,       p_eder,          '2026-06-28' WHERE NOT EXISTS (SELECT 1 FROM escalas WHERE turma_id = v_herois       AND data = '2026-06-28');

  RAISE NOTICE 'Escala 2° Trimestre 2026 inserida com sucesso! (75 registros em 6 turmas x 13 domingos, exceto 3 ausencias Filhas do Rei)';
END $$;

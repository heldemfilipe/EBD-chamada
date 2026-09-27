-- Escala do 4º trimestre de 2026 (congregação Jardim Novo 1) com os títulos das lições CPAD
-- Atualiza as escalas já existentes (mesma data + turma) e insere as que faltam.
-- "sem professor" fica com professor_id NULL. ano/trimestre são colunas geradas.
BEGIN;

CREATE TEMP TABLE _escala_4t (data date, turma text, professor text, titulo text) ON COMMIT DROP;
INSERT INTO _escala_4t (data, turma, professor, titulo) VALUES
  ('2026-10-04', 'Cordeirinhos de Cristo', 'Nathielly', 'Deus Criou o Mundo Perfeito!'),
  ('2026-10-04', 'Guerreiros de Cristo', 'Julia', 'Davi, o Rei Amado'),
  ('2026-10-04', 'Valentes de Davi', 'Mirian', 'O Bom Conselho dos Pais'),
  ('2026-10-04', 'Dynamo', 'Daniel Bezerra', 'A Natureza do Espírito Santo'),
  ('2026-10-04', 'Shekinah', 'Abner Lima', 'Carta aos Filipenses: um Chamado à Alegria'),
  ('2026-10-04', 'Filhas do Rei', NULL, 'Deuteronômio: o Livro da Aliança'),
  ('2026-10-04', 'Heróis da Fé', 'Cleber', 'Deuteronômio: o Livro da Aliança'),
  ('2026-10-11', 'Cordeirinhos de Cristo', 'Vitoria Aparecida', 'O Primeiro Pecado'),
  ('2026-10-11', 'Guerreiros de Cristo', 'Samantha', 'Salomão, o Rei Mais Sábio'),
  ('2026-10-11', 'Valentes de Davi', 'Daniel Bezerra', 'Sobre as Falsas Amizades'),
  ('2026-10-11', 'Dynamo', 'Geisa', 'Os Nomes do Espírito Santo'),
  ('2026-10-11', 'Shekinah', 'Mikael', 'Uma Vida Digna do Evangelho'),
  ('2026-10-11', 'Filhas do Rei', NULL, 'Recapitulando a Jornada no Deserto'),
  ('2026-10-11', 'Heróis da Fé', 'Fabio', 'Recapitulando a Jornada no Deserto'),
  ('2026-10-18', 'Cordeirinhos de Cristo', 'Vitoria Bento', 'O Pecado Gera a Morte'),
  ('2026-10-18', 'Guerreiros de Cristo', 'Julia', 'Roboão Divide o Reino'),
  ('2026-10-18', 'Valentes de Davi', 'Heldem Filipe', 'A Sabedoria e o Temor do Senhor'),
  ('2026-10-18', 'Dynamo', 'Mirian', 'Os Símbolos do Espírito Santo'),
  ('2026-10-18', 'Shekinah', 'Cleber', 'A Humildade de Cristo: o Exemplo Supremo'),
  ('2026-10-18', 'Filhas do Rei', 'Carla', 'A Fidelidade de Deus diante da Infidelidade de Israel'),
  ('2026-10-18', 'Heróis da Fé', 'Eder Lobato', 'A Fidelidade de Deus diante da Infidelidade de Israel'),
  ('2026-10-25', 'Cordeirinhos de Cristo', 'Viviana', 'O Pecado Destrói o Mundo, mas Deus Deseja Salvá-lo'),
  ('2026-10-25', 'Guerreiros de Cristo', 'Vitoria Aparecida', 'Jeroboão e a Falsa Fé'),
  ('2026-10-25', 'Valentes de Davi', 'Geisa', 'A Importância da Disciplina'),
  ('2026-10-25', 'Dynamo', 'Daniel Bezerra', 'O Espírito Santo no Antigo Testamento'),
  ('2026-10-25', 'Shekinah', 'Emyly', 'Brilhe a Luz de Cristo em Meio à Geração Corrompida'),
  ('2026-10-25', 'Filhas do Rei', 'Adriana', 'O Chamado à Obediência'),
  ('2026-10-25', 'Heróis da Fé', 'Heldem Filipe', 'O Chamado à Obediência'),
  ('2026-11-01', 'Cordeirinhos de Cristo', 'Nathielly', 'Amigos de Deus São Inimigos do Pecado'),
  ('2026-11-01', 'Guerreiros de Cristo', 'Vitoria Bento', 'Asa, um Rei Bom para Israel'),
  ('2026-11-01', 'Valentes de Davi', 'Mirian', 'Aprendendo em Família'),
  ('2026-11-01', 'Dynamo', 'Heldem Filipe', 'O Espírito Santo no Novo Testamento'),
  ('2026-11-01', 'Shekinah', 'Lucas', 'Exemplo de Servos Fiéis: Timóteo e Epafrodito'),
  ('2026-11-01', 'Filhas do Rei', 'Gabriela', 'O Grande Mandamento'),
  ('2026-11-01', 'Heróis da Fé', 'Leandro', 'O Grande Mandamento'),
  ('2026-11-08', 'Cordeirinhos de Cristo', 'Vitoria Aparecida', 'Deus Quer Nos Libertar da Escravidão do Pecado'),
  ('2026-11-08', 'Guerreiros de Cristo', 'Viviana', 'O Reino de Acabe e a Sua Idolatria'),
  ('2026-11-08', 'Valentes de Davi', 'Livys', 'Preservando Boas Amizades'),
  ('2026-11-08', 'Dynamo', 'Geisa', 'O Espírito Atuante em Cristo'),
  ('2026-11-08', 'Shekinah', 'Marconiel', 'Guardando-se dos Falsos Mestres'),
  ('2026-11-08', 'Filhas do Rei', NULL, 'A Aliança e as Bênçãos da Obediência'),
  ('2026-11-08', 'Heróis da Fé', 'Cleber', 'A Aliança e as Bênçãos da Obediência'),
  ('2026-11-15', 'Cordeirinhos de Cristo', 'Vitoria Bento', 'Como Ficar Longe do Mal do Pecado?'),
  ('2026-11-15', 'Guerreiros de Cristo', 'Samantha', 'Jeú Acaba com a Idolatria'),
  ('2026-11-15', 'Valentes de Davi', 'Heldem Filipe', 'Fuja das Tentações!'),
  ('2026-11-15', 'Dynamo', 'Mirian', 'O Espírito Santo Atuando no Crente'),
  ('2026-11-15', 'Shekinah', 'Mikael', 'O Alvo Supremo: Conhecer a Cristo'),
  ('2026-11-15', 'Filhas do Rei', 'Maria Fernandes', 'Maldições e Bênçãos da Aliança'),
  ('2026-11-15', 'Heróis da Fé', 'Eder Lobato', 'Maldições e Bênçãos da Aliança'),
  ('2026-11-22', 'Cordeirinhos de Cristo', 'Viviana', 'A Obediência Traz Muitas Bênçãos'),
  ('2026-11-22', 'Guerreiros de Cristo', 'Vitoria Aparecida', 'Josafá, um Rei Justo e Temente a Deus'),
  ('2026-11-22', 'Valentes de Davi', 'Carla', 'Diga Não à Preguiça!'),
  ('2026-11-22', 'Dynamo', 'Livys', 'O Batismo no Espírito Santo'),
  ('2026-11-22', 'Shekinah', 'Abner Lima', 'Unidade e Alegria no Senhor'),
  ('2026-11-22', 'Filhas do Rei', 'Leandro', 'Escolhendo a Vida ou a Morte'),
  ('2026-11-22', 'Heróis da Fé', 'Fabio', 'Escolhendo a Vida ou a Morte'),
  ('2026-11-29', 'Cordeirinhos de Cristo', 'Nathielly', 'O Povo de Deus Imita os Pecadores?'),
  ('2026-11-29', 'Guerreiros de Cristo', 'Vitoria Bento', 'Acazias, um Rei Duro de Coração'),
  ('2026-11-29', 'Valentes de Davi', 'Daniel Bezerra', 'Diga Não à Mentira!'),
  ('2026-11-29', 'Dynamo', 'Heldem Filipe', 'Os Dons do Espírito Santo'),
  ('2026-11-29', 'Shekinah', 'Marconiel', 'A Paz de Deus Guarda o Coração'),
  ('2026-11-29', 'Filhas do Rei', 'Adriana', 'A Sucessão de Moisés'),
  ('2026-11-29', 'Heróis da Fé', 'Leandro', 'A Sucessão de Moisés'),
  ('2026-12-06', 'Cordeirinhos de Cristo', 'Vitoria Aparecida', 'Deus Envia o Salvador!'),
  ('2026-12-06', 'Guerreiros de Cristo', 'Viviana', 'Oseias Reina e o Povo se Desvia'),
  ('2026-12-06', 'Valentes de Davi', 'Geisa', 'O Cuidado com as Palavras'),
  ('2026-12-06', 'Dynamo', 'Livys', 'Conservando o Poder'),
  ('2026-12-06', 'Shekinah', 'Cleber', 'O Pensar Cristão: o que Ocupa a Sua Mente?'),
  ('2026-12-06', 'Filhas do Rei', 'Carla', 'O Cântico de Moisés: Advertência e Esperança'),
  ('2026-12-06', 'Heróis da Fé', 'Eder Lobato', 'O Cântico de Moisés: Advertência e Esperança'),
  ('2026-12-13', 'Cordeirinhos de Cristo', 'Vitoria Bento', 'Morrer para o Pecado, Viver para Jesus'),
  ('2026-12-13', 'Guerreiros de Cristo', 'Julia', 'Ezequias, um Rei de Oração'),
  ('2026-12-13', 'Valentes de Davi', 'Mirian', 'O Perigo da Inveja'),
  ('2026-12-13', 'Dynamo', 'Daniel Bezerra', 'O Fruto do Espírito Santo'),
  ('2026-12-13', 'Shekinah', 'Emyly', 'Contentamento em Toda e Qualquer Situação'),
  ('2026-12-13', 'Filhas do Rei', 'Leandro', 'A Bênção Final de Moisés'),
  ('2026-12-13', 'Heróis da Fé', 'Fabio', 'A Bênção Final de Moisés'),
  ('2026-12-20', 'Cordeirinhos de Cristo', 'Viviana', 'O Presente da Salvação'),
  ('2026-12-20', 'Guerreiros de Cristo', 'Samantha', 'Manassés, um Rei Arrependido'),
  ('2026-12-20', 'Valentes de Davi', 'Livys', 'O Valor da Humildade'),
  ('2026-12-20', 'Dynamo', 'Geisa', 'Pecando Contra o Espírito Santo'),
  ('2026-12-20', 'Shekinah', 'Heldem Filipe', 'Generosidade e Cuidado com a Obra de Deus'),
  ('2026-12-20', 'Filhas do Rei', 'Gabriela', 'A Morte de Moisés e a Continuidade da Promessa'),
  ('2026-12-20', 'Heróis da Fé', 'Cleber', 'A Morte de Moisés e a Continuidade da Promessa'),
  ('2026-12-27', 'Cordeirinhos de Cristo', 'Nathielly', 'Um Lugar Maravilhoso Está Sendo Preparado'),
  ('2026-12-27', 'Guerreiros de Cristo', 'Vitoria Aparecida', 'Josias Reina e Renova a Aliança com Deus'),
  ('2026-12-27', 'Valentes de Davi', 'Carla', 'A Recompensa por Fazer o que É Certo'),
  ('2026-12-27', 'Dynamo', 'Mirian', 'Busque o Batismo no Espírito Santo'),
  ('2026-12-27', 'Shekinah', 'Lucas', 'Saudações Finais, Comunhão e Bênçãos'),
  ('2026-12-27', 'Filhas do Rei', 'Maria Fernandes', 'O Cumprimento de Deuteronômio em Cristo'),
  ('2026-12-27', 'Heróis da Fé', 'Leandro', 'O Cumprimento de Deuteronômio em Cristo');

CREATE TEMP TABLE _escala_4t_ids ON COMMIT DROP AS
SELECT x.data, t.id AS turma_id, p.id AS professor_id, x.titulo, x.professor
FROM _escala_4t x
JOIN turmas t ON t.nome = x.turma AND t.congregacao_id = 'c84176df-27bf-4ef1-9b35-9f86ee79dda9'
LEFT JOIN professores p ON p.nome = x.professor AND p.congregacao_id = 'c84176df-27bf-4ef1-9b35-9f86ee79dda9';

-- Aborta tudo se alguma turma/professor não for encontrado
DO $$
BEGIN
  IF (SELECT count(*) FROM _escala_4t_ids) <> 91
     OR EXISTS (SELECT 1 FROM _escala_4t_ids WHERE professor IS NOT NULL AND professor_id IS NULL) THEN
    RAISE EXCEPTION 'Turma ou professor não encontrado - nada foi alterado';
  END IF;
END $$;

-- Atualiza as existentes (zera lembrete/confirmação apenas se o professor mudou)
UPDATE escalas e SET
  titulo_aula           = i.titulo,
  professor_id          = i.professor_id,
  confirmado            = CASE WHEN e.professor_id IS DISTINCT FROM i.professor_id THEN false ELSE e.confirmado END,
  confirmado_em         = CASE WHEN e.professor_id IS DISTINCT FROM i.professor_id THEN NULL  ELSE e.confirmado_em END,
  lembrete_enviado_em   = CASE WHEN e.professor_id IS DISTINCT FROM i.professor_id THEN NULL  ELSE e.lembrete_enviado_em END,
  lembrete_reenviado_em = CASE WHEN e.professor_id IS DISTINCT FROM i.professor_id THEN NULL  ELSE e.lembrete_reenviado_em END
FROM _escala_4t_ids i
WHERE e.data = i.data AND e.turma_id = i.turma_id;

-- Insere as que faltam
INSERT INTO escalas (data, turma_id, professor_id, titulo_aula, congregacao_id)
SELECT i.data, i.turma_id, i.professor_id, i.titulo, 'c84176df-27bf-4ef1-9b35-9f86ee79dda9'
FROM _escala_4t_ids i
WHERE NOT EXISTS (SELECT 1 FROM escalas e WHERE e.data = i.data AND e.turma_id = i.turma_id);

COMMIT;

-- Conferência:
-- SELECT e.data, t.nome AS turma, p.nome AS professor, e.titulo_aula
-- FROM escalas e JOIN turmas t ON t.id = e.turma_id LEFT JOIN professores p ON p.id = e.professor_id
-- WHERE e.data >= '2026-10-01' ORDER BY e.data, t.nome;

-- Correção: títulos das lições do Dynamo no 4º trimestre de 2026
-- Revista Juvenis CPAD — Tema: Espírito Santo: Deus Presente Em Nós
-- Só altera titulo_aula; professor, confirmação e lembretes ficam como estão.
UPDATE escalas e SET titulo_aula = x.titulo
FROM (VALUES
  ('2026-10-04'::date, 'A Natureza do Espírito Santo'),
  ('2026-10-11'::date, 'Os Nomes do Espírito Santo'),
  ('2026-10-18'::date, 'Os Símbolos do Espírito Santo'),
  ('2026-10-25'::date, 'O Espírito Santo no Antigo Testamento'),
  ('2026-11-01'::date, 'O Espírito Santo no Novo Testamento'),
  ('2026-11-08'::date, 'O Espírito Atuante em Cristo'),
  ('2026-11-15'::date, 'O Espírito Santo Atuando no Crente'),
  ('2026-11-22'::date, 'O Batismo no Espírito Santo'),
  ('2026-11-29'::date, 'Os Dons do Espírito Santo'),
  ('2026-12-06'::date, 'Conservando o Poder'),
  ('2026-12-13'::date, 'O Fruto do Espírito Santo'),
  ('2026-12-20'::date, 'Pecando Contra o Espírito Santo'),
  ('2026-12-27'::date, 'Busque o Batismo no Espírito Santo')
) AS x(data, titulo)
JOIN turmas t ON t.nome = 'Dynamo' AND t.congregacao_id = 'c84176df-27bf-4ef1-9b35-9f86ee79dda9'
WHERE e.turma_id = t.id AND e.data = x.data;

-- Conferência:
-- SELECT e.data, e.titulo_aula FROM escalas e JOIN turmas t ON t.id = e.turma_id
-- WHERE t.nome = 'Dynamo' AND e.data >= '2026-10-01' ORDER BY e.data;

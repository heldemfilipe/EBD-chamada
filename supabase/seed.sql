-- =============================================
-- EBD - Dados de Exemplo (Seed)
-- =============================================

-- Limpar dados existentes (apenas para desenvolvimento)
TRUNCATE public.presencas CASCADE;
TRUNCATE public.chamadas CASCADE;
TRUNCATE public.escalas CASCADE;
TRUNCATE public.matriculas CASCADE;
TRUNCATE public.alunos CASCADE;
TRUNCATE public.professores CASCADE;
TRUNCATE public.turmas CASCADE;

-- =============================================
-- PROFESSORES
-- =============================================
INSERT INTO public.professores (id, nome, telefone, email, especialidade, ativo) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pastor João Silva', '(11) 98765-4321', 'joao.silva@ebd.com', 'Teologia', true),
('b1ffcd88-8b1a-4ff7-aa5c-5aa8ac270b22', 'Maria Santos', '(11) 98765-4322', 'maria.santos@ebd.com', 'Educação Infantil', true),
('c2ggde77-7a2b-4ee6-99ab-4998ab160c33', 'Pedro Oliveira', '(11) 98765-4323', 'pedro.oliveira@ebd.com', 'Adolescentes', true),
('d3hhef66-6b3c-4dd5-88ba-3887ba250d44', 'Ana Costa', '(11) 98765-4324', 'ana.costa@ebd.com', 'Jovens', true),
('e4iifg55-5c4d-4cc4-77c9-2776c9340e55', 'Carlos Pereira', '(11) 98765-4325', 'carlos.pereira@ebd.com', 'Adultos', true);

-- =============================================
-- TURMAS
-- =============================================
INSERT INTO public.turmas (id, nome, descricao, faixa_etaria, sala, horario, ativa) VALUES
('10000000-0000-0000-0000-000000000001', 'Berçário', 'Crianças de 0 a 2 anos', '0-2 anos', 'Sala 1', '09:00', true),
('10000000-0000-0000-0000-000000000002', 'Maternal', 'Crianças de 3 a 5 anos', '3-5 anos', 'Sala 2', '09:00', true),
('10000000-0000-0000-0000-000000000003', 'Primários', 'Crianças de 6 a 8 anos', '6-8 anos', 'Sala 3', '09:00', true),
('10000000-0000-0000-0000-000000000004', 'Juniores', 'Crianças de 9 a 11 anos', '9-11 anos', 'Sala 4', '09:00', true),
('10000000-0000-0000-0000-000000000005', 'Adolescentes', 'Adolescentes de 12 a 17 anos', '12-17 anos', 'Sala 5', '09:00', true),
('10000000-0000-0000-0000-000000000006', 'Jovens', 'Jovens de 18 a 35 anos', '18-35 anos', 'Sala 6', '09:00', true),
('10000000-0000-0000-0000-000000000007', 'Adultos', 'Adultos acima de 35 anos', '35+ anos', 'Sala 7', '09:00', true);

-- =============================================
-- ALUNOS
-- =============================================
INSERT INTO public.alunos (id, nome, data_nascimento, responsavel, telefone, email, ativo) VALUES
-- Berçário
('20000000-0000-0000-0000-000000000001', 'Lucas Mendes', '2024-03-15', 'Rafael Mendes', '(11) 91111-1111', NULL, true),
('20000000-0000-0000-0000-000000000002', 'Sofia Alves', '2024-06-20', 'Juliana Alves', '(11) 91111-1112', NULL, true),

-- Maternal
('20000000-0000-0000-0000-000000000003', 'Gabriel Lima', '2021-08-10', 'Fernando Lima', '(11) 91111-1113', NULL, true),
('20000000-0000-0000-0000-000000000004', 'Isabella Rocha', '2022-02-05', 'Patrícia Rocha', '(11) 91111-1114', NULL, true),
('20000000-0000-0000-0000-000000000005', 'Miguel Cardoso', '2021-11-30', 'André Cardoso', '(11) 91111-1115', NULL, true),

-- Primários
('20000000-0000-0000-0000-000000000006', 'Laura Fernandes', '2018-04-12', 'Marcos Fernandes', '(11) 91111-1116', NULL, true),
('20000000-0000-0000-0000-000000000007', 'Davi Souza', '2018-09-25', 'Cristina Souza', '(11) 91111-1117', NULL, true),
('20000000-0000-0000-0000-000000000008', 'Helena Martins', '2019-01-18', 'Roberto Martins', '(11) 91111-1118', NULL, true),

-- Juniores
('20000000-0000-0000-0000-000000000009', 'Arthur Nascimento', '2015-07-22', 'Renata Nascimento', '(11) 91111-1119', NULL, true),
('20000000-0000-0000-0000-000000000010', 'Manuela Ribeiro', '2016-03-08', 'Paulo Ribeiro', '(11) 91111-1120', NULL, true),
('20000000-0000-0000-0000-000000000011', 'Pedro Barbosa', '2015-12-14', 'Sandra Barbosa', '(11) 91111-1121', NULL, true),

-- Adolescentes
('20000000-0000-0000-0000-000000000012', 'Sophia Gomes', '2011-05-30', 'Eduardo Gomes', '(11) 91111-1122', NULL, true),
('20000000-0000-0000-0000-000000000013', 'Enzo Dias', '2012-10-16', 'Aline Dias', '(11) 91111-1123', NULL, true),
('20000000-0000-0000-0000-000000000014', 'Valentina Castro', '2011-08-27', 'Fabio Castro', '(11) 91111-1124', NULL, true),

-- Jovens
('20000000-0000-0000-0000-000000000015', 'Matheus Azevedo', '2003-02-14', NULL, '(11) 91111-1125', 'matheus.azevedo@email.com', true),
('20000000-0000-0000-0000-000000000016', 'Gabriela Ramos', '2005-11-03', NULL, '(11) 91111-1126', 'gabriela.ramos@email.com', true),
('20000000-0000-0000-0000-000000000017', 'Felipe Moreira', '2004-06-19', NULL, '(11) 91111-1127', 'felipe.moreira@email.com', true),

-- Adultos
('20000000-0000-0000-0000-000000000018', 'Rodrigo Nunes', '1985-04-22', NULL, '(11) 91111-1128', 'rodrigo.nunes@email.com', true),
('20000000-0000-0000-0000-000000000019', 'Fernanda Correia', '1990-09-15', NULL, '(11) 91111-1129', 'fernanda.correia@email.com', true),
('20000000-0000-0000-0000-000000000020', 'Bruno Tavares', '1982-12-08', NULL, '(11) 91111-1130', 'bruno.tavares@email.com', true);

-- =============================================
-- MATRICULAS
-- =============================================
INSERT INTO public.matriculas (aluno_id, turma_id, data_matricula, ativa) VALUES
-- Berçário
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2025-01-05', true),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2025-01-05', true),

-- Maternal
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '2025-01-05', true),
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '2025-01-05', true),
('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '2025-01-05', true),

-- Primários
('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '2025-01-05', true),
('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '2025-01-05', true),
('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', '2025-01-05', true),

-- Juniores
('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004', '2025-01-05', true),
('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000004', '2025-01-05', true),
('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000004', '2025-01-05', true),

-- Adolescentes
('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000005', '2025-01-05', true),
('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000005', '2025-01-05', true),
('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005', '2025-01-05', true),

-- Jovens
('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000006', '2025-01-05', true),
('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000006', '2025-01-05', true),
('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000006', '2025-01-05', true),

-- Adultos
('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000007', '2025-01-05', true),
('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000007', '2025-01-05', true),
('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000007', '2025-01-05', true);

-- =============================================
-- ESCALAS (1º Trimestre 2026)
-- =============================================
INSERT INTO public.escalas (turma_id, professor_id, data, confirmado) VALUES
-- Janeiro 2026
('10000000-0000-0000-0000-000000000001', 'b1ffcd88-8b1a-4ff7-aa5c-5aa8ac270b22', '2026-01-04', true),
('10000000-0000-0000-0000-000000000002', 'b1ffcd88-8b1a-4ff7-aa5c-5aa8ac270b22', '2026-01-11', true),
('10000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2026-01-04', true),
('10000000-0000-0000-0000-000000000004', 'c2ggde77-7a2b-4ee6-99ab-4998ab160c33', '2026-01-04', true),
('10000000-0000-0000-0000-000000000005', 'c2ggde77-7a2b-4ee6-99ab-4998ab160c33', '2026-01-11', true),
('10000000-0000-0000-0000-000000000006', 'd3hhef66-6b3c-4dd5-88ba-3887ba250d44', '2026-01-04', true),
('10000000-0000-0000-0000-000000000007', 'e4iifg55-5c4d-4cc4-77c9-2776c9340e55', '2026-01-04', true),

-- Fevereiro 2026
('10000000-0000-0000-0000-000000000001', 'b1ffcd88-8b1a-4ff7-aa5c-5aa8ac270b22', '2026-02-01', true),
('10000000-0000-0000-0000-000000000002', 'b1ffcd88-8b1a-4ff7-aa5c-5aa8ac270b22', '2026-02-08', false),
('10000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2026-02-01', true),
('10000000-0000-0000-0000-000000000004', 'c2ggde77-7a2b-4ee6-99ab-4998ab160c33', '2026-02-01', true),
('10000000-0000-0000-0000-000000000005', 'c2ggde77-7a2b-4ee6-99ab-4998ab160c33', '2026-02-08', false),
('10000000-0000-0000-0000-000000000006', 'd3hhef66-6b3c-4dd5-88ba-3887ba250d44', '2026-02-01', true),
('10000000-0000-0000-0000-000000000007', 'e4iifg55-5c4d-4cc4-77c9-2776c9340e55', '2026-02-01', true);

-- =============================================
-- CHAMADAS E PRESENÇAS (Exemplo)
-- =============================================

-- Chamada 1: Maternal - 2026-01-11
INSERT INTO public.chamadas (id, turma_id, professor_id, data) VALUES
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'b1ffcd88-8b1a-4ff7-aa5c-5aa8ac270b22', '2026-01-11');

INSERT INTO public.presencas (chamada_id, aluno_id, presente) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', true),
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', true),
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', false);

-- Chamada 2: Adolescentes - 2026-01-11
INSERT INTO public.chamadas (id, turma_id, professor_id, data) VALUES
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'c2ggde77-7a2b-4ee6-99ab-4998ab160c33', '2026-01-11');

INSERT INTO public.presencas (chamada_id, aluno_id, presente) VALUES
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000012', true),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000013', true),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000014', true);

-- =============================================
-- VERIFICAÇÃO
-- =============================================
SELECT 'Seed completo!' as status,
    (SELECT COUNT(*) FROM public.professores) as total_professores,
    (SELECT COUNT(*) FROM public.turmas) as total_turmas,
    (SELECT COUNT(*) FROM public.alunos) as total_alunos,
    (SELECT COUNT(*) FROM public.matriculas) as total_matriculas,
    (SELECT COUNT(*) FROM public.escalas) as total_escalas,
    (SELECT COUNT(*) FROM public.chamadas) as total_chamadas,
    (SELECT COUNT(*) FROM public.presencas) as total_presencas;

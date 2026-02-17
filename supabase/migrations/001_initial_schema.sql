-- =============================================
-- EBD - Sistema de Gestão
-- Schema Inicial
-- =============================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: alunos
-- =============================================
CREATE TABLE IF NOT EXISTS public.alunos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    data_nascimento DATE,
    responsavel TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    foto_url TEXT,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para alunos
CREATE INDEX idx_alunos_nome ON public.alunos(nome);
CREATE INDEX idx_alunos_ativo ON public.alunos(ativo);

-- =============================================
-- TABELA: professores
-- =============================================
CREATE TABLE IF NOT EXISTS public.professores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT UNIQUE,
    foto_url TEXT,
    especialidade TEXT,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para professores
CREATE INDEX idx_professores_nome ON public.professores(nome);
CREATE INDEX idx_professores_email ON public.professores(email);
CREATE INDEX idx_professores_ativo ON public.professores(ativo);

-- =============================================
-- TABELA: turmas
-- =============================================
CREATE TABLE IF NOT EXISTS public.turmas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    faixa_etaria TEXT,
    sala TEXT,
    horario TIME,
    ativa BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para turmas
CREATE INDEX idx_turmas_nome ON public.turmas(nome);
CREATE INDEX idx_turmas_ativa ON public.turmas(ativa);

-- =============================================
-- TABELA: matriculas
-- =============================================
CREATE TABLE IF NOT EXISTS public.matriculas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    data_matricula DATE DEFAULT CURRENT_DATE NOT NULL,
    ativa BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_aluno_turma_ativa UNIQUE(aluno_id, turma_id, ativa)
);

-- Índices para matriculas
CREATE INDEX idx_matriculas_aluno_id ON public.matriculas(aluno_id);
CREATE INDEX idx_matriculas_turma_id ON public.matriculas(turma_id);
CREATE INDEX idx_matriculas_ativa ON public.matriculas(ativa);

-- =============================================
-- TABELA: chamadas
-- =============================================
CREATE TABLE IF NOT EXISTS public.chamadas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    trimestre INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
    ano INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_turma_data UNIQUE(turma_id, data)
);

-- Índices para chamadas
CREATE INDEX idx_chamadas_turma_id ON public.chamadas(turma_id);
CREATE INDEX idx_chamadas_professor_id ON public.chamadas(professor_id);
CREATE INDEX idx_chamadas_data ON public.chamadas(data);
CREATE INDEX idx_chamadas_trimestre_ano ON public.chamadas(trimestre, ano);

-- =============================================
-- TABELA: presencas
-- =============================================
CREATE TABLE IF NOT EXISTS public.presencas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chamada_id UUID NOT NULL REFERENCES public.chamadas(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
    presente BOOLEAN NOT NULL,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_chamada_aluno UNIQUE(chamada_id, aluno_id)
);

-- Índices para presencas
CREATE INDEX idx_presencas_chamada_id ON public.presencas(chamada_id);
CREATE INDEX idx_presencas_aluno_id ON public.presencas(aluno_id);
CREATE INDEX idx_presencas_presente ON public.presencas(presente);

-- =============================================
-- TABELA: escalas
-- =============================================
CREATE TABLE IF NOT EXISTS public.escalas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    trimestre INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
    ano INTEGER NOT NULL,
    confirmado BOOLEAN DEFAULT false NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_turma_data_escala UNIQUE(turma_id, data)
);

-- Índices para escalas
CREATE INDEX idx_escalas_turma_id ON public.escalas(turma_id);
CREATE INDEX idx_escalas_professor_id ON public.escalas(professor_id);
CREATE INDEX idx_escalas_data ON public.escalas(data);
CREATE INDEX idx_escalas_trimestre_ano ON public.escalas(trimestre, ano);

-- =============================================
-- TABELA: usuarios (extensão do auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'visualizador' CHECK (role IN ('admin', 'professor', 'visualizador')),
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_email ON public.usuarios(email);
CREATE INDEX idx_usuarios_role ON public.usuarios(role);

-- =============================================
-- FUNÇÕES: Atualizar updated_at automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_alunos_updated_at BEFORE UPDATE ON public.alunos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professores_updated_at BEFORE UPDATE ON public.professores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON public.turmas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matriculas_updated_at BEFORE UPDATE ON public.matriculas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chamadas_updated_at BEFORE UPDATE ON public.chamadas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presencas_updated_at BEFORE UPDATE ON public.presencas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalas_updated_at BEFORE UPDATE ON public.escalas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNÇÕES: Calcular trimestre automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION calcular_trimestre(data_param DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE
        WHEN EXTRACT(MONTH FROM data_param) BETWEEN 1 AND 3 THEN 1
        WHEN EXTRACT(MONTH FROM data_param) BETWEEN 4 AND 6 THEN 2
        WHEN EXTRACT(MONTH FROM data_param) BETWEEN 7 AND 9 THEN 3
        ELSE 4
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger para preencher trimestre/ano automaticamente em chamadas
CREATE OR REPLACE FUNCTION set_chamada_trimestre_ano()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trimestre = calcular_trimestre(NEW.data);
    NEW.ano = EXTRACT(YEAR FROM NEW.data);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_chamada_trimestre_ano
BEFORE INSERT OR UPDATE ON public.chamadas
FOR EACH ROW EXECUTE FUNCTION set_chamada_trimestre_ano();

-- Trigger para preencher trimestre/ano automaticamente em escalas
CREATE OR REPLACE FUNCTION set_escala_trimestre_ano()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trimestre = calcular_trimestre(NEW.data);
    NEW.ano = EXTRACT(YEAR FROM NEW.data);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_escala_trimestre_ano
BEFORE INSERT OR UPDATE ON public.escalas
FOR EACH ROW EXECUTE FUNCTION set_escala_trimestre_ano();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas para ALUNOS
CREATE POLICY "Admins podem tudo em alunos" ON public.alunos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Professores podem visualizar alunos" ON public.alunos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role IN ('professor', 'visualizador')
        )
    );

-- Políticas para PROFESSORES
CREATE POLICY "Admins podem tudo em professores" ON public.professores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Usuários podem visualizar professores" ON public.professores
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas para TURMAS
CREATE POLICY "Admins podem tudo em turmas" ON public.turmas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Usuários podem visualizar turmas" ON public.turmas
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas para MATRICULAS
CREATE POLICY "Admins podem tudo em matriculas" ON public.matriculas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Usuários podem visualizar matriculas" ON public.matriculas
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas para CHAMADAS
CREATE POLICY "Admins podem tudo em chamadas" ON public.chamadas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Professores podem visualizar e criar suas chamadas" ON public.chamadas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'professor'
        )
    );

CREATE POLICY "Visualizadores podem ver chamadas" ON public.chamadas
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas para PRESENCAS
CREATE POLICY "Admins podem tudo em presencas" ON public.presencas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Professores podem gerenciar presencas" ON public.presencas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'professor'
        )
    );

CREATE POLICY "Visualizadores podem ver presencas" ON public.presencas
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas para ESCALAS
CREATE POLICY "Admins podem tudo em escalas" ON public.escalas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Usuários podem visualizar escalas" ON public.escalas
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas para USUARIOS
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.usuarios
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins podem tudo em usuarios" ON public.usuarios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

-- =============================================
-- VIEWS: Relatórios e consultas úteis
-- =============================================

-- View: Alunos por turma
CREATE OR REPLACE VIEW vw_alunos_por_turma AS
SELECT
    t.id AS turma_id,
    t.nome AS turma_nome,
    a.id AS aluno_id,
    a.nome AS aluno_nome,
    a.data_nascimento,
    a.responsavel,
    a.telefone,
    m.data_matricula,
    m.ativa
FROM public.turmas t
JOIN public.matriculas m ON t.id = m.turma_id
JOIN public.alunos a ON m.aluno_id = a.id
WHERE m.ativa = true AND a.ativo = true;

-- View: Frequência de alunos
CREATE OR REPLACE VIEW vw_frequencia_alunos AS
SELECT
    a.id AS aluno_id,
    a.nome AS aluno_nome,
    t.id AS turma_id,
    t.nome AS turma_nome,
    COUNT(DISTINCT c.id) AS total_aulas,
    COUNT(DISTINCT CASE WHEN p.presente = true THEN p.id END) AS presencas,
    COUNT(DISTINCT CASE WHEN p.presente = false THEN p.id END) AS faltas,
    ROUND(
        (COUNT(DISTINCT CASE WHEN p.presente = true THEN p.id END)::DECIMAL /
        NULLIF(COUNT(DISTINCT c.id), 0)) * 100,
        2
    ) AS percentual_presenca
FROM public.alunos a
JOIN public.matriculas m ON a.id = m.aluno_id
JOIN public.turmas t ON m.turma_id = t.id
LEFT JOIN public.chamadas c ON t.id = c.turma_id
LEFT JOIN public.presencas p ON c.id = p.chamada_id AND a.id = p.aluno_id
WHERE m.ativa = true AND a.ativo = true
GROUP BY a.id, a.nome, t.id, t.nome;

-- View: Escalas com detalhes
CREATE OR REPLACE VIEW vw_escalas_detalhadas AS
SELECT
    e.id,
    e.data,
    e.trimestre,
    e.ano,
    e.confirmado,
    e.observacoes,
    t.id AS turma_id,
    t.nome AS turma_nome,
    t.sala,
    p.id AS professor_id,
    p.nome AS professor_nome,
    p.telefone AS professor_telefone,
    p.email AS professor_email
FROM public.escalas e
JOIN public.turmas t ON e.turma_id = t.id
JOIN public.professores p ON e.professor_id = p.id
WHERE t.ativa = true AND p.ativo = true
ORDER BY e.data DESC;

-- =============================================
-- COMENTÁRIOS
-- =============================================
COMMENT ON TABLE public.alunos IS 'Cadastro de alunos da EBD';
COMMENT ON TABLE public.professores IS 'Cadastro de professores da EBD';
COMMENT ON TABLE public.turmas IS 'Turmas/Classes da EBD';
COMMENT ON TABLE public.matriculas IS 'Matrículas de alunos nas turmas';
COMMENT ON TABLE public.chamadas IS 'Registro de chamadas realizadas';
COMMENT ON TABLE public.presencas IS 'Registro de presenças individuais';
COMMENT ON TABLE public.escalas IS 'Escala de professores por turma e data';
COMMENT ON TABLE public.usuarios IS 'Perfis de usuários do sistema';

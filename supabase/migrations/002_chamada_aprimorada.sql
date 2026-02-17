-- =============================================
-- EBD - Sistema de Gestão
-- Migration: Chamada Aprimorada
-- Adiciona funcionalidades de visitantes, bíblias, revistas e ofertas
-- =============================================

-- =============================================
-- ADICIONAR CAMPOS À TABELA chamadas
-- =============================================
ALTER TABLE public.chamadas
ADD COLUMN IF NOT EXISTS oferta DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS anotacoes TEXT;

COMMENT ON COLUMN public.chamadas.oferta IS 'Valor da oferta coletada na aula';
COMMENT ON COLUMN public.chamadas.anotacoes IS 'Observações gerais sobre a aula';

-- =============================================
-- ADICIONAR CAMPOS À TABELA presencas
-- =============================================
ALTER TABLE public.presencas
ADD COLUMN IF NOT EXISTS trouxe_biblia BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS trouxe_revista BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS justificativa TEXT;

COMMENT ON COLUMN public.presencas.trouxe_biblia IS 'Indica se o aluno trouxe a bíblia';
COMMENT ON COLUMN public.presencas.trouxe_revista IS 'Indica se o aluno trouxe a revista';
COMMENT ON COLUMN public.presencas.justificativa IS 'Justificativa para ausência';

-- =============================================
-- TABELA: visitantes
-- =============================================
CREATE TABLE IF NOT EXISTS public.visitantes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT,
    observacao TEXT,
    convertido_em_aluno BOOLEAN DEFAULT false NOT NULL,
    aluno_id UUID REFERENCES public.alunos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para visitantes
CREATE INDEX idx_visitantes_nome ON public.visitantes(nome);
CREATE INDEX idx_visitantes_telefone ON public.visitantes(telefone);
CREATE INDEX idx_visitantes_convertido ON public.visitantes(convertido_em_aluno);
CREATE INDEX idx_visitantes_aluno_id ON public.visitantes(aluno_id);

COMMENT ON TABLE public.visitantes IS 'Cadastro de visitantes da EBD';
COMMENT ON COLUMN public.visitantes.convertido_em_aluno IS 'Indica se o visitante foi convertido em aluno';
COMMENT ON COLUMN public.visitantes.aluno_id IS 'Referência ao aluno criado após conversão';

-- =============================================
-- TABELA: historico_visitantes
-- =============================================
CREATE TABLE IF NOT EXISTS public.historico_visitantes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    visitante_id UUID NOT NULL REFERENCES public.visitantes(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    chamada_id UUID REFERENCES public.chamadas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    presente BOOLEAN NOT NULL,
    trouxe_biblia BOOLEAN DEFAULT false NOT NULL,
    trouxe_revista BOOLEAN DEFAULT false NOT NULL,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_visitante_chamada UNIQUE(visitante_id, chamada_id)
);

-- Índices para historico_visitantes
CREATE INDEX idx_historico_visitantes_visitante_id ON public.historico_visitantes(visitante_id);
CREATE INDEX idx_historico_visitantes_turma_id ON public.historico_visitantes(turma_id);
CREATE INDEX idx_historico_visitantes_chamada_id ON public.historico_visitantes(chamada_id);
CREATE INDEX idx_historico_visitantes_data ON public.historico_visitantes(data);
CREATE INDEX idx_historico_visitantes_presente ON public.historico_visitantes(presente);

COMMENT ON TABLE public.historico_visitantes IS 'Histórico de presenças de visitantes';

-- =============================================
-- Triggers para atualizar updated_at
-- =============================================
CREATE TRIGGER update_visitantes_updated_at BEFORE UPDATE ON public.visitantes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historico_visitantes_updated_at BEFORE UPDATE ON public.historico_visitantes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNÇÃO: Calcular presenças consecutivas de visitante
-- =============================================
CREATE OR REPLACE FUNCTION calcular_presencas_seguidas_visitante(
    p_visitante_id UUID,
    p_turma_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_presencas_seguidas INTEGER := 0;
    v_historico RECORD;
BEGIN
    -- Buscar os últimos 3 registros em ordem decrescente de data
    FOR v_historico IN (
        SELECT presente
        FROM public.historico_visitantes
        WHERE visitante_id = p_visitante_id
          AND turma_id = p_turma_id
        ORDER BY data DESC
        LIMIT 3
    ) LOOP
        -- Se encontrar uma ausência ou registro null, parar
        IF v_historico.presente = false OR v_historico.presente IS NULL THEN
            EXIT;
        END IF;

        -- Incrementar contador de presenças seguidas
        IF v_historico.presente = true THEN
            v_presencas_seguidas := v_presencas_seguidas + 1;
        END IF;
    END LOOP;

    RETURN v_presencas_seguidas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_presencas_seguidas_visitante IS 'Calcula quantas presenças consecutivas um visitante tem (máximo 3)';

-- =============================================
-- FUNÇÃO: Converter visitante em aluno
-- =============================================
CREATE OR REPLACE FUNCTION converter_visitante_em_aluno(
    p_visitante_id UUID,
    p_turma_id UUID
) RETURNS UUID AS $$
DECLARE
    v_visitante RECORD;
    v_aluno_id UUID;
BEGIN
    -- Buscar dados do visitante
    SELECT * INTO v_visitante
    FROM public.visitantes
    WHERE id = p_visitante_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Visitante não encontrado';
    END IF;

    IF v_visitante.convertido_em_aluno THEN
        RAISE EXCEPTION 'Visitante já foi convertido em aluno';
    END IF;

    -- Criar aluno
    INSERT INTO public.alunos (
        nome,
        telefone,
        email,
        ativo
    ) VALUES (
        v_visitante.nome,
        v_visitante.telefone,
        v_visitante.email,
        true
    ) RETURNING id INTO v_aluno_id;

    -- Criar matrícula
    INSERT INTO public.matriculas (
        aluno_id,
        turma_id,
        ativa
    ) VALUES (
        v_aluno_id,
        p_turma_id,
        true
    );

    -- Atualizar visitante
    UPDATE public.visitantes
    SET convertido_em_aluno = true,
        aluno_id = v_aluno_id,
        updated_at = NOW()
    WHERE id = p_visitante_id;

    RETURN v_aluno_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION converter_visitante_em_aluno IS 'Converte um visitante em aluno e cria matrícula na turma';

-- =============================================
-- VIEW: Resumo de chamadas por data
-- =============================================
CREATE OR REPLACE VIEW vw_resumo_chamadas_dia AS
SELECT
    c.data,
    COUNT(DISTINCT c.turma_id) AS total_turmas,
    COUNT(DISTINCT p.aluno_id) AS total_presentes,
    COUNT(DISTINCT CASE WHEN p.presente = false THEN p.aluno_id END) AS total_faltas,
    COUNT(DISTINCT hv.visitante_id) AS total_visitantes,
    SUM(CASE WHEN p.trouxe_biblia THEN 1 ELSE 0 END) AS total_biblias_alunos,
    SUM(CASE WHEN hv.trouxe_biblia THEN 1 ELSE 0 END) AS total_biblias_visitantes,
    SUM(CASE WHEN p.trouxe_revista THEN 1 ELSE 0 END) AS total_revistas_alunos,
    SUM(CASE WHEN hv.trouxe_revista THEN 1 ELSE 0 END) AS total_revistas_visitantes,
    SUM(c.oferta) AS total_oferta
FROM public.chamadas c
LEFT JOIN public.presencas p ON c.id = p.chamada_id
LEFT JOIN public.historico_visitantes hv ON c.id = hv.chamada_id
GROUP BY c.data
ORDER BY c.data DESC;

COMMENT ON VIEW vw_resumo_chamadas_dia IS 'Resumo consolidado de todas as chamadas por dia';

-- =============================================
-- VIEW: Visitantes com histórico
-- =============================================
CREATE OR REPLACE VIEW vw_visitantes_com_historico AS
SELECT
    v.id,
    v.nome,
    v.telefone,
    v.email,
    v.observacao,
    v.convertido_em_aluno,
    v.aluno_id,
    COUNT(hv.id) FILTER (WHERE hv.presente = true) AS total_presencas,
    COUNT(hv.id) FILTER (WHERE hv.presente = false) AS total_faltas,
    MAX(hv.data) AS ultima_presenca,
    v.created_at
FROM public.visitantes v
LEFT JOIN public.historico_visitantes hv ON v.id = hv.visitante_id
GROUP BY v.id, v.nome, v.telefone, v.email, v.observacao, v.convertido_em_aluno, v.aluno_id, v.created_at;

COMMENT ON VIEW vw_visitantes_com_historico IS 'Lista de visitantes com estatísticas de presença';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_visitantes ENABLE ROW LEVEL SECURITY;

-- Políticas para VISITANTES
CREATE POLICY "Admins podem tudo em visitantes" ON public.visitantes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Professores podem gerenciar visitantes" ON public.visitantes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'professor'
        )
    );

CREATE POLICY "Visualizadores podem ver visitantes" ON public.visitantes
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas para HISTORICO_VISITANTES
CREATE POLICY "Admins podem tudo em historico_visitantes" ON public.historico_visitantes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Professores podem gerenciar historico_visitantes" ON public.historico_visitantes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.role = 'professor'
        )
    );

CREATE POLICY "Visualizadores podem ver historico_visitantes" ON public.historico_visitantes
    FOR SELECT USING (auth.uid() IS NOT NULL);

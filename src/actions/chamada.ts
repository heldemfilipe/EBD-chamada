"use server"

import sql from '@/lib/db'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TurmaResumo {
  id: string
  nome: string
  faixa_etaria: string
  sala: string
  cor: string
  total_alunos: number
}

interface ResumoDiaTurma {
  turma_id: string
  presentes: number
  faltas: number
  visitantes: number
  biblias: number
  revistas: number
  oferta: number
}

interface AlunoDb {
  id: string
  nome: string
  responsavel: string | null
  cargo: string | null
}

interface PresencaDb {
  aluno_id: string
  presente: boolean
  trouxe_biblia: boolean
  trouxe_revista: boolean
  justificativa: string | null
}

interface ChamadaDb {
  id: string
  oferta: number | null
  anotacoes: string | null
}

interface EscalaDb {
  professor_id: string
  turma_id: string
  turma_nome: string
}

interface VisitanteHistDb {
  visitante_id: string
  data: string
  presente: boolean
  trouxe_biblia: boolean
  trouxe_revista: boolean
  visitante_nome: string
  visitante_telefone: string | null
  visitante_observacao: string | null
}

// ─── Chamada — pagina principal ───────────────────────────────────────────────

export async function buscarTurmasComContagem(): Promise<TurmaResumo[]> {
  const rows = await sql`
    SELECT
      t.id,
      t.nome,
      t.faixa_etaria,
      t.sala,
      t.cor,
      COUNT(a.id)::int AS total_alunos
    FROM turmas t
    LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = true
    WHERE t.ativa = true
    GROUP BY t.id
    ORDER BY t.nome
  `
  return rows.map(r => ({
    id: r.id,
    nome: r.nome,
    faixa_etaria: r.faixa_etaria ?? '',
    sala: r.sala ?? '',
    cor: r.cor ?? 'bg-blue-500',
    total_alunos: r.total_alunos,
  }))
}

export async function buscarResumoDia(dataISO: string): Promise<{
  porTurma: Record<string, ResumoDiaTurma>
}> {
  // Chamadas + presenças em uma unica query
  const chamadas = await sql`
    SELECT
      c.turma_id,
      c.oferta,
      COUNT(p.aluno_id) FILTER (WHERE p.presente = true)::int AS presentes,
      COUNT(p.aluno_id) FILTER (WHERE p.presente = false)::int AS faltas,
      COUNT(p.aluno_id) FILTER (WHERE p.trouxe_biblia = true)::int AS biblias,
      COUNT(p.aluno_id) FILTER (WHERE p.trouxe_revista = true)::int AS revistas
    FROM chamadas c
    LEFT JOIN presencas p ON p.chamada_id = c.id
    WHERE c.data = ${dataISO}
    GROUP BY c.id, c.turma_id, c.oferta
  `

  // Visitantes presentes no dia
  const visitantes = await sql`
    SELECT
      turma_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE trouxe_biblia = true)::int AS biblias,
      COUNT(*) FILTER (WHERE trouxe_revista = true)::int AS revistas
    FROM historico_visitantes
    WHERE data = ${dataISO} AND presente = true
    GROUP BY turma_id
  `

  const porTurma: Record<string, ResumoDiaTurma> = {}

  for (const c of chamadas) {
    porTurma[c.turma_id] = {
      turma_id: c.turma_id,
      presentes: c.presentes,
      faltas: c.faltas,
      visitantes: 0,
      biblias: c.biblias,
      revistas: c.revistas,
      oferta: Number(c.oferta) || 0,
    }
  }

  for (const v of visitantes) {
    if (!porTurma[v.turma_id]) {
      porTurma[v.turma_id] = { turma_id: v.turma_id, presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0 }
    }
    porTurma[v.turma_id].visitantes = v.total
    porTurma[v.turma_id].biblias += v.biblias
    porTurma[v.turma_id].revistas += v.revistas
  }

  return { porTurma }
}

// ─── Chamada por turma — buscar dados iniciais ───────────────────────────────

export async function buscarDadosChamadaTurma(turmaId: string, dataISO: string, trimestreInicio: string, trimestreFim: string) {
  // 5 queries em paralelo via SQL direto — muito mais rapido que PostgREST
  const [turmaRows, alunosRows, escalaRows, chamadaRows, visitanteRows] = await Promise.all([
    sql`SELECT id, nome, sala FROM turmas WHERE id = ${turmaId} LIMIT 1`,

    sql`SELECT id, nome, responsavel, cargo
        FROM alunos
        WHERE turma_id = ${turmaId} AND ativo = true
        ORDER BY nome`,

    sql`SELECT e.professor_id, e.turma_id, t.nome AS turma_nome
        FROM escalas e
        LEFT JOIN turmas t ON t.id = e.turma_id
        WHERE e.data = ${dataISO}`,

    sql`SELECT c.id, c.oferta, c.anotacoes,
          json_agg(json_build_object(
            'aluno_id', p.aluno_id,
            'presente', p.presente,
            'trouxe_biblia', p.trouxe_biblia,
            'trouxe_revista', p.trouxe_revista,
            'justificativa', p.justificativa
          )) FILTER (WHERE p.aluno_id IS NOT NULL) AS presencas
        FROM chamadas c
        LEFT JOIN presencas p ON p.chamada_id = c.id
        WHERE c.turma_id = ${turmaId} AND c.data = ${dataISO}
        GROUP BY c.id`,

    sql`SELECT
          hv.visitante_id, hv.data, hv.presente, hv.trouxe_biblia, hv.trouxe_revista,
          v.nome AS visitante_nome, v.telefone AS visitante_telefone, v.observacao AS visitante_observacao
        FROM historico_visitantes hv
        JOIN visitantes v ON v.id = hv.visitante_id
        WHERE hv.turma_id = ${turmaId}
          AND hv.data >= ${trimestreInicio}
          AND hv.data <= ${trimestreFim}
        ORDER BY hv.data DESC`,
  ])

  const turma = turmaRows[0] ? {
    id: turmaRows[0].id,
    nome: turmaRows[0].nome,
    sala: turmaRows[0].sala ?? '',
  } : null

  const alunos: AlunoDb[] = alunosRows.map(r => ({
    id: r.id,
    nome: r.nome,
    responsavel: r.responsavel,
    cargo: r.cargo,
  }))

  const escala: EscalaDb[] = escalaRows.map(r => ({
    professor_id: r.professor_id,
    turma_id: r.turma_id,
    turma_nome: r.turma_nome ?? '',
  }))

  const chamada: (ChamadaDb & { presencas: PresencaDb[] }) | null = chamadaRows[0] ? {
    id: chamadaRows[0].id,
    oferta: chamadaRows[0].oferta,
    anotacoes: chamadaRows[0].anotacoes,
    presencas: (chamadaRows[0].presencas ?? []) as PresencaDb[],
  } : null

  const visitanteHist: VisitanteHistDb[] = visitanteRows.map(r => ({
    visitante_id: r.visitante_id,
    data: r.data,
    presente: r.presente,
    trouxe_biblia: r.trouxe_biblia,
    trouxe_revista: r.trouxe_revista,
    visitante_nome: r.visitante_nome,
    visitante_telefone: r.visitante_telefone,
    visitante_observacao: r.visitante_observacao,
  }))

  return { turma, alunos, escala, chamada, visitanteHist }
}

// ─── Salvar chamada ──────────────────────────────────────────────────────────

interface SalvarPresenca {
  aluno_id: string
  presente: boolean
  trouxe_biblia: boolean
  trouxe_revista: boolean
  justificativa: string | null
}

interface SalvarVisitante {
  id: string | null  // null = novo
  nome: string
  telefone: string | null
  observacao: string | null
  presente: boolean
  trouxe_biblia: boolean
  trouxe_revista: boolean
}

export async function salvarChamada(params: {
  turmaId: string
  data: string
  oferta: number
  anotacoes: string
  presencas: SalvarPresenca[]
  visitantes: SalvarVisitante[]
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { turmaId, data, oferta, anotacoes, presencas, visitantes } = params

    // 1. Upsert chamada (ano e trimestre são colunas geradas — não inserir)
    const [chamadaRow] = await sql`
      INSERT INTO chamadas (turma_id, data, oferta, anotacoes)
      VALUES (${turmaId}, ${data}, ${oferta}, ${anotacoes})
      ON CONFLICT (turma_id, data)
      DO UPDATE SET oferta = EXCLUDED.oferta, anotacoes = EXCLUDED.anotacoes
      RETURNING id
    `
    const chamadaId = chamadaRow.id

    // 2. Upsert presencas + limpar historico visitantes em paralelo
    const promises: Promise<any>[] = []

    if (presencas.length > 0) {
      promises.push(sql`
        INSERT INTO presencas (chamada_id, aluno_id, presente, trouxe_biblia, trouxe_revista, justificativa)
        SELECT * FROM unnest(
          ${sql.array(presencas.map(() => chamadaId))}::uuid[],
          ${sql.array(presencas.map(p => p.aluno_id))}::uuid[],
          ${sql.array(presencas.map(p => p.presente))}::boolean[],
          ${sql.array(presencas.map(p => p.trouxe_biblia))}::boolean[],
          ${sql.array(presencas.map(p => p.trouxe_revista))}::boolean[],
          ${sql.array(presencas.map(p => p.justificativa ?? ''))}::text[]
        )
        ON CONFLICT (chamada_id, aluno_id)
        DO UPDATE SET presente = EXCLUDED.presente,
          trouxe_biblia = EXCLUDED.trouxe_biblia,
          trouxe_revista = EXCLUDED.trouxe_revista,
          justificativa = EXCLUDED.justificativa
      `)
    }

    // Limpar historico do dia
    promises.push(sql`
      DELETE FROM historico_visitantes
      WHERE turma_id = ${turmaId} AND data = ${data}
    `)

    await Promise.all(promises)

    // 3. Visitantes
    if (visitantes.length > 0) {
      const novos = visitantes.filter(v => !v.id)
      const existentes = visitantes.filter(v => v.id)

      // Inserir novos visitantes
      const novosIds = new Map<number, string>()
      if (novos.length > 0) {
        const inserted = await sql`
          INSERT INTO visitantes (nome, telefone, observacao)
          SELECT * FROM unnest(
            ${sql.array(novos.map(v => v.nome))}::text[],
            ${sql.array(novos.map(v => v.telefone ?? ''))}::text[],
            ${sql.array(novos.map(v => v.observacao ?? ''))}::text[]
          )
          RETURNING id
        `
        novos.forEach((v, i) => { if (inserted[i]) novosIds.set(i, inserted[i].id) })
      }

      // Atualizar existentes
      for (const v of existentes) {
        await sql`
          UPDATE visitantes SET nome = ${v.nome}, telefone = ${v.telefone}, observacao = ${v.observacao}
          WHERE id = ${v.id!}
        `
      }

      // Inserir historico
      const histItems = visitantes.map((v, i) => {
        const realId = v.id || novosIds.get(novos.indexOf(v))
        if (!realId) return null
        return { visitante_id: realId, presente: v.presente, trouxe_biblia: v.trouxe_biblia, trouxe_revista: v.trouxe_revista }
      }).filter(Boolean) as { visitante_id: string; presente: boolean; trouxe_biblia: boolean; trouxe_revista: boolean }[]

      if (histItems.length > 0) {
        await sql`
          INSERT INTO historico_visitantes (visitante_id, turma_id, chamada_id, data, presente, trouxe_biblia, trouxe_revista)
          SELECT * FROM unnest(
            ${sql.array(histItems.map(h => h.visitante_id))}::uuid[],
            ${sql.array(histItems.map(() => turmaId))}::uuid[],
            ${sql.array(histItems.map(() => chamadaId))}::uuid[],
            ${sql.array(histItems.map(() => data))}::date[],
            ${sql.array(histItems.map(h => h.presente))}::boolean[],
            ${sql.array(histItems.map(h => h.trouxe_biblia))}::boolean[],
            ${sql.array(histItems.map(h => h.trouxe_revista))}::boolean[]
          )
        `
      }
    }

    return { success: true }
  } catch (e: any) {
    console.error('Erro ao salvar chamada:', e)
    return { success: false, error: e?.message ?? 'Erro desconhecido' }
  }
}

// ─── Converter visitante em aluno ────────────────────────────────────────────

export async function converterVisitanteEmAluno(visitanteId: string | null, nome: string, telefone: string | null, turmaId: string): Promise<{ success: boolean; alunoId?: string; error?: string }> {
  try {
    const [novoAluno] = await sql`
      INSERT INTO alunos (nome, telefone, turma_id, ativo)
      VALUES (${nome}, ${telefone}, ${turmaId}, true)
      RETURNING id
    `

    if (visitanteId) {
      await sql`
        UPDATE visitantes SET convertido_em_aluno = true, aluno_id = ${novoAluno.id}
        WHERE id = ${visitanteId}
      `
    }

    return { success: true, alunoId: novoAluno.id }
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Erro desconhecido' }
  }
}

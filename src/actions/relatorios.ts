"use server"

import sql from '@/lib/db'

export async function buscarTurmasDisponiveis() {
  const rows = await sql`SELECT id, nome FROM turmas WHERE ativa = true ORDER BY nome`
  return rows.map(r => ({ id: r.id, nome: r.nome }))
}

export async function buscarChamadasPorAno(ano: number, turmaFiltro?: string) {
  const rows = turmaFiltro
    ? await sql`
        SELECT c.id, c.data, c.turma_id, c.oferta,
          COUNT(p.aluno_id) FILTER (WHERE p.presente = true)::int AS presentes,
          COUNT(p.aluno_id) FILTER (WHERE p.presente = false)::int AS ausentes,
          COUNT(p.aluno_id) FILTER (WHERE p.trouxe_biblia = true)::int AS biblias,
          COUNT(p.aluno_id) FILTER (WHERE p.trouxe_revista = true)::int AS revistas,
          COUNT(DISTINCT hv.id)::int AS visitantes
        FROM chamadas c
        LEFT JOIN presencas p ON p.chamada_id = c.id
        LEFT JOIN historico_visitantes hv ON hv.chamada_id = c.id AND hv.presente = true
        WHERE c.ano = ${ano} AND c.turma_id = ${turmaFiltro}
        GROUP BY c.id ORDER BY c.data
      `
    : await sql`
        SELECT c.id, c.data, c.turma_id, c.oferta,
          COUNT(p.aluno_id) FILTER (WHERE p.presente = true)::int AS presentes,
          COUNT(p.aluno_id) FILTER (WHERE p.presente = false)::int AS ausentes,
          COUNT(p.aluno_id) FILTER (WHERE p.trouxe_biblia = true)::int AS biblias,
          COUNT(p.aluno_id) FILTER (WHERE p.trouxe_revista = true)::int AS revistas,
          COUNT(DISTINCT hv.id)::int AS visitantes
        FROM chamadas c
        LEFT JOIN presencas p ON p.chamada_id = c.id
        LEFT JOIN historico_visitantes hv ON hv.chamada_id = c.id AND hv.presente = true
        WHERE c.ano = ${ano}
        GROUP BY c.id ORDER BY c.data
      `

  return rows.map(r => ({
    id: r.id, data: r.data, turma_id: r.turma_id, oferta: Number(r.oferta) || 0,
    presentes: r.presentes, ausentes: r.ausentes, biblias: r.biblias,
    revistas: r.revistas, visitantes: r.visitantes,
  }))
}

export async function buscarDadosPorSala(ano: number) {
  const [turmas, alunosCount, chamadas] = await Promise.all([
    sql`SELECT id, nome, cor FROM turmas WHERE ativa = true`,
    sql`
      SELECT turma_id, COUNT(*)::int AS total
      FROM alunos WHERE ativo = true
      GROUP BY turma_id
    `,
    sql`
      SELECT c.id, c.data, c.turma_id, c.oferta,
        COUNT(p.aluno_id) FILTER (WHERE p.presente = true)::int AS presentes,
        COUNT(p.aluno_id) FILTER (WHERE p.presente = false)::int AS ausentes,
        COUNT(p.aluno_id) FILTER (WHERE p.trouxe_biblia = true)::int AS biblias,
        COUNT(p.aluno_id) FILTER (WHERE p.trouxe_revista = true)::int AS revistas,
        COUNT(DISTINCT hv.id)::int AS visitantes
      FROM chamadas c
      LEFT JOIN presencas p ON p.chamada_id = c.id
      LEFT JOIN historico_visitantes hv ON hv.chamada_id = c.id AND hv.presente = true
      WHERE c.ano = ${ano}
      GROUP BY c.id
    `,
  ])

  const countMap: Record<string, number> = {}
  for (const a of alunosCount) countMap[a.turma_id] = a.total

  return {
    turmas: turmas.map(t => ({ id: t.id, nome: t.nome, cor: t.cor, totalAlunos: countMap[t.id] ?? 0 })),
    chamadas: chamadas.map(c => ({
      id: c.id, data: c.data, turma_id: c.turma_id, oferta: Number(c.oferta) || 0,
      presentes: c.presentes, ausentes: c.ausentes, biblias: c.biblias,
      revistas: c.revistas, visitantes: c.visitantes,
    })),
  }
}

export async function buscarTopAlunos(ano: number, turmaFiltro?: string) {
  // Buscar chamadas do ano/turma
  const chamadas = turmaFiltro
    ? await sql`SELECT id FROM chamadas WHERE ano = ${ano} AND turma_id = ${turmaFiltro}`
    : await sql`SELECT id FROM chamadas WHERE ano = ${ano}`

  if (chamadas.length === 0) return { ranking: [] }

  const chamadaIds = chamadas.map(c => c.id)

  const presencas = await sql`
    SELECT aluno_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE presente = true)::int AS presentes
    FROM presencas WHERE chamada_id = ANY(${chamadaIds})
    GROUP BY aluno_id
  `

  const alunoIds = presencas.map(p => p.aluno_id)
  if (alunoIds.length === 0) return { ranking: [] }

  const alunosQuery = turmaFiltro
    ? await sql`SELECT a.id, a.nome, t.nome AS turma_nome FROM alunos a LEFT JOIN turmas t ON t.id = a.turma_id WHERE a.id = ANY(${alunoIds}) AND a.ativo = true AND a.turma_id = ${turmaFiltro}`
    : await sql`SELECT a.id, a.nome, t.nome AS turma_nome FROM alunos a LEFT JOIN turmas t ON t.id = a.turma_id WHERE a.id = ANY(${alunoIds}) AND a.ativo = true`

  const alunosMap = new Map(alunosQuery.map(a => [a.id, { nome: a.nome, turma_nome: a.turma_nome }]))

  const ranking = presencas
    .filter(p => alunosMap.has(p.aluno_id))
    .map(p => {
      const aluno = alunosMap.get(p.aluno_id)!
      return {
        aluno_id: p.aluno_id,
        nome: aluno.nome,
        turma_nome: aluno.turma_nome,
        total: p.total,
        presentes: p.presentes,
        pct: p.total > 0 ? Math.round((p.presentes / p.total) * 100) : 0,
      }
    })

  return { ranking }
}

export async function buscarDesempenhoProfessores(ano: number) {
  const professores = await sql`
    SELECT p.id, p.nome,
      json_agg(json_build_object('turma_id', pt.turma_id, 'turma_nome', t.nome)) FILTER (WHERE pt.turma_id IS NOT NULL) AS turmas
    FROM professores p
    LEFT JOIN professor_turmas pt ON pt.professor_id = p.id
    LEFT JOIN turmas t ON t.id = pt.turma_id
    WHERE p.ativo = true
    GROUP BY p.id
  `

  // Para cada professor, buscar contagem de aulas dadas (escalas) e presença como aluno
  const profIds = professores.map(p => p.id)
  const escalas = profIds.length > 0
    ? await sql`
        SELECT professor_id, COUNT(*)::int AS aulas
        FROM escalas WHERE professor_id = ANY(${profIds}) AND EXTRACT(YEAR FROM data) = ${ano}
        GROUP BY professor_id
      `
    : []

  const escalasMap: Record<string, number> = {}
  for (const e of escalas) escalasMap[e.professor_id] = e.aulas

  return professores.map(p => ({
    id: p.id, nome: p.nome,
    turmas: p.turmas ?? [],
    aulas: escalasMap[p.id] ?? 0,
  }))
}

export async function buscarVisitantesRelatorio(ano: number, turmaFiltro?: string) {
  const chamadas = turmaFiltro
    ? await sql`SELECT id, data FROM chamadas WHERE ano = ${ano} AND turma_id = ${turmaFiltro}`
    : await sql`SELECT id, data FROM chamadas WHERE ano = ${ano}`

  if (chamadas.length === 0) return { visitantes: [] }
  const chamadaIds = chamadas.map(c => c.id)

  const rows = await sql`
    SELECT hv.visitante_id, hv.data, hv.presente, hv.trouxe_biblia, hv.trouxe_revista,
      v.id AS v_id, v.nome, v.telefone, v.convertido_em_aluno
    FROM historico_visitantes hv
    JOIN visitantes v ON v.id = hv.visitante_id
    WHERE hv.chamada_id = ANY(${chamadaIds})
    ORDER BY hv.data DESC
  `

  return {
    visitantes: rows.map(r => ({
      visitante_id: r.visitante_id, data: r.data, presente: r.presente,
      trouxe_biblia: r.trouxe_biblia, trouxe_revista: r.trouxe_revista,
      nome: r.nome, telefone: r.telefone, convertido_em_aluno: r.convertido_em_aluno,
    })),
  }
}

export async function buscarAlunosPorTurma(turmaId: string, ano: number) {
  const [alunos, chamadas] = await Promise.all([
    sql`SELECT id, nome, cargo FROM alunos WHERE turma_id = ${turmaId} AND ativo = true ORDER BY nome`,
    sql`SELECT id, data FROM chamadas WHERE turma_id = ${turmaId} AND ano = ${ano}`,
  ])

  let presencasMap: Record<string, { total: number; presentes: number; biblias: number }> = {}
  if (chamadas.length > 0) {
    const chamadaIds = chamadas.map(c => c.id)
    const presencas = await sql`
      SELECT aluno_id,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE presente = true)::int AS presentes,
        COUNT(*) FILTER (WHERE trouxe_biblia = true)::int AS biblias
      FROM presencas WHERE chamada_id = ANY(${chamadaIds})
      GROUP BY aluno_id
    `
    for (const p of presencas) presencasMap[p.aluno_id] = { total: p.total, presentes: p.presentes, biblias: p.biblias }
  }

  return {
    alunos: alunos.map(a => ({ id: a.id, nome: a.nome, cargo: a.cargo })),
    totalChamadas: chamadas.length,
    presencasMap,
  }
}

export async function buscarRankingAlunos(chamadaIds: string[], turmaFiltro?: string) {
  if (chamadaIds.length === 0) return []

  const presencas = await sql`
    SELECT aluno_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE presente = true)::int AS presentes
    FROM presencas WHERE chamada_id = ANY(${chamadaIds})
    GROUP BY aluno_id
  `

  const alunoIds = presencas.map(p => p.aluno_id)
  if (alunoIds.length === 0) return []

  const alunos = turmaFiltro
    ? await sql`SELECT a.id, a.nome, t.nome AS turma_nome FROM alunos a LEFT JOIN turmas t ON t.id = a.turma_id WHERE a.id = ANY(${alunoIds}) AND a.ativo = true AND a.turma_id = ${turmaFiltro}`
    : await sql`SELECT a.id, a.nome, t.nome AS turma_nome FROM alunos a LEFT JOIN turmas t ON t.id = a.turma_id WHERE a.id = ANY(${alunoIds}) AND a.ativo = true`

  const alunosMap = new Map(alunos.map(a => [a.id, { nome: a.nome, turma_nome: a.turma_nome }]))

  return presencas
    .filter(p => alunosMap.has(p.aluno_id))
    .map(p => {
      const al = alunosMap.get(p.aluno_id)!
      return { nome: al.nome, turma_nome: al.turma_nome ?? 'Sem turma', total: p.total, presentes: p.presentes }
    })
}

export async function buscarProfessoresRelatorio(ano: number) {
  const [professores, profAlunos, chamadas] = await Promise.all([
    sql`
      SELECT p.id, p.nome,
        json_agg(json_build_object('turma_id', pt.turma_id, 'turma_nome', t.nome)) FILTER (WHERE pt.turma_id IS NOT NULL) AS turmas
      FROM professores p
      LEFT JOIN professor_turmas pt ON pt.professor_id = p.id
      LEFT JOIN turmas t ON t.id = pt.turma_id
      WHERE p.ativo = true
      GROUP BY p.id
    `,
    sql`SELECT id, responsavel, turma_id FROM alunos WHERE responsavel LIKE 'professor:%' AND ativo = true`,
    sql`SELECT id, data, turma_id FROM chamadas WHERE ano = ${ano}`,
  ])

  const chamadaIds = chamadas.map(c => c.id)
  const presencas = chamadaIds.length > 0
    ? await sql`SELECT chamada_id, aluno_id, presente, trouxe_biblia FROM presencas WHERE chamada_id = ANY(${chamadaIds})`
    : []

  return {
    professores: professores.map(p => ({ id: p.id, nome: p.nome, turmas: p.turmas ?? [] })),
    profAlunos: profAlunos.map(a => ({ id: a.id, responsavel: a.responsavel as string, turma_id: a.turma_id as string | null })),
    chamadas: chamadas.map(c => ({ id: c.id, data: c.data as string, turma_id: c.turma_id as string })),
    presencas: presencas.map(p => ({ chamada_id: p.chamada_id as string, aluno_id: p.aluno_id as string, presente: p.presente as boolean, trouxe_biblia: p.trouxe_biblia as boolean })),
  }
}

export async function buscarVisitantesPorChamadas(chamadaIds: string[]) {
  if (chamadaIds.length === 0) return []
  const rows = await sql`
    SELECT hv.visitante_id, hv.data, hv.presente, hv.trouxe_biblia, hv.trouxe_revista,
      v.id AS v_id, v.nome, v.telefone, v.convertido_em_aluno
    FROM historico_visitantes hv
    JOIN visitantes v ON v.id = hv.visitante_id
    WHERE hv.chamada_id = ANY(${chamadaIds})
    ORDER BY hv.data DESC
  `
  return rows.map(r => ({
    visitante_id: r.visitante_id as string, data: r.data as string, presente: r.presente as boolean,
    trouxe_biblia: r.trouxe_biblia as boolean, trouxe_revista: r.trouxe_revista as boolean,
    nome: r.nome as string, telefone: (r.telefone ?? '') as string, convertido_em_aluno: (r.convertido_em_aluno ?? false) as boolean,
  }))
}

export async function buscarAlunosTurmaDetalhado(turmaId: string, chamadaIds: string[]) {
  const alunos = await sql`SELECT id, nome, cargo FROM alunos WHERE turma_id = ${turmaId} AND ativo = true ORDER BY nome`

  const ppa: Record<string, { presentes: number; faltas: number; biblias: number; revistas: number }> = {}
  if (chamadaIds.length > 0) {
    const presencas = await sql`
      SELECT aluno_id, presente, trouxe_biblia, trouxe_revista
      FROM presencas WHERE chamada_id = ANY(${chamadaIds})
    `
    for (const p of presencas) {
      if (!ppa[p.aluno_id]) ppa[p.aluno_id] = { presentes: 0, faltas: 0, biblias: 0, revistas: 0 }
      if (p.presente) {
        ppa[p.aluno_id].presentes++
        if (p.trouxe_biblia) ppa[p.aluno_id].biblias++
        if (p.trouxe_revista) ppa[p.aluno_id].revistas++
      } else {
        ppa[p.aluno_id].faltas++
      }
    }
  }

  return {
    alunos: alunos.map(a => ({ id: a.id as string, nome: a.nome as string, cargo: (a.cargo ?? '') as string })),
    totalChamadas: chamadaIds.length,
    presencas: ppa,
  }
}

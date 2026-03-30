"use server"

import sql from '@/lib/db'

export async function buscarContadoresGerais() {
  const [alunos, professores] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total FROM alunos WHERE ativo = true`,
    sql`SELECT COUNT(*)::int AS total FROM professores WHERE ativo = true`,
  ])
  return { totalAlunos: alunos[0].total, totalProfessores: professores[0].total }
}

export async function buscarTurmasComProfessores() {
  const rows = await sql`
    SELECT
      t.id, t.nome, t.cor,
      json_agg(DISTINCT p.nome) FILTER (WHERE p.nome IS NOT NULL) AS professores,
      COUNT(DISTINCT a.id)::int AS total_alunos
    FROM turmas t
    LEFT JOIN professor_turmas pt ON pt.turma_id = t.id
    LEFT JOIN professores p ON p.id = pt.professor_id AND p.ativo = true
    LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = true
    WHERE t.ativa = true
    GROUP BY t.id
  `
  return rows.map(r => ({
    id: r.id, nome: r.nome, cor: r.cor ?? 'bg-blue-500',
    professores: r.professores ?? [],
    totalAlunos: r.total_alunos,
  }))
}

export async function buscarUltimasChamadas(limit: number) {
  const rows = await sql`
    SELECT c.id, c.data, c.created_at, t.nome AS turma_nome,
      COUNT(p.aluno_id) FILTER (WHERE p.presente = true)::int AS presentes,
      COUNT(p.aluno_id)::int AS total
    FROM chamadas c
    LEFT JOIN turmas t ON t.id = c.turma_id
    LEFT JOIN presencas p ON p.chamada_id = c.id
    GROUP BY c.id, t.nome
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `
  return rows.map(r => ({
    id: r.id, data: r.data, created_at: r.created_at,
    turma_nome: r.turma_nome, presentes: r.presentes, total: r.total,
  }))
}

export async function buscarUltimosVisitantes(limit: number) {
  const rows = await sql`
    SELECT hv.id, hv.data, hv.created_at, hv.presente,
      v.nome AS visitante_nome, t.nome AS turma_nome
    FROM historico_visitantes hv
    LEFT JOIN visitantes v ON v.id = hv.visitante_id
    LEFT JOIN turmas t ON t.id = hv.turma_id
    WHERE hv.presente = true
    ORDER BY hv.created_at DESC
    LIMIT ${limit}
  `
  return rows.map(r => ({
    id: r.id, data: r.data, created_at: r.created_at, presente: r.presente,
    visitante_nome: r.visitante_nome, turma_nome: r.turma_nome,
  }))
}

export async function buscarDadosPeriodo(ano: number) {
  const [chamadas, alunos, turmas] = await Promise.all([
    sql`
      SELECT c.id, c.data, c.turma_id,
        json_agg(json_build_object('aluno_id', p.aluno_id, 'presente', p.presente))
          FILTER (WHERE p.aluno_id IS NOT NULL) AS presencas
      FROM chamadas c
      LEFT JOIN presencas p ON p.chamada_id = c.id
      WHERE c.ano = ${ano}
      GROUP BY c.id
    `,
    sql`
      SELECT a.id, a.nome, a.turma_id, t.nome AS turma_nome, a.responsavel, a.cargo
      FROM alunos a
      LEFT JOIN turmas t ON t.id = a.turma_id
      WHERE a.ativo = true
    `,
    sql`SELECT id, nome, cor FROM turmas WHERE ativa = true`,
  ])

  return {
    chamadas: chamadas.map(c => ({
      id: c.id, data: c.data, turma_id: c.turma_id,
      presencas: c.presencas ?? [],
    })),
    alunos: alunos.map(a => ({
      id: a.id, nome: a.nome, turma_id: a.turma_id, turma_nome: a.turma_nome,
      responsavel: a.responsavel, cargo: a.cargo,
    })),
    turmas: turmas.map(t => ({ id: t.id, nome: t.nome, cor: t.cor ?? 'bg-blue-500' })),
  }
}

export async function buscarAniversariantes() {
  const rows = await sql`
    SELECT a.id, a.nome, a.data_nascimento, a.responsavel,
      t.nome AS turma_nome
    FROM alunos a
    LEFT JOIN turmas t ON t.id = a.turma_id
    WHERE a.ativo = true AND a.data_nascimento IS NOT NULL
  `
  return rows.map(r => ({
    id: r.id as string,
    nome: r.nome as string,
    data_nascimento: r.data_nascimento as string,
    turma_nome: (r.turma_nome ?? '') as string,
    isProfessor: typeof r.responsavel === 'string' && (r.responsavel as string).startsWith('professor:'),
  }))
}

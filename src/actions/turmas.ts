"use server"

import sql from '@/lib/db'

export async function buscarTurmasDetalhadas() {
  const [turmas, alunosCount, professores] = await Promise.all([
    sql`SELECT id, nome, descricao, faixa_etaria, idade_min, idade_max, sala, cor FROM turmas WHERE ativa = true ORDER BY nome`,
    sql`SELECT turma_id, COUNT(*)::int AS total FROM alunos WHERE ativo = true GROUP BY turma_id`,
    sql`
      SELECT p.id, p.nome, json_agg(pt.turma_id) FILTER (WHERE pt.turma_id IS NOT NULL) AS turma_ids
      FROM professores p
      LEFT JOIN professor_turmas pt ON pt.professor_id = p.id
      WHERE p.ativo = true
      GROUP BY p.id
    `,
  ])

  const countMap: Record<string, number> = {}
  for (const a of alunosCount) countMap[a.turma_id] = a.total

  return {
    turmas: turmas.map(t => ({
      id: t.id, nome: t.nome, descricao: t.descricao, faixa_etaria: t.faixa_etaria,
      idade_min: t.idade_min, idade_max: t.idade_max,
      sala: t.sala, cor: t.cor, totalAlunos: countMap[t.id] ?? 0,
    })),
    professores: professores.map(p => ({
      id: p.id, nome: p.nome, turma_ids: p.turma_ids ?? [],
    })),
  }
}

export async function salvarTurma(dados: {
  id?: string
  nome: string
  descricao?: string | null
  faixa_etaria?: string | null
  idade_min?: number | null
  idade_max?: number | null
  sala?: string | null
  cor?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (dados.id) {
      await sql`
        UPDATE turmas SET nome = ${dados.nome}, descricao = ${dados.descricao ?? null},
          faixa_etaria = ${dados.faixa_etaria ?? null},
          idade_min = ${dados.idade_min ?? null}, idade_max = ${dados.idade_max ?? null},
          sala = ${dados.sala ?? null}, cor = ${dados.cor ?? null}
        WHERE id = ${dados.id}
      `
      return { success: true, id: dados.id }
    } else {
      const [row] = await sql`
        INSERT INTO turmas (nome, descricao, faixa_etaria, idade_min, idade_max, sala, cor, ativa)
        VALUES (${dados.nome}, ${dados.descricao ?? null}, ${dados.faixa_etaria ?? null},
          ${dados.idade_min ?? null}, ${dados.idade_max ?? null},
          ${dados.sala ?? null}, ${dados.cor ?? null}, true)
        RETURNING id
      `
      return { success: true, id: row.id }
    }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function excluirTurma(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`DELETE FROM turmas WHERE id = ${id}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function buscarDetalhesTurma(turmaId: string, anoAtual: number) {
  const [alunos, chamadas] = await Promise.all([
    sql`SELECT id, nome, data_nascimento FROM alunos WHERE turma_id = ${turmaId} AND ativo = true ORDER BY nome`,
    sql`SELECT id, data FROM chamadas WHERE turma_id = ${turmaId} AND ano = ${anoAtual}`,
  ])

  let presencasMap: Record<string, { total: number; presentes: number }> = {}
  if (chamadas.length > 0) {
    const chamadaIds = chamadas.map(c => c.id)
    const presencas = await sql`
      SELECT aluno_id, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE presente = true)::int AS presentes
      FROM presencas WHERE chamada_id = ANY(${chamadaIds})
      GROUP BY aluno_id
    `
    for (const p of presencas) presencasMap[p.aluno_id] = { total: p.total, presentes: p.presentes }
  }

  return {
    alunos: alunos.map(a => ({ id: a.id, nome: a.nome, data_nascimento: a.data_nascimento })),
    totalChamadas: chamadas.length,
    presencasMap,
  }
}

export async function buscarAlunosSemTurma() {
  const rows = await sql`SELECT id, nome FROM alunos WHERE turma_id IS NULL AND ativo = true ORDER BY nome`
  return rows.map(r => ({ id: r.id, nome: r.nome }))
}

export async function matricularAluno(dados: {
  id?: string
  turma_id: string
  nome?: string
  data_nascimento?: string | null
  telefone?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (dados.id) {
      await sql`UPDATE alunos SET turma_id = ${dados.turma_id} WHERE id = ${dados.id}`
      return { success: true, id: dados.id }
    } else {
      const [row] = await sql`
        INSERT INTO alunos (nome, data_nascimento, telefone, turma_id, ativo)
        VALUES (${dados.nome!}, ${dados.data_nascimento ?? null}, ${dados.telefone ?? null}, ${dados.turma_id}, true)
        RETURNING id
      `
      return { success: true, id: row.id }
    }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

"use server"

import sql from '@/lib/db'

export async function buscarAlunosComTurmas(anoAtual: number) {
  const [turmas, alunos, chamadas] = await Promise.all([
    sql`SELECT id, nome, faixa_etaria, cor FROM turmas WHERE ativa = true ORDER BY nome`,
    sql`SELECT * FROM alunos ORDER BY nome`,
    sql`SELECT id, data FROM chamadas WHERE ano = ${anoAtual}`,
  ])

  let presencasMap: Record<string, { total: number; presentes: number }> = {}
  if (chamadas.length > 0) {
    const chamadaIds = chamadas.map(c => c.id)
    const presencas = await sql`
      SELECT aluno_id,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE presente = true)::int AS presentes
      FROM presencas
      WHERE chamada_id = ANY(${chamadaIds})
      GROUP BY aluno_id
    `
    for (const p of presencas) {
      presencasMap[p.aluno_id] = { total: p.total, presentes: p.presentes }
    }
  }

  return {
    turmas: turmas.map(t => ({ id: t.id, nome: t.nome, faixa_etaria: t.faixa_etaria, cor: t.cor })),
    alunos: alunos.map(a => ({ ...a })),
    presencasMap,
  }
}

export async function salvarAluno(dados: {
  id?: string
  nome: string
  data_nascimento?: string | null
  telefone?: string | null
  turma_id: string | null
  ativo: boolean
  responsavel?: string | null
  cargo?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (dados.id) {
      await sql`
        UPDATE alunos SET
          nome = ${dados.nome},
          data_nascimento = ${dados.data_nascimento ?? null},
          telefone = ${dados.telefone ?? null},
          turma_id = ${dados.turma_id},
          ativo = ${dados.ativo},
          cargo = ${dados.cargo ?? null}
        WHERE id = ${dados.id}
      `
      return { success: true, id: dados.id }
    } else {
      const [row] = await sql`
        INSERT INTO alunos (nome, data_nascimento, telefone, turma_id, ativo, responsavel, cargo)
        VALUES (${dados.nome}, ${dados.data_nascimento ?? null}, ${dados.telefone ?? null}, ${dados.turma_id}, ${dados.ativo}, ${dados.responsavel ?? null}, ${dados.cargo ?? null})
        RETURNING id
      `
      return { success: true, id: row.id }
    }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function excluirAluno(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`DELETE FROM alunos WHERE id = ${id}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function atualizarCargoAluno(responsavel: string, cargo: string | null) {
  await sql`UPDATE alunos SET cargo = ${cargo} WHERE responsavel = ${responsavel}`
}

"use server"

import sql from '@/lib/db'

export async function buscarDadosEscala() {
  const [escalas, professores, turmas, professorTurmas] = await Promise.all([
    sql`SELECT id, data, turma_id, professor_id, trimestre, observacoes FROM escalas ORDER BY data`,
    sql`SELECT id, nome FROM professores WHERE ativo = true ORDER BY nome`,
    sql`SELECT id, nome, cor FROM turmas WHERE ativa = true ORDER BY nome`,
    sql`SELECT professor_id, turma_id FROM professor_turmas`,
  ])

  return {
    escalas: escalas.map(e => ({
      id: e.id, data: e.data, turma_id: e.turma_id, professor_id: e.professor_id,
      trimestre: e.trimestre, observacoes: e.observacoes,
    })),
    professores: professores.map(p => ({ id: p.id, nome: p.nome })),
    turmas: turmas.map(t => ({ id: t.id, nome: t.nome, cor: t.cor })),
    professorTurmas: professorTurmas.map(pt => ({ professor_id: pt.professor_id, turma_id: pt.turma_id })),
  }
}

export async function salvarEscala(dados: {
  id?: string
  data: string
  turma_id: string
  professor_id: string
  observacoes?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (dados.id) {
      await sql`
        UPDATE escalas SET data = ${dados.data}, turma_id = ${dados.turma_id},
          professor_id = ${dados.professor_id}, observacoes = ${dados.observacoes ?? null}
        WHERE id = ${dados.id}
      `
      return { success: true, id: dados.id }
    } else {
      const [row] = await sql`
        INSERT INTO escalas (data, turma_id, professor_id, observacoes)
        VALUES (${dados.data}, ${dados.turma_id}, ${dados.professor_id}, ${dados.observacoes ?? null})
        RETURNING id
      `
      return { success: true, id: row.id }
    }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function excluirEscala(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`DELETE FROM escalas WHERE id = ${id}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

"use server"

import sql from '@/lib/db'

export async function buscarDadosEscala() {
  const escalas        = await sql`SELECT id, data, turma_id, professor_id, trimestre, observacoes, titulo_aula FROM escalas ORDER BY data`
  const professores    = await sql`SELECT id, nome FROM professores WHERE ativo = true ORDER BY nome`
  const turmas         = await sql`SELECT id, nome, cor, sala FROM turmas WHERE ativa = true ORDER BY nome`
  const professorTurmas = await sql`SELECT professor_id, turma_id FROM professor_turmas`

  return {
    escalas: escalas.map(e => ({
      id: e.id, data: e.data, turma_id: e.turma_id, professor_id: e.professor_id,
      trimestre: e.trimestre, observacoes: e.observacoes, titulo_aula: e.titulo_aula,
    })),
    professores: professores.map(p => ({ id: p.id, nome: p.nome })),
    turmas: turmas.map(t => ({ id: t.id, nome: t.nome, cor: t.cor, sala: t.sala ?? null })),
    professorTurmas: professorTurmas.map(pt => ({ professor_id: pt.professor_id, turma_id: pt.turma_id })),
  }
}

export async function salvarEscala(dados: {
  id?: string
  data: string
  turma_id: string
  professor_id: string
  observacoes?: string | null
  titulo_aula?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (dados.id) {
      await sql`
        UPDATE escalas SET data = ${dados.data}, turma_id = ${dados.turma_id},
          professor_id = ${dados.professor_id}, observacoes = ${dados.observacoes ?? null},
          titulo_aula = ${dados.titulo_aula ?? null}
        WHERE id = ${dados.id}
      `
      return { success: true, id: dados.id }
    } else {
      const [row] = await sql`
        INSERT INTO escalas (data, turma_id, professor_id, observacoes, titulo_aula)
        VALUES (${dados.data}, ${dados.turma_id}, ${dados.professor_id}, ${dados.observacoes ?? null}, ${dados.titulo_aula ?? null})
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

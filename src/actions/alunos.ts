"use server"

import sql from '@/lib/db'
import { exigirModulo, assertTurmasDaCongregacao, assertAlunosDaCongregacao } from '@/lib/sessao'

export async function buscarAlunosComTurmas(ano: number) {
  const { cid } = await exigirModulo('alunos')
  const [turmas, alunos, chamadas] = await Promise.all([
    sql`SELECT id, nome, faixa_etaria, cor, sala, idade_min, idade_max FROM turmas WHERE ativa = true AND congregacao_id = ${cid} ORDER BY nome`,
    sql`SELECT * FROM alunos WHERE congregacao_id = ${cid} ORDER BY nome`,
    sql`SELECT id, data, turma_id FROM chamadas WHERE ano = ${ano} AND congregacao_id = ${cid} ORDER BY data`,
  ])

  let presencasDetalhe: { alunoId: string; chamadaId: string; presente: boolean; biblia: boolean; revista: boolean }[] = []
  if (chamadas.length > 0) {
    const chamadaIds = chamadas.map(c => c.id)
    const presencas = await sql`
      SELECT aluno_id, chamada_id, presente, trouxe_biblia, trouxe_revista
      FROM presencas
      WHERE chamada_id = ANY(${chamadaIds})
    `
    presencasDetalhe = presencas.map(p => ({
      alunoId: String(p.aluno_id),
      chamadaId: String(p.chamada_id),
      presente: Boolean(p.presente),
      biblia: Boolean(p.trouxe_biblia),
      revista: Boolean(p.trouxe_revista),
    }))
  }

  return {
    turmas: turmas.map(t => ({
      id: t.id, nome: t.nome, faixa_etaria: t.faixa_etaria, cor: t.cor, sala: t.sala ?? null,
      idade_min: t.idade_min ?? null, idade_max: t.idade_max ?? null,
    })),
    alunos: alunos.map(a => ({ ...a })),
    chamadas: chamadas.map(c => ({ id: String(c.id), data: String(c.data), turmaId: c.turma_id ? String(c.turma_id) : null })),
    presencasDetalhe,
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
  email?: string | null
  cargo?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { cid } = await exigirModulo('alunos', 'editar')
    await assertTurmasDaCongregacao([dados.turma_id], cid)
    if (dados.id) {
      await sql`
        UPDATE alunos SET
          nome = ${dados.nome},
          data_nascimento = ${dados.data_nascimento ?? null},
          telefone = ${dados.telefone ?? null},
          turma_id = ${dados.turma_id},
          ativo = ${dados.ativo},
          email = ${dados.email?.trim() || null},
          -- o marcador 'professor:<id>' liga o aluno ao cadastro de professor e não pode ser sobrescrito
          responsavel = CASE WHEN responsavel LIKE 'professor:%' THEN responsavel ELSE ${dados.responsavel?.trim() || null} END,
          cargo = ${dados.cargo ?? null}
        WHERE id = ${dados.id} AND congregacao_id = ${cid}
      `
      return { success: true, id: dados.id }
    } else {
      const [row] = await sql`
        INSERT INTO alunos (nome, data_nascimento, telefone, email, turma_id, ativo, responsavel, cargo, congregacao_id)
        VALUES (${dados.nome}, ${dados.data_nascimento ?? null}, ${dados.telefone ?? null}, ${dados.email?.trim() || null}, ${dados.turma_id}, ${dados.ativo}, ${dados.responsavel ?? null}, ${dados.cargo ?? null}, ${cid})
        RETURNING id
      `
      return { success: true, id: row.id }
    }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

/** Ativa/desativa um aluno (soft delete) — preserva histórico de presença para relatórios */
export async function definirAtivoAluno(id: string, ativo: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const { cid } = await exigirModulo('alunos', 'editar')
    await assertAlunosDaCongregacao([id], cid)
    await sql`UPDATE alunos SET ativo = ${ativo} WHERE id = ${id} AND congregacao_id = ${cid}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function atualizarCargoAluno(responsavel: string, cargo: string | null) {
  const { cid } = await exigirModulo(['alunos', 'professores'], 'editar')
  await sql`UPDATE alunos SET cargo = ${cargo} WHERE responsavel = ${responsavel} AND congregacao_id = ${cid}`
}

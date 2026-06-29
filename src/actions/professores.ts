"use server"

import sql from '@/lib/db'

export async function buscarProfessoresComTurmas() {
  const [professores, turmas] = await Promise.all([
    sql`
      SELECT p.id, p.nome, p.especialidade, p.telefone, p.email, p.data_nascimento, p.data_ingresso, p.turma_aluno_id, p.cargo,
        json_agg(pt.turma_id) FILTER (WHERE pt.turma_id IS NOT NULL) AS turma_ids
      FROM professores p
      LEFT JOIN professor_turmas pt ON pt.professor_id = p.id
      WHERE p.ativo = true
      GROUP BY p.id
      ORDER BY p.nome
    `,
    sql`SELECT id, nome FROM turmas WHERE ativa = true ORDER BY nome`,
  ])

  return {
    professores: professores.map(p => ({
      id: p.id, nome: p.nome, especialidade: p.especialidade, telefone: p.telefone,
      email: p.email, data_nascimento: p.data_nascimento, data_ingresso: p.data_ingresso,
      turma_aluno_id: p.turma_aluno_id, cargo: p.cargo, turma_ids: p.turma_ids ?? [],
    })),
    turmas: turmas.map(t => ({ id: t.id, nome: t.nome })),
  }
}

export async function salvarProfessor(dados: {
  id?: string
  nome: string
  especialidade?: string | null
  telefone?: string | null
  email?: string | null
  turma_aluno_id?: string | null
  data_nascimento?: string | null
  cargo?: string | null
  turmas: string[]
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    let profId: string
    if (dados.id) {
      await sql`
        UPDATE professores SET
          nome = ${dados.nome},
          especialidade = ${dados.especialidade ?? null},
          telefone = ${dados.telefone ?? null},
          email = ${dados.email ?? null},
          turma_aluno_id = ${dados.turma_aluno_id ?? null},
          data_nascimento = ${dados.data_nascimento ?? null},
          cargo = ${dados.cargo ?? null}
        WHERE id = ${dados.id}
      `
      profId = dados.id
      // Recriar turmas
      await sql`DELETE FROM professor_turmas WHERE professor_id = ${profId}`
    } else {
      const [row] = await sql`
        INSERT INTO professores (nome, especialidade, telefone, email, turma_aluno_id, data_nascimento, cargo, data_ingresso, ativo)
        VALUES (${dados.nome}, ${dados.especialidade ?? null}, ${dados.telefone ?? null}, ${dados.email ?? null}, ${dados.turma_aluno_id ?? null}, ${dados.data_nascimento ?? null}, ${dados.cargo ?? null}, ${new Date().toISOString().split('T')[0]}, true)
        RETURNING id
      `
      profId = row.id
    }

    if (dados.turmas.length > 0) {
      await sql`
        INSERT INTO professor_turmas (professor_id, turma_id)
        SELECT * FROM unnest(
          ${sql.array(dados.turmas.map(() => profId))}::uuid[],
          ${sql.array(dados.turmas)}::uuid[]
        )
      `
    }

    return { success: true, id: profId }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function excluirProfessor(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`DELETE FROM alunos WHERE responsavel = ${'professor:' + id}`
    await sql`DELETE FROM professores WHERE id = ${id}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function sincronizarAlunoVinculado(profId: string, nome: string, turmaAluno: string | null, dataNascimento?: string | null) {
  const marcador = `professor:${profId}`
  const existente = await sql`SELECT id FROM alunos WHERE responsavel = ${marcador} LIMIT 1`

  if (turmaAluno) {
    if (existente.length > 0) {
      await sql`UPDATE alunos SET nome = ${nome}, turma_id = ${turmaAluno}, data_nascimento = ${dataNascimento ?? null}, ativo = true WHERE id = ${existente[0].id}`
    } else {
      await sql`INSERT INTO alunos (nome, turma_id, responsavel, data_nascimento, ativo) VALUES (${nome}, ${turmaAluno}, ${marcador}, ${dataNascimento ?? null}, true)`
    }
  } else if (existente.length > 0) {
    await sql`DELETE FROM alunos WHERE id = ${existente[0].id}`
  }
}

export async function promoverAlunoParaProfessor(alunoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const [aluno] = await sql`SELECT id, nome, telefone, email, data_nascimento, turma_id FROM alunos WHERE id = ${alunoId}`
    if (!aluno) return { success: false, error: 'Aluno não encontrado' }

    const hoje = new Date().toISOString().split('T')[0]
    const [prof] = await sql`
      INSERT INTO professores (nome, telefone, email, data_nascimento, turma_aluno_id, data_ingresso, ativo)
      VALUES (${aluno.nome}, ${aluno.telefone ?? null}, ${aluno.email ?? null}, ${aluno.data_nascimento ?? null}, ${aluno.turma_id ?? null}, ${hoje}, true)
      RETURNING id
    `
    await sql`UPDATE alunos SET responsavel = ${'professor:' + prof.id} WHERE id = ${alunoId}`

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function salvarCargoProfessor(profId: string, cargo: string | null) {
  await sql`UPDATE professores SET cargo = ${cargo} WHERE id = ${profId}`
  await sql`UPDATE alunos SET cargo = ${cargo} WHERE responsavel = ${'professor:' + profId}`
}

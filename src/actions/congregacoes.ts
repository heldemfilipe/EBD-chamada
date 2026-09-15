"use server"

import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { exigirAdminGeral, COOKIE_CONGREGACAO } from '@/lib/sessao'

// Gestão de congregações — exclusiva do administrador geral.

export interface CongregacaoDetalhe {
  id: string
  nome: string
  cidade: string | null
  observacoes: string | null
  ativa: boolean
  created_at: string
  total_turmas: number
  total_alunos: number
  total_professores: number
  total_usuarios: number
}

export async function listarCongregacoes(): Promise<CongregacaoDetalhe[]> {
  await exigirAdminGeral()
  const rows = await sql`
    SELECT c.id, c.nome, c.cidade, c.observacoes, c.ativa, c.created_at,
      (SELECT COUNT(*)::int FROM turmas      t WHERE t.congregacao_id = c.id AND t.ativa = true) AS total_turmas,
      (SELECT COUNT(*)::int FROM alunos      a WHERE a.congregacao_id = c.id AND a.ativo = true) AS total_alunos,
      (SELECT COUNT(*)::int FROM professores p WHERE p.congregacao_id = c.id AND p.ativo = true) AS total_professores,
      (SELECT COUNT(*)::int FROM perfis      u WHERE u.congregacao_id = c.id) AS total_usuarios
    FROM congregacoes c
    ORDER BY c.nome
  `
  return rows.map(r => ({
    id: r.id, nome: r.nome, cidade: r.cidade, observacoes: r.observacoes, ativa: r.ativa,
    created_at: r.created_at, total_turmas: r.total_turmas, total_alunos: r.total_alunos,
    total_professores: r.total_professores, total_usuarios: r.total_usuarios,
  }))
}

export async function salvarCongregacao(dados: {
  id?: string
  nome: string
  cidade?: string | null
  observacoes?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await exigirAdminGeral()
    const nome = dados.nome?.trim()
    if (!nome) return { success: false, error: 'Nome é obrigatório.' }

    const [duplicada] = await sql`
      SELECT id FROM congregacoes
      WHERE lower(nome) = lower(${nome}) ${dados.id ? sql`AND id <> ${dados.id}` : sql``}
    `
    if (duplicada) return { success: false, error: `Já existe uma congregação chamada "${nome}".` }

    if (dados.id) {
      await sql`
        UPDATE congregacoes SET nome = ${nome}, cidade = ${dados.cidade?.trim() || null},
          observacoes = ${dados.observacoes?.trim() || null}
        WHERE id = ${dados.id}
      `
      return { success: true, id: dados.id }
    }
    const [row] = await sql`
      INSERT INTO congregacoes (nome, cidade, observacoes)
      VALUES (${nome}, ${dados.cidade?.trim() || null}, ${dados.observacoes?.trim() || null})
      RETURNING id
    `
    return { success: true, id: row.id }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

/** Ativa/desativa. Congregação inativa bloqueia o login de todos os usuários dela. */
export async function definirAtivaCongregacao(id: string, ativa: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await exigirAdminGeral()
    await sql`UPDATE congregacoes SET ativa = ${ativa} WHERE id = ${id}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

/** Exclui apenas congregações sem nenhum dado vinculado. */
export async function excluirCongregacao(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await exigirAdminGeral()
    const [uso] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM turmas      WHERE congregacao_id = ${id}) AS turmas,
        (SELECT COUNT(*)::int FROM alunos      WHERE congregacao_id = ${id}) AS alunos,
        (SELECT COUNT(*)::int FROM professores WHERE congregacao_id = ${id}) AS professores,
        (SELECT COUNT(*)::int FROM visitantes  WHERE congregacao_id = ${id}) AS visitantes,
        (SELECT COUNT(*)::int FROM perfis      WHERE congregacao_id = ${id}) AS usuarios
    `
    const vinculos = Object.entries(uso).filter(([, n]) => Number(n) > 0).map(([k, n]) => `${n} ${k}`)
    if (vinculos.length > 0) {
      return {
        success: false,
        error: `Não é possível excluir: a congregação possui ${vinculos.join(', ')}. Desative-a em vez de excluir.`,
      }
    }
    await sql`DELETE FROM congregacoes WHERE id = ${id}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

/** Admin geral: define qual congregação está sendo visualizada/gerenciada. */
export async function selecionarCongregacao(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await exigirAdminGeral()
    const [c] = await sql`SELECT id FROM congregacoes WHERE id = ${id}`
    if (!c) return { success: false, error: 'Congregação não encontrada.' }
    cookies().set(COOKIE_CONGREGACAO, id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

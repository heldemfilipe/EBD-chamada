"use server"

import sql from '@/lib/db'
import { createServiceClient } from '@/lib/supabase'
import { exigirSessao, MODULOS } from '@/lib/sessao'

// "Minha Conta": o próprio usuário vê seus dados de acesso e altera o nome.
// Função, congregação, perfil e permissões continuam sob controle de quem
// gerencia usuários.

export interface MinhaConta {
  nome: string
  email: string
  role: 'admin' | 'usuario'
  adminGeral: boolean
  congregacaoNome: string | null
  perfilAcessoNome: string | null
  modulos: { modulo: string; nivel: 'ver' | 'editar' }[]
  turmas: string[] | null  // null = todas as turmas
  criadoEm: string | null
  senhaAlteradaEm: string | null
}

export async function buscarMinhaConta(): Promise<MinhaConta> {
  const s = await exigirSessao()

  const [[row], authRes] = await Promise.all([
    sql`
      SELECT p.nome, p.created_at, p.senha_alterada_em,
        c.nome AS congregacao_nome, pa.nome AS perfil_acesso_nome
      FROM perfis p
      LEFT JOIN congregacoes c ON c.id = p.congregacao_id
      LEFT JOIN perfis_acesso pa ON pa.id = p.perfil_acesso_id
      WHERE p.id = ${s.userId}
    `,
    (createServiceClient() as any).auth.admin.getUserById(s.userId),
  ])

  let turmas: string[] | null = null
  if (s.turmas !== '*') {
    turmas = s.turmas.length > 0
      ? (await sql`SELECT nome FROM turmas WHERE id = ANY(${s.turmas}::uuid[]) ORDER BY nome`).map(t => t.nome as string)
      : []
  }

  const modulos = s.role === 'admin'
    ? MODULOS.map(m => ({ modulo: m, nivel: 'editar' as const }))
    : MODULOS.filter(m => s.modulos[m]).map(m => ({ modulo: m, nivel: s.modulos[m]! }))

  return {
    nome: row?.nome ?? s.nome,
    email: authRes?.data?.user?.email ?? '',
    role: s.role,
    adminGeral: s.adminGeral,
    congregacaoNome: row?.congregacao_nome ?? null,
    perfilAcessoNome: row?.perfil_acesso_nome ?? null,
    modulos,
    turmas,
    criadoEm: row?.created_at ?? null,
    senhaAlteradaEm: row?.senha_alterada_em ?? null,
  }
}

export async function atualizarMeuNome(nome: string): Promise<{ success: boolean; error?: string }> {
  try {
    const s = await exigirSessao()
    const limpo = (nome ?? '').trim()
    if (!limpo) return { success: false, error: 'O nome não pode ficar em branco.' }
    if (limpo.length > 120) return { success: false, error: 'Nome muito longo.' }
    await sql`UPDATE perfis SET nome = ${limpo} WHERE id = ${s.userId}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

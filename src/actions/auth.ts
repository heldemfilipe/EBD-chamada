"use server"

import sql from '@/lib/db'
import { obterSessao, MODULOS } from '@/lib/sessao'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CongregacaoResumo {
  id: string
  nome: string
  ativa: boolean
}

export interface PerfilComPermissoes {
  id: string
  nome: string
  role: 'admin' | 'usuario'
  ativo: boolean
  adminGeral: boolean
  /** Congregação do usuário (null = admin geral) */
  congregacao: CongregacaoResumo | null
  /** Congregação cujos dados estão sendo exibidos */
  congregacaoAtiva: CongregacaoResumo | null
  /** Lista de congregações para troca — somente admin geral */
  congregacoes: CongregacaoResumo[]
  modulos: { modulo: string; nivel: string }[]
  turmas: string[]
  /** Deve definir nova senha antes de usar o sistema */
  deveTrocarSenha: boolean
}

// ─── Perfil do usuário logado (identificado pela sessão, nunca pelo cliente) ──

export async function buscarMeuPerfil(): Promise<PerfilComPermissoes | null> {
  const s = await obterSessao()
  if (!s) return null

  const congregacoes: CongregacaoResumo[] = s.adminGeral
    ? (await sql`SELECT id, nome, ativa FROM congregacoes ORDER BY nome`).map(c => ({ id: c.id, nome: c.nome, ativa: c.ativa }))
    : []

  const idsBuscar = Array.from(new Set([s.congregacaoId, s.cid].filter((x): x is string => !!x)))
  const congs = idsBuscar.length > 0
    ? await sql`SELECT id, nome, ativa FROM congregacoes WHERE id = ANY(${idsBuscar}::uuid[])`
    : []
  const porId = new Map(congs.map(c => [c.id as string, { id: c.id as string, nome: c.nome as string, ativa: c.ativa as boolean }]))

  const modulos = s.role === 'admin'
    ? MODULOS.map(m => ({ modulo: m, nivel: 'editar' }))
    : Object.entries(s.modulos).map(([modulo, nivel]) => ({ modulo, nivel: nivel as string }))

  return {
    id: s.userId,
    nome: s.nome,
    role: s.role,
    ativo: true,
    adminGeral: s.adminGeral,
    congregacao: s.congregacaoId ? porId.get(s.congregacaoId) ?? null : null,
    congregacaoAtiva: s.cid ? porId.get(s.cid) ?? null : null,
    congregacoes,
    modulos,
    turmas: s.turmas === '*' ? [] : s.turmas,
    deveTrocarSenha: s.deveTrocarSenha,
  }
}

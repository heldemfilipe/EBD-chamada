import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import sql from '@/lib/db'

// ─── Sessão server-side + escopo por congregação ─────────────────────────────
//
// Uso exclusivo no servidor (server actions e API routes). Toda leitura/escrita
// de dados deve passar por `exigirModulo()`, que devolve o `cid` (congregação
// ativa) a ser usado no WHERE das queries — é isso que isola uma congregação
// da outra.
//
// Hierarquia:
//   admin geral          → role 'admin' sem congregação; escolhe a congregação
//                          ativa (cookie) e enxerga/gerencia todas
//   admin da congregação → role 'admin' com congregação; tudo dentro dela
//   colaborador          → role 'usuario'; apenas módulos/turmas concedidos

export const MODULOS = ['dashboard', 'alunos', 'professores', 'turmas', 'chamada', 'escala', 'relatorios', 'usuarios'] as const
export type Modulo = typeof MODULOS[number]
export type Nivel = 'ver' | 'editar'

export const COOKIE_CONGREGACAO = 'ebd_congregacao'

export interface Sessao {
  userId: string
  nome: string
  role: 'admin' | 'usuario'
  adminGeral: boolean
  /** Congregação à qual o usuário pertence (null = admin geral) */
  congregacaoId: string | null
  /** Congregação cujos dados estão sendo acessados (para admin geral vem do cookie) */
  cid: string | null
  perfilAcessoId: string | null
  modulos: Partial<Record<Modulo, Nivel>>
  /** Turmas liberadas na chamada ('*' = todas) */
  turmas: string[] | '*'
  /** Precisa definir uma nova senha antes de usar o sistema */
  deveTrocarSenha: boolean
}

export class AcessoNegadoError extends Error {
  constructor(msg = 'Você não tem permissão para esta ação.') {
    super(msg)
    this.name = 'AcessoNegadoError'
  }
}

// ─── Autenticação ────────────────────────────────────────────────────────────

async function usuarioAutenticadoId(): Promise<string | null> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          // Em Server Components não é possível gravar cookies — ignorar
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  return data.claims.sub
}

/** Carrega a sessão do usuário logado (memoizado por requisição). */
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  const userId = await usuarioAutenticadoId()
  if (!userId) return null

  const [row] = await sql`
    SELECT
      p.id, p.nome, p.role, p.ativo, p.congregacao_id, p.perfil_acesso_id,
      COALESCE(p.deve_trocar_senha, false) AS deve_trocar_senha,
      c.ativa AS congregacao_ativa,
      COALESCE((
        SELECT json_agg(json_build_object('modulo', m.modulo, 'nivel', m.nivel))
        FROM (
          SELECT modulo, nivel FROM perfis_acesso_modulos
          WHERE p.perfil_acesso_id IS NOT NULL AND perfil_acesso_id = p.perfil_acesso_id
          UNION ALL
          SELECT modulo, nivel FROM permissoes_modulos
          WHERE p.perfil_acesso_id IS NULL AND perfil_id = p.id
        ) m
      ), '[]') AS modulos,
      COALESCE((
        SELECT array_agg(pt.turma_id)
        FROM permissoes_turmas pt
        JOIN turmas t ON t.id = pt.turma_id AND t.congregacao_id = p.congregacao_id
        WHERE pt.perfil_id = p.id
      ), '{}') AS turmas
    FROM perfis p
    LEFT JOIN congregacoes c ON c.id = p.congregacao_id
    WHERE p.id = ${userId}
  `
  if (!row || !row.ativo) return null
  // Congregação desativada bloqueia todos os usuários dela
  if (row.congregacao_id && row.congregacao_ativa === false) return null

  const adminGeral = row.role === 'admin' && !row.congregacao_id

  let cid: string | null = row.congregacao_id
  if (adminGeral) {
    const escolhida = cookies().get(COOKIE_CONGREGACAO)?.value
    const [c] = escolhida && /^[0-9a-f-]{36}$/i.test(escolhida)
      ? await sql`SELECT id FROM congregacoes WHERE id = ${escolhida}`
      : []
    if (c) {
      cid = c.id
    } else {
      const [primeira] = await sql`SELECT id FROM congregacoes ORDER BY ativa DESC, nome LIMIT 1`
      cid = primeira?.id ?? null
    }
  }

  const modulos: Partial<Record<Modulo, Nivel>> = {}
  for (const m of (row.modulos ?? []) as { modulo: Modulo; nivel: Nivel }[]) {
    // Se houver duplicidade, prevalece o nível mais alto
    if (modulos[m.modulo] !== 'editar') modulos[m.modulo] = m.nivel ?? 'editar'
  }

  return {
    userId: row.id,
    nome: row.nome,
    role: row.role,
    adminGeral,
    congregacaoId: row.congregacao_id,
    cid,
    perfilAcessoId: row.perfil_acesso_id,
    modulos,
    turmas: row.role === 'admin' ? '*' : ((row.turmas ?? []) as string[]),
    deveTrocarSenha: !!row.deve_trocar_senha,
  }
})

// ─── Permissões ──────────────────────────────────────────────────────────────

export function temModulo(s: Sessao, modulo: Modulo, nivel: Nivel = 'ver'): boolean {
  if (s.role === 'admin') return true
  const n = s.modulos[modulo]
  if (!n) return false
  return nivel === 'ver' || n === 'editar'
}

export function podeGerenciarUsuarios(s: Sessao, nivel: Nivel = 'editar'): boolean {
  return temModulo(s, 'usuarios', nivel)
}

export function podeAcessarTurma(s: Sessao, turmaId: string): boolean {
  return s.turmas === '*' || s.turmas.includes(turmaId)
}

export async function exigirSessao(): Promise<Sessao> {
  const s = await obterSessao()
  if (!s) throw new AcessoNegadoError('Sessão expirada. Faça login novamente.')
  if (s.deveTrocarSenha) throw new AcessoNegadoError('Defina uma nova senha para continuar.')
  return s
}

/**
 * Garante que o usuário logado tem acesso a pelo menos um dos módulos
 * informados e devolve a sessão + congregação ativa (`cid`).
 */
export async function exigirModulo(
  modulo: Modulo | Modulo[],
  nivel: Nivel = 'ver'
): Promise<{ s: Sessao; cid: string }> {
  const s = await exigirSessao()
  const lista = Array.isArray(modulo) ? modulo : [modulo]
  if (!lista.some(m => temModulo(s, m, nivel))) {
    throw new AcessoNegadoError(
      nivel === 'editar'
        ? 'Você possui acesso somente de visualização neste módulo.'
        : 'Você não tem acesso a este módulo.'
    )
  }
  if (!s.cid) throw new AcessoNegadoError('Nenhuma congregação cadastrada. Cadastre uma congregação primeiro.')
  return { s, cid: s.cid }
}

export async function exigirAdminGeral(): Promise<Sessao> {
  const s = await exigirSessao()
  if (!s.adminGeral) throw new AcessoNegadoError('Apenas o administrador geral pode realizar esta ação.')
  return s
}

// ─── Concessão de permissões ─────────────────────────────────────────────────

export type ModuloPermissao = { modulo: Modulo; nivel: Nivel }

/** Sanitiza a lista de módulos recebida do cliente (remove inválidos/duplicados). */
export function normalizarModulos(entrada: unknown): ModuloPermissao[] {
  if (!Array.isArray(entrada)) return []
  const mapa = new Map<Modulo, Nivel>()
  for (const item of entrada) {
    const modulo = (typeof item === 'string' ? item : item?.modulo) as Modulo
    const nivel: Nivel = typeof item === 'object' && item?.nivel === 'ver' ? 'ver' : 'editar'
    if (!MODULOS.includes(modulo)) continue
    if (mapa.get(modulo) !== 'editar') mapa.set(modulo, nivel)
  }
  return Array.from(mapa, ([modulo, nivel]) => ({ modulo, nivel }))
}

/**
 * Um colaborador (não-admin) com permissão de gerenciar usuários só pode
 * conceder módulos que ele próprio possui, e no máximo com o mesmo nível.
 */
export function assertPodeConceder(s: Sessao, modulos: ModuloPermissao[]) {
  if (s.role === 'admin') return
  for (const m of modulos) {
    if (!temModulo(s, m.modulo, m.nivel)) {
      throw new AcessoNegadoError(`Você não pode conceder o módulo "${m.modulo}" com nível "${m.nivel}", pois não possui esse acesso.`)
    }
  }
}

// ─── Validação de escopo de IDs ──────────────────────────────────────────────

function idsUnicos(ids: (string | null | undefined)[]): string[] {
  return Array.from(new Set(ids.filter((x): x is string => !!x)))
}

/** Lança erro se algum ID não pertencer à congregação informada. */
async function assertIdsDaCongregacao(
  tabela: 'turmas' | 'alunos' | 'professores' | 'visitantes' | 'chamadas' | 'escalas',
  ids: (string | null | undefined)[],
  cid: string,
  rotulo: string
) {
  const unicos = idsUnicos(ids)
  if (unicos.length === 0) return
  const [{ total }] = await sql`
    SELECT COUNT(*)::int AS total FROM ${sql(tabela)}
    WHERE id = ANY(${unicos}::uuid[]) AND congregacao_id = ${cid}
  `
  if (total !== unicos.length) {
    throw new AcessoNegadoError(`${rotulo} não encontrado(a) nesta congregação.`)
  }
}

export const assertTurmasDaCongregacao      = (ids: (string | null | undefined)[], cid: string) => assertIdsDaCongregacao('turmas', ids, cid, 'Turma')
export const assertAlunosDaCongregacao      = (ids: (string | null | undefined)[], cid: string) => assertIdsDaCongregacao('alunos', ids, cid, 'Aluno')
export const assertProfessoresDaCongregacao = (ids: (string | null | undefined)[], cid: string) => assertIdsDaCongregacao('professores', ids, cid, 'Professor')
export const assertVisitantesDaCongregacao  = (ids: (string | null | undefined)[], cid: string) => assertIdsDaCongregacao('visitantes', ids, cid, 'Visitante')

/** Mantém apenas os IDs de chamada que pertencem à congregação. */
export async function filtrarChamadasDaCongregacao(ids: string[], cid: string): Promise<string[]> {
  const unicos = idsUnicos(ids)
  if (unicos.length === 0) return []
  const rows = await sql`SELECT id FROM chamadas WHERE id = ANY(${unicos}::uuid[]) AND congregacao_id = ${cid}`
  return rows.map(r => r.id as string)
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import sql from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  obterSessao, podeGerenciarUsuarios, normalizarModulos, assertPodeConceder,
  assertTurmasDaCongregacao, AcessoNegadoError, type Sessao, type ModuloPermissao,
} from '@/lib/sessao'

const MOD = 'api:usuarios'

// Regras de escopo:
//   admin geral          → vê e gerencia todos os usuários, de qualquer congregação
//   admin da congregação → apenas usuários da própria congregação
//   colaborador gestor   → (módulo 'usuarios') apenas colaboradores da própria
//                          congregação, concedendo no máximo o acesso que possui
// Nenhum usuário de congregação enxerga outras congregações nem seus usuários.

class ErroApi extends Error {
  constructor(public status: number, msg: string) { super(msg) }
}

function responderErro(e: unknown) {
  if (e instanceof ErroApi) return NextResponse.json({ error: e.message }, { status: e.status })
  if (e instanceof AcessoNegadoError) return NextResponse.json({ error: e.message }, { status: 403 })
  logger.error('Erro inesperado na rota de usuários', { module: MOD, error: e as Error })
  return NextResponse.json({ error: (e as Error)?.message ?? 'Erro interno' }, { status: 500 })
}

async function exigirGestor(nivel: 'ver' | 'editar'): Promise<Sessao> {
  const s = await obterSessao()
  if (!s) throw new ErroApi(401, 'Sessão expirada')
  if (s.deveTrocarSenha) throw new ErroApi(403, 'Defina uma nova senha para continuar.')
  if (!podeGerenciarUsuarios(s, nivel)) throw new ErroApi(403, 'Sem permissão')
  return s
}

interface Alvo { id: string; role: 'admin' | 'usuario'; congregacao_id: string | null }

async function carregarAlvo(id: string): Promise<Alvo> {
  const [alvo] = await sql`SELECT id, role, congregacao_id FROM perfis WHERE id = ${id}`
  if (!alvo) throw new ErroApi(404, 'Usuário não encontrado')
  return alvo as Alvo
}

/** O gestor pode agir sobre este usuário? (404 para não revelar usuários de fora) */
function assertAlvoNoEscopo(s: Sessao, alvo: Alvo) {
  if (s.adminGeral) return
  if (alvo.congregacao_id !== s.congregacaoId) throw new ErroApi(404, 'Usuário não encontrado')
  if (s.role !== 'admin' && alvo.role === 'admin' && alvo.id !== s.userId) {
    throw new ErroApi(403, 'Você não pode alterar administradores.')
  }
}

interface AcessoResolvido {
  role: 'admin' | 'usuario'
  congregacaoId: string | null
  perfilAcessoId: string | null
  modulos: ModuloPermissao[]
  turmas: string[]
}

/** Valida e resolve role/congregação/permissões pedidas pelo gestor. */
async function resolverAcesso(s: Sessao, body: any): Promise<AcessoResolvido> {
  // Papel
  const role: 'admin' | 'usuario' = body.role === 'admin' ? 'admin' : 'usuario'
  if (role === 'admin' && s.role !== 'admin') {
    throw new ErroApi(403, 'Você não pode criar administradores.')
  }

  // Congregação
  let congregacaoId: string | null
  if (s.adminGeral) {
    congregacaoId = body.congregacao_id || null
    if (role === 'usuario' && !congregacaoId) throw new ErroApi(400, 'Selecione a congregação do usuário.')
    if (congregacaoId) {
      const [c] = await sql`SELECT id FROM congregacoes WHERE id = ${congregacaoId}`
      if (!c) throw new ErroApi(400, 'Congregação inválida.')
    }
  } else {
    congregacaoId = s.congregacaoId
  }

  if (role === 'admin') {
    return { role, congregacaoId, perfilAcessoId: null, modulos: [], turmas: [] }
  }

  // Perfil de acesso (modelo) ou permissões personalizadas
  const perfilAcessoId: string | null = body.perfil_acesso_id || null
  let modulos: ModuloPermissao[]
  if (perfilAcessoId) {
    const [pa] = await sql`
      SELECT id, congregacao_id,
        COALESCE((SELECT json_agg(json_build_object('modulo', modulo, 'nivel', nivel))
                  FROM perfis_acesso_modulos WHERE perfil_acesso_id = perfis_acesso.id), '[]') AS modulos
      FROM perfis_acesso WHERE id = ${perfilAcessoId}
    `
    if (!pa || (pa.congregacao_id !== null && pa.congregacao_id !== congregacaoId)) {
      throw new ErroApi(400, 'Perfil de acesso inválido para esta congregação.')
    }
    modulos = normalizarModulos(pa.modulos)
    assertPodeConceder(s, modulos)
    modulos = [] // permissões vêm do perfil; nada é gravado por usuário
  } else {
    modulos = normalizarModulos(body.modulos)
    assertPodeConceder(s, modulos)
  }

  // Turmas liberadas na chamada
  const turmas: string[] = Array.isArray(body.turmas)
    ? Array.from(new Set(body.turmas.filter((t: unknown) => typeof t === 'string')))
    : []
  if (turmas.length > 0) {
    await assertTurmasDaCongregacao(turmas, congregacaoId!)
    if (s.turmas !== '*') {
      const minhas = s.turmas
      if (turmas.some(t => !minhas.includes(t))) {
        throw new ErroApi(403, 'Você só pode liberar turmas às quais você tem acesso.')
      }
    }
  }

  return { role, congregacaoId, perfilAcessoId, modulos, turmas }
}

async function gravarPermissoes(tx: typeof sql, userId: string, acesso: AcessoResolvido) {
  await tx`DELETE FROM permissoes_modulos WHERE perfil_id = ${userId}`
  await tx`DELETE FROM permissoes_turmas WHERE perfil_id = ${userId}`
  if (acesso.role === 'admin') return
  if (acesso.modulos.length > 0) {
    await tx`
      INSERT INTO permissoes_modulos (perfil_id, modulo, nivel)
      SELECT ${userId}::uuid, * FROM unnest(
        ${sql.array(acesso.modulos.map(m => m.modulo))}::text[],
        ${sql.array(acesso.modulos.map(m => m.nivel))}::text[]
      )
    `
  }
  if (acesso.turmas.length > 0) {
    await tx`
      INSERT INTO permissoes_turmas (perfil_id, turma_id)
      SELECT ${userId}::uuid, unnest(${sql.array(acesso.turmas)}::uuid[])
    `
  }
}

async function mapaEmails(db: any): Promise<Record<string, string>> {
  const emails: Record<string, string> = {}
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) {
      logger.error('Falha ao listar auth.users', { module: MOD, error })
      break
    }
    for (const u of data?.users ?? []) emails[u.id] = u.email ?? ''
    if (!data?.users || data.users.length < 1000) break
  }
  return emails
}

// ─── GET — Listar usuários ────────────────────────────────────────────────────
export async function GET() {
  try {
    const s = await exigirGestor('ver')

    const perfis = await sql`
      SELECT p.id, p.nome, p.role, p.ativo, p.created_at, p.congregacao_id, p.perfil_acesso_id,
        p.deve_trocar_senha, p.senha_alterada_em,
        c.nome AS congregacao_nome, pa.nome AS perfil_acesso_nome,
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
          SELECT json_agg(json_build_object('id', t.id, 'nome', t.nome) ORDER BY t.nome)
          FROM permissoes_turmas pt JOIN turmas t ON t.id = pt.turma_id
          WHERE pt.perfil_id = p.id
        ), '[]') AS turmas
      FROM perfis p
      LEFT JOIN congregacoes c ON c.id = p.congregacao_id
      LEFT JOIN perfis_acesso pa ON pa.id = p.perfil_acesso_id
      WHERE ${s.adminGeral
        ? sql`TRUE`
        : s.role === 'admin'
          ? sql`p.congregacao_id = ${s.congregacaoId}`
          : sql`p.congregacao_id = ${s.congregacaoId} AND (p.role = 'usuario' OR p.id = ${s.userId})`}
      ORDER BY p.nome
    `

    const emails = await mapaEmails(createServiceClient() as any)

    return NextResponse.json(perfis.map(p => ({
      id: p.id,
      nome: p.nome,
      role: p.role,
      ativo: p.ativo,
      created_at: p.created_at,
      deve_trocar_senha: p.deve_trocar_senha,
      senha_alterada_em: p.senha_alterada_em,
      email: emails[p.id] ?? '',
      congregacao_id: p.congregacao_id,
      congregacao_nome: s.adminGeral ? p.congregacao_nome : undefined,
      perfil_acesso_id: p.perfil_acesso_id,
      perfil_acesso_nome: p.perfil_acesso_nome,
      modulos: p.modulos,
      turmas: p.turmas,
    })))
  } catch (e) {
    return responderErro(e)
  }
}

// ─── POST — Criar usuário ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const s = await exigirGestor('editar')
    const body = await req.json().catch(() => { throw new ErroApi(400, 'Body inválido') })

    const nome = String(body.nome ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const senha = String(body.senha ?? '')
    if (!nome || !email || !senha) throw new ErroApi(400, 'Nome, e-mail e senha são obrigatórios')
    if (senha.length < 6) throw new ErroApi(400, 'A senha deve ter pelo menos 6 caracteres')

    const acesso = await resolverAcesso(s, body)
    // Por padrão o novo usuário define a própria senha no primeiro acesso
    const deveTrocarSenha = body.deve_trocar_senha !== false
    const db = createServiceClient() as any

    const { data: authUser, error: authError } = await db.auth.admin.createUser({
      email, password: senha, email_confirm: true,
    })
    if (authError) {
      logger.warn('Falha ao criar usuário no Supabase Auth', { module: MOD, email, error: authError })
      const msg = /already|registered|exists/i.test(authError.message)
        ? 'Este e-mail já está em uso.'
        : authError.message
      throw new ErroApi(400, msg)
    }

    const novoId: string = authUser.user.id
    try {
      await sql.begin(async t => {
        const tx = t as unknown as typeof sql // tipagem do postgres.js não expõe a assinatura de chamada
        await tx`
          INSERT INTO perfis (id, nome, role, ativo, congregacao_id, perfil_acesso_id, deve_trocar_senha)
          VALUES (${novoId}, ${nome}, ${acesso.role}, true, ${acesso.congregacaoId}, ${acesso.perfilAcessoId}, ${deveTrocarSenha})
        `
        await gravarPermissoes(tx, novoId, acesso)
      })
    } catch (e) {
      logger.error('Falha ao criar perfil — removendo auth user (rollback)', { module: MOD, novoId, error: e as Error })
      await db.auth.admin.deleteUser(novoId)
      throw new ErroApi(500, 'Erro ao criar usuário')
    }

    logger.info(`Usuário criado: ${email}`, { module: MOD, userId: s.userId, novoId, role: acesso.role })
    return NextResponse.json({ id: novoId, nome, email, role: acesso.role })
  } catch (e) {
    return responderErro(e)
  }
}

// ─── PUT — Atualizar usuário ──────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const s = await exigirGestor('editar')
    const body = await req.json().catch(() => { throw new ErroApi(400, 'Body inválido') })
    if (!body.id) throw new ErroApi(400, 'ID obrigatório')

    const alvo = await carregarAlvo(body.id)
    assertAlvoNoEscopo(s, alvo)

    const nome = String(body.nome ?? '').trim()
    if (!nome) throw new ErroApi(400, 'Nome é obrigatório')
    const novaSenha = body.novaSenha ? String(body.novaSenha) : ''
    if (novaSenha && novaSenha.length < 6) throw new ErroApi(400, 'A senha deve ter pelo menos 6 caracteres')

    const proprio = alvo.id === s.userId
    // Ninguém altera o próprio nível de acesso (evita auto-promoção e auto-bloqueio)
    const acesso = proprio ? null : await resolverAcesso(s, body)

    // Exigir troca de senha no próximo acesso: ao redefinir a senha vale TRUE por
    // padrão; sem nova senha, só muda se o gestor informar. Não se aplica à própria conta.
    const deveTrocarSenha: boolean | null = proprio
      ? null
      : typeof body.deve_trocar_senha === 'boolean'
        ? body.deve_trocar_senha
        : novaSenha ? true : null

    await sql.begin(async t => {
      const tx = t as unknown as typeof sql
      if (acesso) {
        await tx`
          UPDATE perfis SET nome = ${nome}, role = ${acesso.role}, congregacao_id = ${acesso.congregacaoId},
            perfil_acesso_id = ${acesso.perfilAcessoId}
          WHERE id = ${alvo.id}
        `
        await gravarPermissoes(tx, alvo.id, acesso)
      } else {
        await tx`UPDATE perfis SET nome = ${nome} WHERE id = ${alvo.id}`
      }
      if (deveTrocarSenha !== null) {
        await tx`UPDATE perfis SET deve_trocar_senha = ${deveTrocarSenha} WHERE id = ${alvo.id}`
      }
    })

    if (novaSenha) {
      const db = createServiceClient() as any
      const { error } = await db.auth.admin.updateUserById(alvo.id, { password: novaSenha })
      if (error) throw new ErroApi(400, `Dados salvos, mas falhou ao trocar a senha: ${error.message}`)
    }

    logger.info(`Usuário atualizado: ${alvo.id}`, { module: MOD, userId: s.userId, targetId: alvo.id })
    return NextResponse.json({ success: true })
  } catch (e) {
    return responderErro(e)
  }
}

// ─── PATCH — Ativar/desativar ou exigir troca de senha ────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const s = await exigirGestor('editar')
    const body = await req.json().catch(() => { throw new ErroApi(400, 'Body inválido') })
    const temAtivo = typeof body.ativo === 'boolean'
    const temTroca = typeof body.deve_trocar_senha === 'boolean'
    if (!body.id || (!temAtivo && !temTroca)) throw new ErroApi(400, 'Parâmetros inválidos')
    if (body.id === s.userId) throw new ErroApi(400, 'Você não pode alterar o status da sua própria conta')

    const alvo = await carregarAlvo(body.id)
    assertAlvoNoEscopo(s, alvo)

    if (temAtivo) await sql`UPDATE perfis SET ativo = ${body.ativo} WHERE id = ${alvo.id}`
    if (temTroca) await sql`UPDATE perfis SET deve_trocar_senha = ${body.deve_trocar_senha} WHERE id = ${alvo.id}`
    return NextResponse.json({ success: true })
  } catch (e) {
    return responderErro(e)
  }
}

// ─── DELETE — Apagar usuário permanentemente ─────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const s = await exigirGestor('editar')
    const id = new URL(req.url).searchParams.get('id')
    if (!id) throw new ErroApi(400, 'ID obrigatório')
    if (id === s.userId) throw new ErroApi(400, 'Você não pode apagar sua própria conta')

    const alvo = await carregarAlvo(id)
    assertAlvoNoEscopo(s, alvo)

    await sql`DELETE FROM perfis WHERE id = ${id}` // permissões caem em cascata
    const db = createServiceClient() as any
    const { error: authErr } = await db.auth.admin.deleteUser(id)
    if (authErr) {
      logger.error('Falha ao apagar auth user (perfil já removido)', { module: MOD, targetId: id, error: authErr })
    }

    logger.info(`Usuário apagado permanentemente: ${id}`, { module: MOD, userId: s.userId, targetId: id })
    return NextResponse.json({ success: true })
  } catch (e) {
    return responderErro(e)
  }
}

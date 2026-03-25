import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const MOD = 'api:usuarios'

// ─── Helper: verificar se o chamador é admin ──────────────────────────────────

async function verificarAdmin(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession()

  if (sessionErr) {
    logger.error('Falha ao obter sessão na rota de usuários', {
      module: MOD,
      method: req.method,
      path: req.nextUrl.pathname,
      error: sessionErr,
    })
    return null
  }

  if (!session) {
    logger.warn('Requisição sem sessão ativa', {
      module: MOD,
      method: req.method,
      path: req.nextUrl.pathname,
    })
    return null
  }

  const db = createServiceClient()
  const { data: perfil, error: perfilErr } = await (db as any)
    .from('perfis')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (perfilErr) {
    logger.error('Falha ao verificar role do usuário', {
      module: MOD,
      userId: session.user.id,
      error: perfilErr,
    })
    return null
  }

  if (perfil?.role !== 'admin') {
    logger.warn('Acesso negado — usuário não é admin', {
      module: MOD,
      userId: session.user.id,
      role: perfil?.role ?? 'desconhecido',
      method: req.method,
    })
    return null
  }

  return session
}

// ─── GET — Listar usuários ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const t0 = Date.now()
  logger.info('GET /api/usuarios — listando usuários', { module: MOD })

  const session = await verificarAdmin(req)
  if (!session) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const db = createServiceClient() as any

  const { data: perfis, error: perfisErr } = await db
    .from('perfis')
    .select('id, nome, role, ativo, created_at')
    .order('nome')

  if (perfisErr) {
    logger.error('Falha ao buscar perfis', { module: MOD, userId: session.user.id, error: perfisErr })
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }

  const { data: { users }, error: usersErr } = await db.auth.admin.listUsers()
  if (usersErr) {
    logger.error('Falha ao listar auth.users', { module: MOD, userId: session.user.id, error: usersErr })
  }

  const emailPorId: Record<string, string> = {}
  for (const u of users ?? []) emailPorId[u.id] = u.email ?? ''

  const ids = (perfis ?? []).map((p: any) => p.id)
  const [{ data: modulos, error: modErr }, { data: turmas, error: turErr }] = await Promise.all([
    db.from('permissoes_modulos').select('perfil_id, modulo').in('perfil_id', ids),
    db.from('permissoes_turmas').select('perfil_id, turma_id, turmas(nome)').in('perfil_id', ids),
  ])

  if (modErr) logger.warn('Falha ao buscar permissões de módulos', { module: MOD, error: modErr })
  if (turErr) logger.warn('Falha ao buscar permissões de turmas',  { module: MOD, error: turErr })

  const modsPorId: Record<string, string[]> = {}
  const turmasPorId: Record<string, { id: string; nome: string }[]> = {}

  for (const m of modulos ?? []) {
    if (!modsPorId[m.perfil_id]) modsPorId[m.perfil_id] = []
    modsPorId[m.perfil_id].push(m.modulo)
  }
  for (const t of turmas ?? []) {
    if (!turmasPorId[t.perfil_id]) turmasPorId[t.perfil_id] = []
    turmasPorId[t.perfil_id].push({ id: t.turma_id, nome: t.turmas?.nome ?? '' })
  }

  const result = (perfis ?? []).map((p: any) => ({
    ...p,
    email: emailPorId[p.id] ?? '',
    modulos: modsPorId[p.id] ?? [],
    turmas: turmasPorId[p.id] ?? [],
  }))

  logger.info(`GET /api/usuarios — ${result.length} usuário(s) retornado(s)`, {
    module: MOD,
    userId: session.user.id,
    total: result.length,
    duration: Date.now() - t0,
  })

  return NextResponse.json(result)
}

// ─── POST — Criar usuário ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const session = await verificarAdmin(req)
  if (!session) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    logger.error('Body inválido na criação de usuário', { module: MOD, error: e as Error })
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { nome, email, senha, role, modulos, turmas } = body

  if (!nome || !email || !senha) {
    logger.warn('POST /api/usuarios — campos obrigatórios ausentes', {
      module: MOD,
      userId: session.user.id,
      camposFaltando: [!nome && 'nome', !email && 'email', !senha && 'senha'].filter(Boolean),
    })
    return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios' }, { status: 400 })
  }

  logger.info(`Criando usuário: ${email} (role: ${role ?? 'usuario'})`, {
    module: MOD,
    userId: session.user.id,
    email,
    role,
  })

  const db = createServiceClient() as any

  // 1. Criar usuário no auth do Supabase
  const { data: authUser, error: authError } = await db.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (authError) {
    logger.error('Falha ao criar usuário no Supabase Auth', {
      module: MOD,
      userId: session.user.id,
      email,
      error: authError,
    })
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const newUserId = authUser.user.id
  logger.debug('Usuário criado no Auth', { module: MOD, newUserId, email })

  // 2. Criar perfil
  const { error: perfilError } = await db.from('perfis').insert({
    id: newUserId,
    nome,
    role: role === 'admin' ? 'admin' : 'usuario',
    ativo: true,
  })

  if (perfilError) {
    logger.error('Falha ao criar perfil — removendo auth user por rollback', {
      module: MOD,
      newUserId,
      error: perfilError,
    })
    await db.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: 'Erro ao criar perfil' }, { status: 500 })
  }

  // 3. Se colaborador, salvar permissões
  if (role !== 'admin') {
    const modInserts   = (modulos ?? []).map((m: string) => ({ perfil_id: newUserId, modulo: m }))
    const turmaInserts = (turmas  ?? []).map((t: string) => ({ perfil_id: newUserId, turma_id: t }))

    if (modInserts.length > 0) {
      const { error: modErr } = await db.from('permissoes_modulos').insert(modInserts)
      if (modErr) logger.warn('Falha ao salvar permissões de módulos', { module: MOD, newUserId, error: modErr })
    }
    if (turmaInserts.length > 0) {
      const { error: turErr } = await db.from('permissoes_turmas').insert(turmaInserts)
      if (turErr) logger.warn('Falha ao salvar permissões de turmas', { module: MOD, newUserId, error: turErr })
    }

    logger.debug('Permissões de colaborador salvas', {
      module: MOD,
      newUserId,
      totalModulos: modInserts.length,
      totalTurmas: turmaInserts.length,
    })
  }

  logger.info(`Usuário criado com sucesso: ${email}`, {
    module: MOD,
    userId: session.user.id,
    newUserId,
    role: role ?? 'usuario',
    duration: Date.now() - t0,
  })

  return NextResponse.json({ id: newUserId, nome, email, role })
}

// ─── PUT — Atualizar usuário ──────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const t0 = Date.now()
  const session = await verificarAdmin(req)
  if (!session) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    logger.error('Body inválido na atualização de usuário', { module: MOD, error: e as Error })
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { id, nome, role, ativo, modulos, turmas, novaSenha } = body

  if (!id) {
    logger.warn('PUT /api/usuarios — ID ausente no body', { module: MOD, userId: session.user.id })
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  }

  logger.info(`Atualizando usuário: ${id}`, {
    module: MOD,
    userId: session.user.id,
    targetId: id,
    role,
    ativo,
    trocouSenha: !!novaSenha,
  })

  const db = createServiceClient() as any

  const { error: updateErr } = await db.from('perfis').update({ nome, role, ativo }).eq('id', id)
  if (updateErr) {
    logger.error('Falha ao atualizar perfil', { module: MOD, targetId: id, error: updateErr })
  }

  if (novaSenha) {
    const { error: passErr } = await db.auth.admin.updateUserById(id, { password: novaSenha })
    if (passErr) logger.error('Falha ao atualizar senha', { module: MOD, targetId: id, error: passErr })
    else logger.debug('Senha atualizada com sucesso', { module: MOD, targetId: id })
  }

  // Resetar e recriar permissões
  await db.from('permissoes_modulos').delete().eq('perfil_id', id)
  await db.from('permissoes_turmas').delete().eq('perfil_id', id)

  if (role !== 'admin') {
    const modInserts   = (modulos ?? []).map((m: string) => ({ perfil_id: id, modulo: m }))
    const turmaInserts = (turmas  ?? []).map((t: string) => ({ perfil_id: id, turma_id: t }))

    if (modInserts.length > 0)   await db.from('permissoes_modulos').insert(modInserts)
    if (turmaInserts.length > 0) await db.from('permissoes_turmas').insert(turmaInserts)
  }

  logger.info(`Usuário atualizado com sucesso: ${id}`, {
    module: MOD,
    userId: session.user.id,
    targetId: id,
    duration: Date.now() - t0,
  })

  return NextResponse.json({ success: true })
}

// ─── DELETE — Desativar usuário ───────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await verificarAdmin(req)
  if (!session) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    logger.warn('DELETE /api/usuarios — ID ausente nos params', { module: MOD, userId: session.user.id })
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  }

  // Não deixar admin desativar a si mesmo
  if (id === session.user.id) {
    logger.warn('Tentativa de auto-desativação bloqueada', { module: MOD, userId: session.user.id })
    return NextResponse.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 })
  }

  const db = createServiceClient() as any
  const { error: deactivateErr } = await db.from('perfis').update({ ativo: false }).eq('id', id)

  if (deactivateErr) {
    logger.error('Falha ao desativar usuário', { module: MOD, userId: session.user.id, targetId: id, error: deactivateErr })
    return NextResponse.json({ error: 'Falha ao desativar usuário' }, { status: 500 })
  }

  logger.info(`Usuário desativado: ${id}`, {
    module: MOD,
    userId: session.user.id,
    targetId: id,
  })

  return NextResponse.json({ success: true })
}

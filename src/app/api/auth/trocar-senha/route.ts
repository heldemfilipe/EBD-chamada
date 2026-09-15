import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase'
import sql from '@/lib/db'
import { obterSessao } from '@/lib/sessao'
import { logger } from '@/lib/logger'

const MOD = 'api:trocar-senha'

// ─── POST — Usuário logado troca a própria senha ──────────────────────────────
// Body: { senhaAtual, novaSenha }
// Funciona também quando `deve_trocar_senha` está pendente (é justamente o
// caminho para liberá-lo). Ao concluir, a exigência é removida.
export async function POST(req: NextRequest) {
  try {
    const s = await obterSessao()
    if (!s) return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const senhaAtual = String(body.senhaAtual ?? '')
    const novaSenha = String(body.novaSenha ?? '')

    if (!senhaAtual || !novaSenha) {
      return NextResponse.json({ error: 'Informe a senha atual e a nova senha.' }, { status: 400 })
    }
    if (novaSenha.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
    }
    if (novaSenha === senhaAtual) {
      return NextResponse.json({ error: 'A nova senha deve ser diferente da senha atual.' }, { status: 400 })
    }

    const admin = createServiceClient() as any
    const { data: authData, error: userErr } = await admin.auth.admin.getUserById(s.userId)
    const email: string | undefined = authData?.user?.email
    if (userErr || !email) {
      logger.error('Não foi possível obter o e-mail do usuário', { module: MOD, userId: s.userId, error: userErr })
      return NextResponse.json({ error: 'Não foi possível validar sua conta.' }, { status: 500 })
    }

    // Confere a senha atual com um cliente descartável (não mexe na sessão do navegador)
    const verificador = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { error: loginErr } = await verificador.auth.signInWithPassword({ email, password: senhaAtual })
    if (loginErr) {
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 })
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(s.userId, { password: novaSenha })
    if (updErr) {
      logger.warn('Falha ao atualizar senha', { module: MOD, userId: s.userId, error: updErr })
      return NextResponse.json({ error: updErr.message ?? 'Não foi possível alterar a senha.' }, { status: 400 })
    }

    await sql`UPDATE perfis SET deve_trocar_senha = false, senha_alterada_em = NOW() WHERE id = ${s.userId}`

    logger.info('Senha alterada pelo próprio usuário', { module: MOD, userId: s.userId })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    logger.error('Erro inesperado ao trocar senha', { module: MOD, error: e })
    return NextResponse.json({ error: 'Erro ao alterar a senha.' }, { status: 500 })
  }
}

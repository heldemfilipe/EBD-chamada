import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Rotas públicas (não precisam de autenticação)
const PUBLIC_ROUTES = ['/login']
// Prefixos que ignoram verificação de auth
const STATIC_PREFIXES = ['/_next', '/favicon', '/api']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // Ignorar arquivos estáticos e APIs (estas têm sua própria auth)
  if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) return res

  const isPublic = PUBLIC_ROUTES.includes(pathname)

  // Criar cliente Supabase com cookies (para verificar sessão no edge)
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    logger.error('Falha ao verificar sessão no middleware', {
      module: 'middleware',
      path: pathname,
      error: sessionError,
    })
  }

  const userId = session?.user?.id ?? undefined

  // ─── Não autenticado tentando acessar rota protegida ─────────────────────────
  if (!session && !isPublic) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    logger.warn('Acesso negado — redirecionando para login', {
      module: 'middleware',
      path: pathname,
      userId: undefined,
    })
    return NextResponse.redirect(loginUrl)
  }

  // ─── Já autenticado tentando acessar /login ───────────────────────────────────
  if (session && pathname === '/login') {
    logger.debug('Usuário já autenticado, redirecionando de /login → /dashboard', {
      module: 'middleware',
      userId,
    })
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // ─── Raiz '/' ─────────────────────────────────────────────────────────────────
  if (pathname === '/') {
    const dest = session ? '/dashboard' : '/login'
    logger.debug(`Raiz "/" → redirecionando para ${dest}`, {
      module: 'middleware',
      userId,
    })
    return NextResponse.redirect(new URL(dest, req.url))
  }

  // ─── Acesso permitido ─────────────────────────────────────────────────────────
  if (session) {
    logger.debug(`Acesso permitido`, {
      module: 'middleware',
      path: pathname,
      userId,
    })
  }

  return res
}

export const config = {
  matcher: [
    // Todas as rotas exceto arquivos estáticos do Next.js
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

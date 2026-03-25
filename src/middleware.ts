import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Rotas públicas (não precisam de autenticação)
const PUBLIC_ROUTES = ['/login']
// Prefixos que ignoram verificação de auth
const STATIC_PREFIXES = ['/_next', '/favicon', '/api']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Ignorar arquivos estáticos e APIs (estas têm sua própria auth)
  if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  const isPublic = PUBLIC_ROUTES.includes(pathname)

  // Criar resposta mutável para que o cliente possa atualizar cookies de sessão
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valida o JWT junto ao servidor Supabase Auth (mais seguro que getSession)
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError && userError.message !== 'Auth session missing!') {
    logger.error('Falha ao verificar usuário no middleware', {
      module: 'middleware',
      path: pathname,
      error: userError,
    })
  }

  const userId = user?.id ?? undefined

  // ─── Não autenticado tentando acessar rota protegida ─────────────────────────
  if (!user && !isPublic) {
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
  if (user && pathname === '/login') {
    logger.debug('Usuário já autenticado, redirecionando de /login → /dashboard', {
      module: 'middleware',
      userId,
    })
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // ─── Raiz '/' ─────────────────────────────────────────────────────────────────
  if (pathname === '/') {
    const dest = user ? '/dashboard' : '/login'
    logger.debug(`Raiz "/" → redirecionando para ${dest}`, {
      module: 'middleware',
      userId,
    })
    return NextResponse.redirect(new URL(dest, req.url))
  }

  // ─── Acesso permitido ─────────────────────────────────────────────────────────
  if (user) {
    logger.debug(`Acesso permitido`, {
      module: 'middleware',
      path: pathname,
      userId,
    })
  }

  return response
}

export const config = {
  matcher: [
    // Todas as rotas exceto arquivos estáticos do Next.js
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

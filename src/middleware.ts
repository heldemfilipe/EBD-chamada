import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

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

  // getUser() verifica o JWT no servidor Supabase — seguro para uso em middleware
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? undefined

  // ─── Nao autenticado tentando acessar rota protegida ──────────────────────
  if (!user && !isPublic) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ─── Ja autenticado tentando acessar /login ─────────────────────────────────
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // ─── Raiz '/' ──────────────────────────────────────────────────────────────
  if (pathname === '/') {
    return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', req.url))
  }

  return response
}

export const config = {
  matcher: [
    // Todas as rotas exceto arquivos estáticos do Next.js
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

"use client"

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, ShieldOff, Church } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

// Primeira parte da URL → módulo exigido
const ROTAS_MODULO: Record<string, string> = {
  dashboard: 'dashboard',
  alunos: 'alunos',
  professores: 'professores',
  turmas: 'turmas',
  chamada: 'chamada',
  escala: 'escala',
  relatorios: 'relatorios',
}
const ORDEM_ROTAS = Object.keys(ROTAS_MODULO)

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const {
    user, loading, setupPendente, isAdmin, isAdminGeral, podeGerenciarUsuarios,
    modulosPermitidos, congregacaoAtiva,
  } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const segmento = pathname.split('/')[1] ?? ''

  function rotaPermitida(seg: string): boolean {
    if (setupPendente) return true
    if (seg === 'congregacoes') return isAdminGeral
    if (seg === 'usuarios') return podeGerenciarUsuarios
    if (seg === 'notificacoes') return isAdmin
    const modulo = ROTAS_MODULO[seg]
    return modulo ? modulosPermitidos.includes(modulo) : true
  }

  const primeiraRota = ORDEM_ROTAS.find(r => modulosPermitidos.includes(ROTAS_MODULO[r]))
    ?? (podeGerenciarUsuarios ? 'usuarios' : undefined)
  const permitido = rotaPermitida(segmento)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // Sem acesso à rota → leva para o primeiro módulo liberado
  useEffect(() => {
    if (!loading && user && !permitido && primeiraRota) {
      router.replace(`/${primeiraRota}`)
    }
  }, [loading, user, permitido, primeiraRota, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  let conteudo: React.ReactNode = children

  if (!permitido) {
    conteudo = primeiraRota ? null : (
      <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Sem módulos liberados</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Seu usuário ainda não possui acesso a nenhum módulo. Procure o administrador da sua congregação.
        </p>
      </div>
    )
  } else if (isAdminGeral && !congregacaoAtiva && segmento !== 'congregacoes' && !setupPendente) {
    conteudo = (
      <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
        <Church className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Nenhuma congregação cadastrada</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Cadastre a primeira congregação para começar a usar o sistema.
        </p>
        <Button asChild><Link href="/congregacoes">Cadastrar congregação</Link></Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* key: ao trocar de congregação as páginas são remontadas e recarregam os dados */}
        <div key={congregacaoAtiva?.id ?? 'sem-congregacao'} className="p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
          {conteudo}
        </div>
      </main>
      <Toaster />
    </div>
  )
}

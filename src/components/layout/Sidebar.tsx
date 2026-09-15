"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Menu,
  X,
  BookMarked,
  UserCog,
  LogOut,
  Shield,
  Loader2,
  Church,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const allMenuItems = [
  { title: 'Dashboard',   icon: LayoutDashboard, href: '/dashboard',   modulo: 'dashboard'   },
  { title: 'Alunos',      icon: Users,            href: '/alunos',      modulo: 'alunos'      },
  { title: 'Professores', icon: GraduationCap,    href: '/professores', modulo: 'professores' },
  { title: 'Turmas',      icon: BookOpen,         href: '/turmas',      modulo: 'turmas'      },
  { title: 'Chamada',     icon: ClipboardCheck,   href: '/chamada',     modulo: 'chamada'     },
  { title: 'Escala',        icon: CalendarDays, href: '/escala',       modulo: 'escala'       },
  { title: 'Relatórios',   icon: BarChart3,    href: '/relatorios',   modulo: 'relatorios'   },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [trocando, setTrocando] = useState(false)
  const {
    perfil, isAdmin, isAdminGeral, podeGerenciarUsuarios, modulosPermitidos, loading, signOut,
    congregacaoAtiva, congregacoes, trocarCongregacao,
  } = useAuth()

  const handleTrocarCongregacao = async (id: string) => {
    if (id === congregacaoAtiva?.id) return
    setTrocando(true)
    try {
      await trocarCongregacao(id)
    } finally {
      setTrocando(false)
    }
  }

  const adminLinks = [
    ...(isAdminGeral ? [{ title: 'Congregações', icon: Church, href: '/congregacoes' }] : []),
    ...(podeGerenciarUsuarios ? [{ title: 'Usuários', icon: UserCog, href: '/usuarios' }] : []),
  ]

  const menuItems = loading
    ? []
    : allMenuItems.filter(item => modulosPermitidos.includes(item.modulo))

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      router.replace('/login')
    }
  }

  // Iniciais do nome para o avatar
  const iniciais = perfil?.nome
    ? perfil.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-md bg-primary text-primary-foreground"
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 p-6 border-b hover:bg-accent/50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <div className="bg-primary p-2 rounded-lg">
              <BookMarked className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold">EBD</h2>
              <p className="text-xs text-muted-foreground">Escola Bíblica Dominical</p>
            </div>
          </Link>

          {/* Congregação */}
          {!loading && congregacaoAtiva && (
            <div className="px-4 pt-4">
              {isAdminGeral ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    Congregação
                  </p>
                  <Select value={congregacaoAtiva.id} onValueChange={handleTrocarCongregacao} disabled={trocando}>
                    <SelectTrigger className="h-9">
                      <div className="flex items-center gap-2 min-w-0">
                        {trocando
                          ? <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                          : <Church className="h-4 w-4 text-primary flex-shrink-0" />}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {congregacoes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}{!c.ativa ? ' (inativa)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <Church className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{congregacaoAtiva.nome}</span>
                </div>
              )}
            </div>
          )}

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  )
                })}

                {/* Administração — congregações (admin geral) e usuários (quem pode gerenciar) */}
                {adminLinks.length > 0 && (
                  <>
                    <div className="pt-2 pb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4">
                        Administração
                      </p>
                    </div>
                    {adminLinks.map(item => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                            pathname === item.href
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </nav>

          {/* Footer — info do usuário + logout */}
          <div className="p-4 border-t space-y-3">
            {/* Bloco do usuário → Minha Conta */}
            {perfil && (
              <div className="flex items-center gap-1">
                <Link
                  href="/minha-conta"
                  onClick={() => setIsOpen(false)}
                  title="Minha Conta"
                  className={cn(
                    "group flex items-center gap-3 flex-1 min-w-0 rounded-lg px-2 py-2 transition-colors",
                    pathname === '/minha-conta' ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  )}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {iniciais}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{perfil.nome}</p>
                    <div className="flex items-center gap-1">
                      {isAdmin ? <Shield className="h-3 w-3 text-primary flex-shrink-0" /> : null}
                      <p className="text-xs text-muted-foreground truncate">
                        {isAdminGeral ? 'Administrador geral' : perfil.role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors",
                    pathname === '/minha-conta' ? "text-accent-foreground" : "text-muted-foreground/40 group-hover:text-muted-foreground"
                  )} />
                </Link>
                <ThemeToggle />
              </div>
            )}

            {/* Botão de logout */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{signingOut ? 'Saindo...' : 'Sair'}</span>
            </button>

            <p className="text-xs text-muted-foreground text-center">
              © 2026 EBD Sistema
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

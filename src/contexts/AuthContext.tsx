"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { buscarMeuPerfil, type CongregacaoResumo } from '@/actions/auth'
import { selecionarCongregacao } from '@/actions/congregacoes'
import { toast } from '@/lib/toast'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface Perfil {
  id: string
  nome: string
  role: 'admin' | 'usuario'
  ativo: boolean
}

export type NivelPermissao = 'ver' | 'editar'
export type { CongregacaoResumo }

interface AuthContextType {
  user: User | null
  perfil: Perfil | null
  isAdmin: boolean              // admin geral OU admin da congregação
  isAdminGeral: boolean         // admin sem congregação — gerencia todas
  congregacao: CongregacaoResumo | null        // congregação do usuário (null = admin geral)
  congregacaoAtiva: CongregacaoResumo | null   // congregação cujos dados estão sendo exibidos
  congregacoes: CongregacaoResumo[]            // opções de troca (somente admin geral)
  trocarCongregacao: (id: string) => Promise<void>
  recarregarPerfil: () => Promise<void>
  podeGerenciarUsuarios: boolean
  modulosPermitidos: string[]   // lista de módulos acessíveis; admin = todos
  permissoesModulos: Record<string, NivelPermissao>  // modulo -> nivel
  turmasPermitidas: string[]    // lista de turma_ids; admin = ['*']
  loading: boolean
  setupPendente: boolean        // true se setup_auth.sql ainda não foi executado
  podeEditar: (modulo: string) => boolean
  signOut: () => Promise<void>
}

// ─── Todos os módulos disponíveis ─────────────────────────────────────────────
export const TODOS_MODULOS = [
  'dashboard', 'alunos', 'professores', 'turmas', 'chamada', 'escala', 'relatorios', 'usuarios',
]

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  user: null,
  perfil: null,
  isAdmin: false,
  isAdminGeral: false,
  congregacao: null,
  congregacaoAtiva: null,
  congregacoes: [],
  trocarCongregacao: async () => {},
  recarregarPerfil: async () => {},
  podeGerenciarUsuarios: false,
  modulosPermitidos: [],
  permissoesModulos: {},
  turmasPermitidas: [],
  loading: true,
  setupPendente: false,
  podeEditar: () => false,
  signOut: async () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>([])
  const [permissoesModulos, setPermissoesModulos] = useState<Record<string, NivelPermissao>>({})
  const [turmasPermitidas, setTurmasPermitidas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [setupPendente, setSetupPendente] = useState(false)
  const [isAdminGeral, setIsAdminGeral] = useState(false)
  const [congregacao, setCongregacao] = useState<CongregacaoResumo | null>(null)
  const [congregacaoAtiva, setCongregacaoAtiva] = useState<CongregacaoResumo | null>(null)
  const [congregacoes, setCongregacoes] = useState<CongregacaoResumo[]>([])

  async function loadPerfil(userId: string) {
    logger.info('Carregando perfil do usuário', { module: 'auth', userId })

    let perfilData: Awaited<ReturnType<typeof buscarMeuPerfil>>
    try {
      perfilData = await buscarMeuPerfil()
    } catch (err: any) {
      const msg = (err?.message ?? '') as string
      const tabelaNaoExiste = msg.includes('does not exist') || msg.includes('relation')

      if (tabelaNaoExiste) {
        logger.warn('Tabela "perfis" não encontrada — execute setup_auth.sql no Supabase', {
          module: 'auth',
          userId,
          hint: 'Execute supabase/setup_auth.sql no Supabase SQL Editor',
        })
        setSetupPendente(true)
        setPerfil(null)
        setModulosPermitidos(TODOS_MODULOS)
        setTurmasPermitidas(['*'])
        return
      }

      logger.error('Erro inesperado ao carregar perfil — fazendo logout por segurança', {
        module: 'auth',
        userId,
        error: err,
      })
      await supabase.auth.signOut()
      resetState()
      return
    }

    // ─ Caso 1: Usuário sem perfil, perfil inativo ou congregação desativada
    if (!perfilData) {
      logger.warn('Usuário sem perfil ativo (ou congregação desativada) — fazendo logout', {
        module: 'auth',
        userId,
      })
      toast('Seu acesso está desativado. Procure o administrador.', 'error')
      await supabase.auth.signOut()
      resetState()
      return
    }

    // ─ Caso 2: Perfil desativado
    if (!perfilData.ativo) {
      logger.warn('Tentativa de acesso com perfil inativo — fazendo logout', {
        module: 'auth',
        userId,
        nome: perfilData.nome,
      })
      await supabase.auth.signOut()
      resetState()
      return
    }

    // ─ Caso 3: Perfil OK → aplicar permissões
    setSetupPendente(false)
    setPerfil({ id: perfilData.id, nome: perfilData.nome, role: perfilData.role, ativo: perfilData.ativo })
    setIsAdminGeral(perfilData.adminGeral)
    setCongregacao(perfilData.congregacao)
    setCongregacaoAtiva(perfilData.congregacaoAtiva)
    setCongregacoes(perfilData.congregacoes)

    if (perfilData.role === 'admin') {
      setModulosPermitidos(TODOS_MODULOS)
      const adminPerms: Record<string, NivelPermissao> = {}
      TODOS_MODULOS.forEach(m => { adminPerms[m] = 'editar' })
      setPermissoesModulos(adminPerms)
      setTurmasPermitidas(['*'])
      logger.info('Acesso admin concedido — todos os módulos e turmas', {
        module: 'auth',
        userId,
        nome: perfilData.nome,
        role: 'admin',
      })
    } else {
      const permsMap: Record<string, NivelPermissao> = {}
      for (const m of perfilData.modulos) {
        permsMap[m.modulo] = (m.nivel ?? 'editar') as NivelPermissao
      }
      setPermissoesModulos(permsMap)
      setModulosPermitidos(Object.keys(permsMap))
      setTurmasPermitidas(perfilData.turmas)

      logger.info('Permissões de colaborador carregadas', {
        module: 'auth',
        userId,
        nome: perfilData.nome,
        modulos: Object.keys(permsMap),
        totalTurmas: perfilData.turmas.length,
      })
    }
  }

  function resetState() {
    setPerfil(null)
    setModulosPermitidos([])
    setPermissoesModulos({})
    setTurmasPermitidas([])
    setSetupPendente(false)
    setIsAdminGeral(false)
    setCongregacao(null)
    setCongregacaoAtiva(null)
    setCongregacoes([])
  }

  useEffect(() => {
    let mounted = true

    // Safety timeout: se em 5s o loading ainda não terminou, libera de qualquer forma
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        logger.warn('Timeout no carregamento do perfil — liberando tela', { module: 'auth' })
        setLoading(false)
      }
    }, 5000)

    async function init() {
      try {
        // 1. Leitura rápida do cache local (sem round-trip ao servidor)
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (!session?.user) {
          return
        }

        // 2. Mostra conteúdo imediatamente usando dados do cache
        setUser(session.user)
        try {
          await loadPerfil(session.user.id)
        } catch (e: any) {
          logger.error('Erro inesperado ao carregar perfil — fazendo logout por segurança', { module: 'auth', error: e?.message })
          toast('Não foi possível carregar seu perfil. Faça login novamente.', 'error')
          await supabase.auth.signOut()
          setUser(null)
          resetState()
        }

        // 3. Verificação real do JWT em background (segurança)
        supabase.auth.getUser().then(({ data: { user: verified } }) => {
          if (!mounted) return
          if (!verified) {
            logger.warn('Token inválido na verificação em background — fazendo logout', { module: 'auth' })
            supabase.auth.signOut()
            setUser(null)
            resetState()
          }
        })
      } finally {
        clearTimeout(safetyTimer)
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // INITIAL_SESSION já foi tratado pelo init() acima
        if (event === 'INITIAL_SESSION') return

        logger.debug(`Auth state change: ${event}`, {
          module: 'auth',
          userId: session?.user?.id ?? undefined,
        })

        setUser(session?.user ?? null)

        try {
          if (session?.user) {
            await loadPerfil(session.user.id)
          } else {
            if (event === 'SIGNED_OUT') {
              logger.info('Sessão encerrada', { module: 'auth' })
            }
            resetState()
          }
        } catch (e: any) {
          logger.error('Erro inesperado no onAuthStateChange ao carregar perfil — fazendo logout por segurança', { module: 'auth', error: e?.message })
          toast('Não foi possível carregar seu perfil. Faça login novamente.', 'error')
          await supabase.auth.signOut()
          setUser(null)
          resetState()
        } finally {
          if (mounted) setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    logger.info('Logout solicitado pelo usuário', {
      module: 'auth',
      userId: user?.id,
    })
    try {
      await supabase.auth.signOut()
    } catch (err) {
      logger.warn('Erro ao chamar supabase.auth.signOut — limpando estado local mesmo assim', {
        module: 'auth',
        error: err instanceof Error ? err : undefined,
      })
    }
    resetState()
  }

  const recarregarPerfil = useCallback(async () => {
    if (user) await loadPerfil(user.id)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const trocarCongregacao = useCallback(async (id: string) => {
    const res = await selecionarCongregacao(id)
    if (!res.success) {
      toast(res.error ?? 'Não foi possível trocar de congregação.', 'error')
      return
    }
    if (user) await loadPerfil(user.id)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = perfil?.role === 'admin'
  const podeGerenciarUsuarios = isAdmin || permissoesModulos['usuarios'] !== undefined

  const podeEditar = useCallback((modulo: string) => {
    if (perfil?.role === 'admin') return true
    return permissoesModulos[modulo] === 'editar'
  }, [perfil, permissoesModulos])

  return (
    <AuthContext.Provider value={{
      user,
      perfil,
      isAdmin,
      isAdminGeral,
      congregacao,
      congregacaoAtiva,
      congregacoes,
      trocarCongregacao,
      recarregarPerfil,
      podeGerenciarUsuarios,
      modulosPermitidos,
      permissoesModulos,
      turmasPermitidas,
      loading,
      setupPendente,
      podeEditar,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext)
}

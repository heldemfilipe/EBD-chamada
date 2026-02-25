"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface Perfil {
  id: string
  nome: string
  role: 'admin' | 'usuario'
  ativo: boolean
}

interface AuthContextType {
  user: User | null
  perfil: Perfil | null
  isAdmin: boolean
  modulosPermitidos: string[]   // lista de módulos acessíveis; admin = todos
  turmasPermitidas: string[]    // lista de turma_ids; admin = ['*']
  loading: boolean
  setupPendente: boolean        // true se setup_auth.sql ainda não foi executado
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
  modulosPermitidos: [],
  turmasPermitidas: [],
  loading: true,
  setupPendente: false,
  signOut: async () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>([])
  const [turmasPermitidas, setTurmasPermitidas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [setupPendente, setSetupPendente] = useState(false)

  async function loadPerfil(userId: string) {
    logger.info('Carregando perfil do usuário', { module: 'auth', userId })

    const db = supabase as any
    const { data: perfilData, error: perfilErr } = await db
      .from('perfis')
      .select('id, nome, role, ativo')
      .eq('id', userId)
      .single()

    // ─ Caso 1: tabela "perfis" não existe (setup_auth.sql não foi executado)
    if (perfilErr) {
      const msg = (perfilErr.message ?? '') as string
      const tabelaNaoExiste =
        perfilErr.code === '42P01' ||
        msg.includes('does not exist') ||
        msg.includes('relation') ||
        perfilErr.code === 'PGRST200'

      if (tabelaNaoExiste) {
        logger.warn('Tabela "perfis" não encontrada — execute setup_auth.sql no Supabase', {
          module: 'auth',
          userId,
          error: { message: perfilErr.message, code: perfilErr.code },
          hint: 'Execute supabase/setup_auth.sql no Supabase SQL Editor',
        })
        // Setup pendente: mantém logado mas sinaliza configuração pendente
        setSetupPendente(true)
        setPerfil(null)
        setModulosPermitidos(TODOS_MODULOS)
        setTurmasPermitidas(['*'])
        return
      }

      // ─ Caso 2: Usuário sem perfil cadastrado (PGRST116 = no rows returned)
      if (perfilErr.code === 'PGRST116') {
        logger.warn('Usuário autenticado sem perfil na tabela "perfis" — fazendo logout', {
          module: 'auth',
          userId,
          error: { message: perfilErr.message, code: perfilErr.code },
        })
        await supabase.auth.signOut()
        resetState()
        return
      }

      // ─ Caso 3: Erro desconhecido
      logger.error('Erro inesperado ao carregar perfil — fazendo logout por segurança', {
        module: 'auth',
        userId,
        error: perfilErr,
      })
      await supabase.auth.signOut()
      resetState()
      return
    }

    // ─ Caso 4: Perfil desativado
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

    // ─ Caso 5: Perfil OK → carregar permissões
    setSetupPendente(false)
    setPerfil(perfilData)

    if (perfilData.role === 'admin') {
      setModulosPermitidos(TODOS_MODULOS)
      setTurmasPermitidas(['*'])
      logger.info('Acesso admin concedido — todos os módulos e turmas', {
        module: 'auth',
        userId,
        nome: perfilData.nome,
        role: 'admin',
      })
    } else {
      const [{ data: modulos, error: modErr }, { data: turmas, error: turErr }] = await Promise.all([
        db.from('permissoes_modulos').select('modulo').eq('perfil_id', userId),
        db.from('permissoes_turmas').select('turma_id').eq('perfil_id', userId),
      ])

      if (modErr) logger.warn('Erro ao carregar permissões de módulos', { module: 'auth', userId, error: modErr })
      if (turErr) logger.warn('Erro ao carregar permissões de turmas',  { module: 'auth', userId, error: turErr })

      const listaModulos = (modulos ?? []).map((m: any) => m.modulo)
      const listaTurmas  = (turmas  ?? []).map((t: any) => t.turma_id)

      setModulosPermitidos(listaModulos)
      setTurmasPermitidas(listaTurmas)

      logger.info('Permissões de colaborador carregadas', {
        module: 'auth',
        userId,
        nome: perfilData.nome,
        modulos: listaModulos,
        totalTurmas: listaTurmas.length,
      })
    }
  }

  function resetState() {
    setPerfil(null)
    setModulosPermitidos([])
    setTurmasPermitidas([])
    setSetupPendente(false)
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug(`Auth state change: ${event}`, {
          module: 'auth',
          userId: session?.user?.id ?? undefined,
        })

        setUser(session?.user ?? null)

        if (session?.user) {
          await loadPerfil(session.user.id)
        } else {
          if (event === 'SIGNED_OUT') {
            logger.info('Sessão encerrada', { module: 'auth' })
          }
          resetState()
        }
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
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

  const isAdmin = perfil?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      user,
      perfil,
      isAdmin,
      modulosPermitidos,
      turmasPermitidas,
      loading,
      setupPendente,
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

"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Shield, ShieldCheck, Users, UserCheck, Edit, Power, Trash2, Search, Church, Layers,
  LayoutDashboard, GraduationCap, BookOpen, ClipboardCheck, UserCog,
  CalendarDays, BarChart3, Eye, EyeOff, Loader2, Key, KeyRound, AlertTriangle, Globe, SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  listarPerfisAcesso, salvarPerfilAcesso, excluirPerfilAcesso, buscarTurmasParaPermissao,
  type PerfilAcesso,
} from '@/actions/perfis-acesso'
import { toast } from '@/lib/toast'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Nivel = 'ver' | 'editar'
type Funcao = 'admin_geral' | 'admin' | 'usuario'

interface ModuloPermissao {
  modulo: string
  nivel: Nivel
}

interface UsuarioDB {
  id: string
  nome: string
  email: string
  role: 'admin' | 'usuario'
  ativo: boolean
  created_at: string
  deve_trocar_senha: boolean
  congregacao_id: string | null
  congregacao_nome?: string | null
  perfil_acesso_id: string | null
  perfil_acesso_nome: string | null
  modulos: ModuloPermissao[]
  turmas: { id: string; nome: string }[]
}

interface TurmaOpcao {
  id: string
  nome: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const MODULOS_INFO = [
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'alunos',      label: 'Alunos',       icon: Users },
  { id: 'professores', label: 'Professores',  icon: GraduationCap },
  { id: 'turmas',      label: 'Turmas',       icon: BookOpen },
  { id: 'chamada',     label: 'Chamada',      icon: ClipboardCheck },
  { id: 'escala',      label: 'Escala',       icon: CalendarDays },
  { id: 'relatorios',  label: 'Relatórios',   icon: BarChart3 },
  { id: 'usuarios',    label: 'Usuários',     icon: UserCog },
]

const FILTRO_TODAS = '__todas__'
const FILTRO_ADMIN_GERAL = '__admin_geral__'
const PERFIL_PERSONALIZADO = '__personalizado__'

function getInitials(nome: string) {
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function funcaoDoUsuario(u: UsuarioDB): Funcao {
  if (u.role === 'admin') return u.congregacao_id ? 'admin' : 'admin_geral'
  return 'usuario'
}

function paraRecord(modulos: ModuloPermissao[]): Record<string, Nivel> {
  const r: Record<string, Nivel> = {}
  for (const m of modulos) r[m.modulo] = (m.nivel ?? 'editar') as Nivel
  return r
}

// ─── Grade de módulos (usada no usuário e no perfil de acesso) ────────────────
function GradeModulos({
  valor, onChange, podeConceder, somenteLeitura,
}: {
  valor: Record<string, Nivel>
  onChange: (v: Record<string, Nivel>) => void
  podeConceder: (modulo: string, nivel: Nivel) => boolean
  somenteLeitura?: boolean
}) {
  const disponiveis = MODULOS_INFO.filter(m => somenteLeitura ? m.id in valor : podeConceder(m.id, 'ver'))

  function toggle(modulo: string) {
    const novo = { ...valor }
    if (modulo in novo) delete novo[modulo]
    else novo[modulo] = podeConceder(modulo, 'editar') ? 'editar' : 'ver'
    onChange(novo)
  }

  if (disponiveis.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhum módulo.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {disponiveis.map(m => {
        const ativo = m.id in valor
        const nivel = valor[m.id]
        const Icon = m.icon
        return (
          <div key={m.id} className="space-y-1">
            <button
              type="button"
              disabled={somenteLeitura}
              onClick={() => toggle(m.id)}
              className={`w-full flex items-center gap-2.5 p-3 rounded-lg border text-sm font-medium transition-all disabled:cursor-default ${
                ativo
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                ativo ? 'border-primary bg-primary' : 'border-muted-foreground/40'
              }`}>
                {ativo && <span className="text-[9px] text-primary-foreground font-bold">✓</span>}
              </div>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {m.label}
            </button>
            {ativo && (
              <div className="flex gap-1 pl-1">
                {(['ver', 'editar'] as Nivel[]).map(n => {
                  const selecionado = nivel === n
                  const habilitado = !somenteLeitura && podeConceder(m.id, n)
                  if (somenteLeitura && !selecionado) return null
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={!habilitado}
                      onClick={() => onChange({ ...valor, [m.id]: n })}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all disabled:opacity-60 disabled:cursor-default ${
                        selecionado
                          ? n === 'ver'
                            ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                            : 'bg-green-500/15 text-green-600 border border-green-500/30'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {n === 'ver' ? <Eye className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
                      {n === 'ver' ? 'Visualizar' : 'Editar'}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChipsModulos({ modulos }: { modulos: ModuloPermissao[] }) {
  if (modulos.length === 0) return <span className="text-xs text-muted-foreground italic">Sem módulos</span>
  return (
    <div className="flex flex-wrap gap-1">
      {modulos.map(m => {
        const info = MODULOS_INFO.find(x => x.id === m.modulo)
        return info ? (
          <span key={m.modulo} className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${
            m.nivel === 'ver' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'
          }`}>
            <info.icon className="h-2.5 w-2.5" />
            {info.label}
            {m.nivel === 'ver' && <Eye className="h-2.5 w-2.5 ml-0.5" />}
          </span>
        ) : null
      })}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function UsuariosPage() {
  const {
    perfil: meuPerfil, isAdmin, isAdminGeral, podeGerenciarUsuarios, podeEditar,
    permissoesModulos, congregacaoAtiva, congregacoes, loading: authLoading,
  } = useAuth()

  const podeGerenciar = podeEditar('usuarios')

  const [usuarios, setUsuarios] = useState<UsuarioDB[]>([])
  const [perfisAcesso, setPerfisAcesso] = useState<PerfilAcesso[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filtros da lista
  const [busca, setBusca] = useState('')
  const [filtroCongregacao, setFiltroCongregacao] = useState<string>(congregacaoAtiva?.id ?? FILTRO_TODAS)
  const [filtroFuncao, setFiltroFuncao] = useState<string>('todas')
  const [filtroPerfil, setFiltroPerfil] = useState<string>('todos')

  // Dialog usuário
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UsuarioDB | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<UsuarioDB | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [buscaPerfil, setBuscaPerfil] = useState('')
  const [perfisDoForm, setPerfisDoForm] = useState<PerfilAcesso[]>([])
  const [turmasDoForm, setTurmasDoForm] = useState<TurmaOpcao[]>([])
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    funcao: 'usuario' as Funcao,
    congregacao_id: '',
    perfil_acesso_id: PERFIL_PERSONALIZADO,
    modulos: {} as Record<string, Nivel>,
    turmas: [] as string[],
    deve_trocar_senha: true,
  })

  // Dialog perfil de acesso
  const [perfilDialog, setPerfilDialog] = useState(false)
  const [perfilForm, setPerfilForm] = useState({ id: '', nome: '', descricao: '', global: false, modulos: {} as Record<string, Nivel> })
  const [perfilExcluir, setPerfilExcluir] = useState<PerfilAcesso | null>(null)

  const editMode = !!selectedUser
  const editandoProprio = selectedUser?.id === meuPerfil?.id

  // ─── Carregamento ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !podeGerenciarUsuarios) return
    fetchUsuarios()
    fetchPerfis()
  }, [authLoading, podeGerenciarUsuarios]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchUsuarios() {
    setLoadingData(true)
    try {
      const res = await fetch('/api/usuarios')
      if (res.ok) setUsuarios(await res.json())
      else toast((await res.json()).error ?? 'Erro ao carregar usuários.', 'error')
    } finally {
      setLoadingData(false)
    }
  }

  async function fetchPerfis() {
    try {
      setPerfisAcesso(await listarPerfisAcesso())
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao carregar perfis de acesso.', 'error')
    }
  }

  // Perfis e turmas dependem da congregação do usuário sendo editado
  const congregacaoDoForm = form.funcao === 'admin_geral' ? null : (form.congregacao_id || congregacaoAtiva?.id || null)
  useEffect(() => {
    if (!dialogOpen || form.funcao !== 'usuario' || !congregacaoDoForm) return
    let cancelado = false
    Promise.all([
      listarPerfisAcesso(congregacaoDoForm),
      buscarTurmasParaPermissao(congregacaoDoForm),
    ]).then(([perfis, turmas]) => {
      if (cancelado) return
      setPerfisDoForm(perfis)
      setTurmasDoForm(turmas)
    }).catch(() => {})
    return () => { cancelado = true }
  }, [dialogOpen, form.funcao, congregacaoDoForm])

  // ─── Permissões do usuário logado ──────────────────────────────────────────
  function podeConceder(modulo: string, nivel: Nivel): boolean {
    if (isAdmin) return true
    const meu = permissoesModulos[modulo]
    if (!meu) return false
    return nivel === 'ver' || meu === 'editar'
  }

  function podeAgirSobre(u: UsuarioDB): boolean {
    if (!podeGerenciar) return false
    if (isAdminGeral) return true
    if (u.id === meuPerfil?.id) return true
    return isAdmin || u.role === 'usuario'
  }

  const opcoesFuncao: { id: Funcao; label: string; desc: string; icon: typeof Shield }[] = [
    ...(isAdminGeral ? [{ id: 'admin_geral' as Funcao, label: 'Admin geral', desc: 'Todas as congregações e suas configurações.', icon: ShieldCheck }] : []),
    ...(isAdmin ? [{ id: 'admin' as Funcao, label: 'Admin da congregação', desc: 'Acesso total apenas à própria congregação.', icon: Shield }] : []),
    { id: 'usuario', label: 'Colaborador', desc: 'Somente os módulos e turmas definidos abaixo.', icon: UserCheck },
  ]

  // ─── Ações usuário ─────────────────────────────────────────────────────────
  function abrirCriar() {
    setSelectedUser(null)
    setForm({
      nome: '', email: '', senha: '', funcao: 'usuario',
      congregacao_id: isAdminGeral && filtroCongregacao !== FILTRO_TODAS && filtroCongregacao !== FILTRO_ADMIN_GERAL
        ? filtroCongregacao
        : congregacaoAtiva?.id ?? '',
      perfil_acesso_id: PERFIL_PERSONALIZADO, modulos: {}, turmas: [],
      deve_trocar_senha: true,
    })
    setShowPassword(false)
    setBuscaPerfil('')
    setDialogOpen(true)
  }

  function abrirEditar(u: UsuarioDB) {
    setSelectedUser(u)
    setForm({
      nome: u.nome,
      email: u.email,
      senha: '',
      funcao: funcaoDoUsuario(u),
      congregacao_id: u.congregacao_id ?? congregacaoAtiva?.id ?? '',
      perfil_acesso_id: u.perfil_acesso_id ?? PERFIL_PERSONALIZADO,
      modulos: u.perfil_acesso_id ? {} : paraRecord(u.modulos),
      turmas: u.turmas.map(t => t.id),
      deve_trocar_senha: u.deve_trocar_senha,
    })
    setShowPassword(false)
    setBuscaPerfil('')
    setDialogOpen(true)
  }

  function toggleTurma(turmaId: string) {
    setForm(f => ({
      ...f,
      turmas: f.turmas.includes(turmaId) ? f.turmas.filter(t => t !== turmaId) : [...f.turmas, turmaId],
    }))
  }

  const perfilSelecionado = perfisDoForm.find(p => p.id === form.perfil_acesso_id) ?? null
  const modulosEfetivos: Record<string, Nivel> = perfilSelecionado ? paraRecord(perfilSelecionado.modulos) : form.modulos
  const perfisFiltradosForm = perfisDoForm.filter(p =>
    !buscaPerfil || p.nome.toLowerCase().includes(buscaPerfil.toLowerCase())
  )

  async function handleSalvar() {
    if (!form.nome || !form.email) { toast('Nome e e-mail são obrigatórios.', 'error'); return }
    if (!editMode && !form.senha) { toast('Senha é obrigatória para novos usuários.', 'error'); return }
    if (form.senha && form.senha.length < 6) { toast('A senha deve ter pelo menos 6 caracteres.', 'error'); return }
    if (form.funcao !== 'admin_geral' && isAdminGeral && !form.congregacao_id) {
      toast('Selecione a congregação do usuário.', 'error'); return
    }

    const usandoPerfil = form.funcao === 'usuario' && form.perfil_acesso_id !== PERFIL_PERSONALIZADO
    const payload = {
      id: selectedUser?.id,
      nome: form.nome,
      email: form.email,
      senha: editMode ? undefined : form.senha,
      novaSenha: editMode && form.senha ? form.senha : undefined,
      role: form.funcao === 'usuario' ? 'usuario' : 'admin',
      congregacao_id: form.funcao === 'admin_geral' ? null : form.congregacao_id || null,
      perfil_acesso_id: usandoPerfil ? form.perfil_acesso_id : null,
      modulos: form.funcao === 'usuario' && !usandoPerfil
        ? Object.entries(form.modulos).map(([modulo, nivel]) => ({ modulo, nivel }))
        : [],
      turmas: form.funcao === 'usuario' && 'chamada' in modulosEfetivos ? form.turmas : [],
      deve_trocar_senha: editandoProprio ? undefined : form.deve_trocar_senha,
    }

    setSaving(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        toast(err.error || 'Erro ao salvar usuário.', 'error')
        return
      }
      toast(editMode ? 'Usuário atualizado.' : 'Usuário criado.', 'success')
      setDialogOpen(false)
      await Promise.all([fetchUsuarios(), fetchPerfis()])
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAtivo(u: UsuarioDB) {
    if (!confirm(u.ativo ? `Desativar acesso de "${u.nome}"?` : `Reativar acesso de "${u.nome}"?`)) return
    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, ativo: !u.ativo }),
    })
    if (res.ok) fetchUsuarios()
    else toast((await res.json()).error ?? 'Erro ao alterar status.', 'error')
  }

  async function handleExigirTrocaSenha(u: UsuarioDB) {
    const exigir = !u.deve_trocar_senha
    if (exigir && !confirm(`Exigir que "${u.nome}" defina uma nova senha no próximo acesso?`)) return
    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, deve_trocar_senha: exigir }),
    })
    if (res.ok) {
      toast(exigir ? 'O usuário definirá uma nova senha no próximo acesso.' : 'Exigência de troca de senha removida.', 'success')
      fetchUsuarios()
    } else {
      toast((await res.json()).error ?? 'Erro ao atualizar.', 'error')
    }
  }

  async function handleApagar() {
    if (!deleteDialog) return
    setDeleting(true)
    const res = await fetch(`/api/usuarios?id=${deleteDialog.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast(`Usuário "${deleteDialog.nome}" apagado com sucesso.`, 'success')
      await Promise.all([fetchUsuarios(), fetchPerfis()])
    } else {
      const err = await res.json()
      toast(err.error || 'Erro ao apagar usuário.', 'error')
    }
    setDeleteDialog(null)
    setDeleting(false)
  }

  // ─── Ações perfil de acesso ────────────────────────────────────────────────
  function abrirNovoPerfil() {
    setPerfilForm({ id: '', nome: '', descricao: '', global: false, modulos: {} })
    setPerfilDialog(true)
  }

  function abrirEditarPerfil(p: PerfilAcesso) {
    setPerfilForm({ id: p.id, nome: p.nome, descricao: p.descricao ?? '', global: p.global, modulos: paraRecord(p.modulos) })
    setPerfilDialog(true)
  }

  async function handleSalvarPerfil() {
    setSaving(true)
    const res = await salvarPerfilAcesso({
      id: perfilForm.id || undefined,
      nome: perfilForm.nome,
      descricao: perfilForm.descricao,
      global: perfilForm.global,
      modulos: Object.entries(perfilForm.modulos).map(([modulo, nivel]) => ({ modulo: modulo as any, nivel })),
    })
    setSaving(false)
    if (!res.success) { toast(res.error ?? 'Erro ao salvar perfil.', 'error'); return }
    toast(perfilForm.id ? 'Perfil atualizado.' : 'Perfil criado.', 'success')
    setPerfilDialog(false)
    await Promise.all([fetchPerfis(), fetchUsuarios()])
  }

  async function handleExcluirPerfil() {
    if (!perfilExcluir) return
    const res = await excluirPerfilAcesso(perfilExcluir.id)
    setPerfilExcluir(null)
    if (!res.success) { toast(res.error ?? 'Erro ao excluir perfil.', 'error'); return }
    toast('Perfil excluído.', 'success')
    fetchPerfis()
  }

  // ─── Lista filtrada ────────────────────────────────────────────────────────
  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return usuarios.filter(u => {
      if (isAdminGeral) {
        if (filtroCongregacao === FILTRO_ADMIN_GERAL && u.congregacao_id) return false
        if (filtroCongregacao !== FILTRO_TODAS && filtroCongregacao !== FILTRO_ADMIN_GERAL && u.congregacao_id !== filtroCongregacao) return false
      }
      if (filtroFuncao !== 'todas' && funcaoDoUsuario(u) !== filtroFuncao) return false
      if (filtroPerfil === PERFIL_PERSONALIZADO && (u.role !== 'usuario' || u.perfil_acesso_id)) return false
      if (filtroPerfil !== 'todos' && filtroPerfil !== PERFIL_PERSONALIZADO && u.perfil_acesso_id !== filtroPerfil) return false
      if (termo && !u.nome.toLowerCase().includes(termo) && !u.email.toLowerCase().includes(termo)) return false
      return true
    })
  }, [usuarios, busca, filtroCongregacao, filtroFuncao, filtroPerfil, isAdminGeral])

  const totalAtivos = usuariosFiltrados.filter(u => u.ativo).length
  const totalAdmins = usuariosFiltrados.filter(u => u.role === 'admin' && u.ativo).length
  const totalColabs = usuariosFiltrados.filter(u => u.role === 'usuario' && u.ativo).length

  if (authLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  if (!podeGerenciarUsuarios) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            {isAdminGeral
              ? 'Gerencie acessos de todas as congregações'
              : `Gerencie os acessos da congregação ${congregacaoAtiva?.nome ?? ''}`}
          </p>
        </div>
        {podeGerenciar && (
          <Button onClick={abrirCriar}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-1.5"><Users className="h-4 w-4" />Usuários</TabsTrigger>
          <TabsTrigger value="perfis" className="gap-1.5"><Layers className="h-4 w-4" />Perfis de acesso</TabsTrigger>
        </TabsList>

        {/* ═══ Aba Usuários ═══ */}
        <TabsContent value="usuarios" className="space-y-6 mt-4">
          <div className="grid gap-4 grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="hidden sm:inline">Total</span> Ativos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalAtivos}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Admins</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-primary">{totalAdmins}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><UserCheck className="h-4 w-4 text-green-500" /><span className="truncate">Colaboradores</span></CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{totalColabs}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="text-base">Lista de Usuários</CardTitle>
              {/* Filtros */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome ou e-mail" className="pl-9" />
                </div>
                {isAdminGeral && (
                  <Select value={filtroCongregacao} onValueChange={setFiltroCongregacao}>
                    <SelectTrigger><Church className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FILTRO_TODAS}>Todas as congregações</SelectItem>
                      <SelectItem value={FILTRO_ADMIN_GERAL}>Administradores gerais</SelectItem>
                      {congregacoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Select value={filtroFuncao} onValueChange={setFiltroFuncao}>
                  <SelectTrigger><Shield className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as funções</SelectItem>
                    {isAdminGeral && <SelectItem value="admin_geral">Admin geral</SelectItem>}
                    <SelectItem value="admin">Admin da congregação</SelectItem>
                    <SelectItem value="usuario">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
                  <SelectTrigger><Layers className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os perfis</SelectItem>
                    <SelectItem value={PERFIL_PERSONALIZADO}>Permissões personalizadas</SelectItem>
                    {perfisAcesso.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table className="min-w-[560px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Usuário</TableHead>
                        <TableHead>Função</TableHead>
                        {isAdminGeral && <TableHead className="hidden md:table-cell">Congregação</TableHead>}
                        <TableHead className="hidden lg:table-cell">Acesso</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuariosFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdminGeral ? 6 : 5} className="text-center py-10 text-muted-foreground">
                            Nenhum usuário encontrado.
                          </TableCell>
                        </TableRow>
                      ) : usuariosFiltrados.map(u => {
                        const funcao = funcaoDoUsuario(u)
                        const proprio = u.id === meuPerfil?.id
                        const podeAgir = podeAgirSobre(u)
                        return (
                          <TableRow key={u.id} className={!u.ativo ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  u.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                }`}>
                                  {getInitials(u.nome)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{u.nome}{proprio && <span className="text-xs text-muted-foreground font-normal"> (você)</span>}</p>
                                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                  {u.deve_trocar_senha && (
                                    <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-amber-600 bg-amber-500/10 rounded px-1.5 py-0.5">
                                      <KeyRound className="h-2.5 w-2.5" />Troca de senha pendente
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {funcao === 'admin_geral' ? (
                                <Badge className="bg-primary/15 text-primary border-primary/30 gap-1 text-xs whitespace-nowrap"><ShieldCheck className="h-3 w-3" />Admin geral</Badge>
                              ) : funcao === 'admin' ? (
                                <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs whitespace-nowrap"><Shield className="h-3 w-3" />Admin</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Colaborador</Badge>
                              )}
                            </TableCell>
                            {isAdminGeral && (
                              <TableCell className="hidden md:table-cell text-sm">
                                {u.congregacao_nome ?? <span className="text-xs text-muted-foreground italic">Todas</span>}
                              </TableCell>
                            )}
                            <TableCell className="hidden lg:table-cell">
                              {u.role === 'admin' ? (
                                <span className="text-xs text-muted-foreground italic">Acesso total</span>
                              ) : (
                                <div className="space-y-1">
                                  {u.perfil_acesso_nome && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                                      <Layers className="h-3 w-3" />{u.perfil_acesso_nome}
                                    </span>
                                  )}
                                  <ChipsModulos modulos={u.modulos} />
                                  {u.turmas.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {u.turmas.map(t => (
                                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">{t.nome}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {u.ativo
                                ? <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">Ativo</Badge>
                                : <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              {podeAgir && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => abrirEditar(u)} title="Editar">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {!proprio && (
                                    <>
                                      <Button
                                        variant="ghost" size="icon"
                                        onClick={() => handleExigirTrocaSenha(u)}
                                        title={u.deve_trocar_senha ? 'Remover exigência de troca de senha' : 'Exigir nova senha no próximo acesso'}
                                        className={u.deve_trocar_senha ? 'text-amber-600 hover:text-amber-700' : 'hover:text-amber-600'}
                                      >
                                        <KeyRound className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon"
                                        onClick={() => handleToggleAtivo(u)}
                                        title={u.ativo ? 'Desativar' : 'Reativar'}
                                        className={u.ativo ? 'hover:text-destructive' : 'hover:text-green-600'}
                                      >
                                        <Power className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(u)} title="Apagar usuário" className="hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Aba Perfis de acesso ═══ */}
        <TabsContent value="perfis" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground max-w-2xl">
              Perfis são modelos de permissão (ex.: &quot;Somente Escala&quot;, &quot;Secretário da Chamada&quot;). Ao vincular um
              perfil a um usuário, alterações no perfil passam a valer para todos que o usam.
              {isAdminGeral && ' Perfis globais ficam disponíveis para todas as congregações.'}
            </p>
            {podeGerenciar && (
              <Button variant="outline" onClick={abrirNovoPerfil} className="flex-shrink-0">
                <Plus className="h-4 w-4 mr-2" />Novo Perfil
              </Button>
            )}
          </div>

          {perfisAcesso.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum perfil de acesso cadastrado.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {perfisAcesso.map(p => (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{p.nome}</CardTitle>
                        {p.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.descricao}</p>}
                      </div>
                      {p.global
                        ? <Badge variant="outline" className="gap-1 text-[10px] flex-shrink-0"><Globe className="h-3 w-3" />Global</Badge>
                        : <Badge variant="secondary" className="gap-1 text-[10px] flex-shrink-0"><Church className="h-3 w-3" />Congregação</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ChipsModulos modulos={p.modulos} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{p.total_usuarios} usuário(s)</span>
                      {p.editavel && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEditarPerfil(p)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Excluir" className="hover:text-destructive" onClick={() => setPerfilExcluir(p)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Dialog Confirmar Exclusão de usuário ─── */}
      <Dialog open={!!deleteDialog} onOpenChange={open => { if (!open) setDeleteDialog(null) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Apagar Usuário
            </DialogTitle>
            <DialogDescription className="pt-1">
              Esta ação é permanente e não pode ser desfeita. O usuário perderá acesso imediatamente.
            </DialogDescription>
          </DialogHeader>
          {deleteDialog && (
            <div className="py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-muted text-muted-foreground">
                  {getInitials(deleteDialog.nome)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{deleteDialog.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{deleteDialog.email}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleApagar} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Apagando...</> : 'Apagar Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Criar / Editar usuário ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Atualize os dados e permissões do usuário.' : 'Preencha os dados para criar o acesso.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Dados básicos */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  disabled={editMode}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{editMode ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => {
                    const senha = e.target.value
                    // Ao redefinir a senha de alguém, sugere exigir a troca no próximo acesso
                    setForm(f => ({ ...f, senha, deve_trocar_senha: editMode && senha && !f.senha ? true : f.deve_trocar_senha }))
                  }}
                  placeholder={editMode ? '••••••••' : 'Mínimo 6 caracteres'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {editMode && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Key className="h-3 w-3" />Preencha apenas se quiser redefinir a senha.
                </p>
              )}
            </div>

            {!editandoProprio && (
              <label className="flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={form.deve_trocar_senha}
                  onChange={e => setForm(f => ({ ...f, deve_trocar_senha: e.target.checked }))}
                />
                <span className="text-sm">
                  <span className="font-medium flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" />Exigir nova senha no próximo acesso</span>
                  <span className="text-xs text-muted-foreground">
                    O usuário entra com a senha informada por você e, antes de usar o sistema, precisa definir a própria senha.
                  </span>
                </span>
              </label>
            )}

            {editandoProprio ? (
              <p className="text-xs text-muted-foreground rounded-lg border bg-muted/40 p-3">
                Você não pode alterar o seu próprio nível de acesso. Peça a outro administrador.
              </p>
            ) : (
              <>
                {/* Função */}
                {opcoesFuncao.length > 1 && (
                  <div className="space-y-2">
                    <Label>Função</Label>
                    <div className={`grid gap-2 ${opcoesFuncao.length === 3 ? 'sm:grid-cols-3' : 'grid-cols-2'}`}>
                      {opcoesFuncao.map(op => {
                        const sel = form.funcao === op.id
                        const Icon = op.icon
                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, funcao: op.id }))}
                            className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left ${
                              sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${sel ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="font-semibold text-sm">{op.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-snug">{op.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Congregação (somente admin geral escolhe) */}
                {isAdminGeral && form.funcao !== 'admin_geral' && (
                  <div className="space-y-2">
                    <Label>Congregação *</Label>
                    <Select
                      value={form.congregacao_id}
                      onValueChange={v => setForm(f => ({ ...f, congregacao_id: v, perfil_acesso_id: PERFIL_PERSONALIZADO, turmas: [] }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione a congregação" /></SelectTrigger>
                      <SelectContent>
                        {congregacoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.funcao === 'usuario' && (
                  <>
                    {/* Perfil de acesso */}
                    <div className="space-y-2">
                      <Label>Perfil de acesso</Label>
                      {perfisDoForm.length > 4 && (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={buscaPerfil} onChange={e => setBuscaPerfil(e.target.value)} placeholder="Filtrar perfis" className="pl-9 h-9" />
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, perfil_acesso_id: PERFIL_PERSONALIZADO }))}
                          className={`flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-all ${
                            form.perfil_acesso_id === PERFIL_PERSONALIZADO ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <SlidersHorizontal className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">Personalizado</span>
                        </button>
                        {perfisFiltradosForm.map(p => {
                          const concedivel = p.modulos.every(m => podeConceder(m.modulo, m.nivel))
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={!concedivel}
                              title={concedivel ? p.descricao ?? '' : 'Este perfil tem acessos que você não possui'}
                              onClick={() => setForm(f => ({ ...f, perfil_acesso_id: p.id }))}
                              className={`flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                form.perfil_acesso_id === p.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
                              }`}
                            >
                              {p.global ? <Globe className="h-4 w-4 flex-shrink-0" /> : <Layers className="h-4 w-4 flex-shrink-0" />}
                              <span className="font-medium truncate">{p.nome}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Módulos */}
                    <div className="space-y-2">
                      <Label className="text-sm">
                        {perfilSelecionado ? `Módulos do perfil "${perfilSelecionado.nome}"` : 'Módulos de acesso'}
                      </Label>
                      <GradeModulos
                        valor={modulosEfetivos}
                        onChange={modulos => setForm(f => ({ ...f, modulos }))}
                        podeConceder={podeConceder}
                        somenteLeitura={!!perfilSelecionado}
                      />
                    </div>

                    {/* Turmas */}
                    {'chamada' in modulosEfetivos && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Turmas Permitidas na Chamada</Label>
                          {turmasDoForm.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setForm(f => ({
                                ...f,
                                turmas: f.turmas.length === turmasDoForm.length ? [] : turmasDoForm.map(t => t.id),
                              }))}
                              className="text-xs text-primary hover:underline"
                            >
                              {form.turmas.length === turmasDoForm.length ? 'Desmarcar todas' : 'Selecionar todas'}
                            </button>
                          )}
                        </div>
                        {turmasDoForm.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhuma turma cadastrada nesta congregação.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {turmasDoForm.map(t => {
                              const ativo = form.turmas.includes(t.id)
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => toggleTurma(t.id)}
                                  className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-all ${
                                    ativo ? 'border-blue-500/50 bg-blue-500/5 text-blue-600' : 'border-border text-muted-foreground hover:border-blue-500/30'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    ativo ? 'border-blue-500 bg-blue-500' : 'border-muted-foreground/40'
                                  }`}>
                                    {ativo && <span className="text-[9px] text-white font-bold">✓</span>}
                                  </div>
                                  {t.nome}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : editMode ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Perfil de acesso ─── */}
      <Dialog open={perfilDialog} onOpenChange={setPerfilDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{perfilForm.id ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}</DialogTitle>
            <DialogDescription>Defina quais módulos o perfil libera e com qual nível.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={perfilForm.nome} onChange={e => setPerfilForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Somente Escala" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={perfilForm.descricao} onChange={e => setPerfilForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" />
            </div>
            {isAdminGeral && !perfilForm.id && (
              <label className="flex items-start gap-2 rounded-lg border p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={perfilForm.global}
                  onChange={e => setPerfilForm(f => ({ ...f, global: e.target.checked }))}
                />
                <span className="text-sm">
                  <span className="font-medium flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Perfil global</span>
                  <span className="text-xs text-muted-foreground">
                    Disponível para todas as congregações. Desmarcado, fica restrito a {congregacaoAtiva?.nome}.
                  </span>
                </span>
              </label>
            )}
            <div className="space-y-2">
              <Label>Módulos *</Label>
              <GradeModulos
                valor={perfilForm.modulos}
                onChange={modulos => setPerfilForm(f => ({ ...f, modulos }))}
                podeConceder={podeConceder}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPerfilDialog(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSalvarPerfil} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Perfil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!perfilExcluir} onOpenChange={v => { if (!v) setPerfilExcluir(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Perfil</DialogTitle>
            <DialogDescription>
              Excluir o perfil <strong>{perfilExcluir?.nome}</strong>? Perfis em uso não podem ser excluídos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPerfilExcluir(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluirPerfil}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

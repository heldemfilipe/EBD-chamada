"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Shield, Users, UserCheck, Edit, Power, Trash2,
  LayoutDashboard, GraduationCap, BookOpen, ClipboardCheck,
  CalendarDays, BarChart3, Eye, EyeOff, Loader2, Key, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { buscarTurmasDisponiveis } from '@/actions/relatorios'
import { toast } from '@/lib/toast';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ModuloPermissao {
  modulo: string
  nivel: 'ver' | 'editar'
}

interface UsuarioDB {
  id: string
  nome: string
  email: string
  role: 'admin' | 'usuario'
  ativo: boolean
  created_at: string
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
]

function getInitials(nome: string) {
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [usuarios, setUsuarios] = useState<UsuarioDB[]>([])
  const [turmasOpcoes, setTurmasOpcoes] = useState<TurmaOpcao[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UsuarioDB | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<UsuarioDB | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state — modulos agora e Record<modulo, nivel>
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'usuario' as 'admin' | 'usuario',
    modulos: {} as Record<string, 'ver' | 'editar'>,
    turmas: [] as string[],
  })

  // Redirecionar se não for admin
  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/dashboard')
  }, [isAdmin, authLoading])

  // Carregar dados
  useEffect(() => {
    if (!isAdmin) return
    fetchUsuarios()
    fetchTurmas()
  }, [isAdmin])

  async function fetchUsuarios() {
    setLoadingData(true)
    const res = await fetch('/api/usuarios')
    if (res.ok) setUsuarios(await res.json())
    setLoadingData(false)
  }

  async function fetchTurmas() {
    try {
      const turmas = await buscarTurmasDisponiveis()
      setTurmasOpcoes(turmas)
    } catch (e) {
      console.error('Erro ao carregar turmas:', e)
    }
  }

  function abrirCriar() {
    setEditMode(false)
    setSelectedUser(null)
    setForm({ nome: '', email: '', senha: '', role: 'usuario', modulos: {}, turmas: [] })
    setShowPassword(false)
    setDialogOpen(true)
  }

  function abrirEditar(u: UsuarioDB) {
    setEditMode(true)
    setSelectedUser(u)
    // Converter array de {modulo, nivel} para Record
    const modulosRecord: Record<string, 'ver' | 'editar'> = {}
    for (const m of u.modulos) {
      modulosRecord[m.modulo] = (m.nivel ?? 'editar') as 'ver' | 'editar'
    }
    setForm({
      nome: u.nome,
      email: u.email,
      senha: '',
      role: u.role,
      modulos: modulosRecord,
      turmas: u.turmas.map(t => t.id),
    })
    setShowPassword(false)
    setDialogOpen(true)
  }

  function toggleModulo(modulo: string) {
    setForm(f => {
      const novo = { ...f.modulos }
      if (modulo in novo) {
        delete novo[modulo]
      } else {
        novo[modulo] = 'editar' // padrao ao ativar
      }
      return { ...f, modulos: novo }
    })
  }

  function setNivelModulo(modulo: string, nivel: 'ver' | 'editar') {
    setForm(f => ({
      ...f,
      modulos: { ...f.modulos, [modulo]: nivel },
    }))
  }

  function toggleTurma(turmaId: string) {
    setForm(f => ({
      ...f,
      turmas: f.turmas.includes(turmaId)
        ? f.turmas.filter(t => t !== turmaId)
        : [...f.turmas, turmaId],
    }))
  }

  function selecionarTodosModulos() {
    setForm(f => {
      const totalAtivos = Object.keys(f.modulos).length
      if (totalAtivos === MODULOS_INFO.length) {
        return { ...f, modulos: {} }
      }
      const todos: Record<string, 'ver' | 'editar'> = {}
      MODULOS_INFO.forEach(m => { todos[m.id] = f.modulos[m.id] ?? 'editar' })
      return { ...f, modulos: todos }
    })
  }

  function selecionarTodasTurmas() {
    setForm(f => ({
      ...f,
      turmas: f.turmas.length === turmasOpcoes.length
        ? []
        : turmasOpcoes.map(t => t.id),
    }))
  }

  async function handleSalvar() {
    if (!form.nome || !form.email) { toast('Nome e e-mail são obrigatórios.', 'error'); return }
    if (!editMode && !form.senha) { toast('Senha é obrigatória para novos usuários.', 'error'); return }

    setSaving(true)

    // Converter Record para array de {modulo, nivel}
    const modulosArray = form.role === 'admin'
      ? []
      : Object.entries(form.modulos).map(([modulo, nivel]) => ({ modulo, nivel }))

    const payload = {
      id: selectedUser?.id,
      nome: form.nome,
      email: form.email,
      senha: form.senha || undefined,
      novaSenha: editMode && form.senha ? form.senha : undefined,
      role: form.role,
      modulos: modulosArray,
      turmas: form.role === 'admin' ? [] : form.turmas,
      ativo: selectedUser?.ativo ?? true,
    }

    const res = await fetch('/api/usuarios', {
      method: editMode ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json()
      toast(err.error || 'Erro ao salvar usuário.', 'error')
      setSaving(false)
      return
    }

    await fetchUsuarios()
    setDialogOpen(false)
    setSaving(false)
  }

  async function handleToggleAtivo(u: UsuarioDB) {
    const confirmar = confirm(
      u.ativo
        ? `Desativar acesso de "${u.nome}"?`
        : `Reativar acesso de "${u.nome}"?`
    )
    if (!confirmar) return

    const res = await fetch('/api/usuarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: u.id,
        nome: u.nome,
        role: u.role,
        ativo: !u.ativo,
        modulos: u.modulos, // ja vem como {modulo, nivel}[] da API
        turmas: u.turmas.map(t => t.id),
      }),
    })

    if (res.ok) fetchUsuarios()
  }

  async function handleApagar() {
    if (!deleteDialog) return
    setDeleting(true)
    const res = await fetch(`/api/usuarios?id=${deleteDialog.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast(`Usuário "${deleteDialog.nome}" apagado com sucesso.`, 'success')
      await fetchUsuarios()
    } else {
      const err = await res.json()
      toast(err.error || 'Erro ao apagar usuário.', 'error')
    }
    setDeleteDialog(null)
    setDeleting(false)
  }

  // Stats
  const totalAtivos  = usuarios.filter(u => u.ativo).length
  const totalAdmins  = usuarios.filter(u => u.role === 'admin' && u.ativo).length
  const totalColabs  = usuarios.filter(u => u.role === 'usuario' && u.ativo).length

  if (authLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  if (!isAdmin) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie acessos e permissões do sistema</p>
        </div>
        <Button onClick={abrirCriar}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Total Ativos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalAtivos}</div><p className="text-xs text-muted-foreground">Usuários com acesso</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Administradores</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{totalAdmins}</div><p className="text-xs text-muted-foreground">Acesso total ao sistema</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><UserCheck className="h-4 w-4 text-green-500" />Colaboradores</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{totalColabs}</div><p className="text-xs text-muted-foreground">Acesso personalizado</p></CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="hidden lg:table-cell">Módulos / Turmas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Nenhum usuário cadastrado ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map(u => (
                      <TableRow key={u.id} className={!u.ativo ? 'opacity-50' : ''}>
                        {/* Avatar + Nome + Email */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              u.role === 'admin'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {getInitials(u.nome)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{u.nome}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          {u.role === 'admin' ? (
                            <Badge className="bg-primary/15 text-primary border-primary/30 gap-1 text-xs">
                              <Shield className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Colaborador
                            </Badge>
                          )}
                        </TableCell>

                        {/* Módulos + Turmas */}
                        <TableCell className="hidden lg:table-cell">
                          {u.role === 'admin' ? (
                            <span className="text-xs text-muted-foreground italic">Acesso total</span>
                          ) : (
                            <div className="space-y-1">
                              {u.modulos.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {u.modulos.map(m => {
                                    const info = MODULOS_INFO.find(x => x.id === m.modulo)
                                    return info ? (
                                      <span key={m.modulo} className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${
                                        m.nivel === 'ver'
                                          ? 'bg-amber-500/10 text-amber-600'
                                          : 'bg-muted text-muted-foreground'
                                      }`}>
                                        <info.icon className="h-2.5 w-2.5" />
                                        {info.label}
                                        {m.nivel === 'ver' && <Eye className="h-2.5 w-2.5 ml-0.5" />}
                                      </span>
                                    ) : null
                                  })}
                                </div>
                              )}
                              {u.turmas.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {u.turmas.map(t => (
                                    <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                                      {t.nome}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {u.modulos.length === 0 && u.turmas.length === 0 && (
                                <span className="text-xs text-muted-foreground italic">Sem permissões</span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {u.ativo ? (
                            <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">Ativo</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
                          )}
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => abrirEditar(u)} title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleAtivo(u)}
                              title={u.ativo ? 'Desativar' : 'Reativar'}
                              className={u.ativo ? 'hover:text-destructive' : 'hover:text-green-600'}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDialog(u)}
                              title="Apagar usuário"
                              className="hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Dialog Confirmar Exclusão ─── */}
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
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  deleteDialog.role === 'admin'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
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
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleApagar} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Apagando...</> : 'Apagar Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Criar / Editar ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editMode
                ? 'Atualize os dados e permissões do usuário.'
                : 'Preencha os dados para criar o acesso.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Dados básicos */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  disabled={editMode} // e-mail não pode ser alterado
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label>
                {editMode ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
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
                  <Key className="h-3 w-3" />
                  Preencha apenas se quiser redefinir a senha.
                </p>
              )}
            </div>

            {/* Função */}
            <div className="space-y-2">
              <Label>Função / Permissão</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: 'admin' }))}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                    form.role === 'admin'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className={`h-5 w-5 ${form.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-semibold text-sm">Administrador</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Acesso total: todas as abas, todas as turmas e gerencia usuários.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: 'usuario' }))}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                    form.role === 'usuario'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className={`h-5 w-5 ${form.role === 'usuario' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-semibold text-sm">Colaborador</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Acesso limitado às abas e turmas que você definir abaixo.
                  </p>
                </button>
              </div>
            </div>

            {/* Permissões (apenas para colaborador) */}
            {form.role === 'usuario' && (
              <>
                {/* Módulos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Modulos de Acesso</Label>
                    <button
                      type="button"
                      onClick={selecionarTodosModulos}
                      className="text-xs text-primary hover:underline"
                    >
                      {Object.keys(form.modulos).length === MODULOS_INFO.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MODULOS_INFO.map(m => {
                      const ativo = m.id in form.modulos
                      const nivel = form.modulos[m.id]
                      const Icon = m.icon
                      return (
                        <div key={m.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleModulo(m.id)}
                            className={`w-full flex items-center gap-2.5 p-3 rounded-lg border text-sm font-medium transition-all ${
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
                              <button
                                type="button"
                                onClick={() => setNivelModulo(m.id, 'ver')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                                  nivel === 'ver'
                                    ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <Eye className="h-3 w-3" />
                                Visualizar
                              </button>
                              <button
                                type="button"
                                onClick={() => setNivelModulo(m.id, 'editar')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                                  nivel === 'editar'
                                    ? 'bg-green-500/15 text-green-600 border border-green-500/30'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <Edit className="h-3 w-3" />
                                Editar
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Turmas */}
                {'chamada' in form.modulos && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Turmas Permitidas na Chamada</Label>
                      <button
                        type="button"
                        onClick={selecionarTodasTurmas}
                        className="text-xs text-primary hover:underline"
                      >
                        {form.turmas.length === turmasOpcoes.length ? 'Desmarcar todas' : 'Selecionar todas'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {turmasOpcoes.map(t => {
                        const ativo = form.turmas.includes(t.id)
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTurma(t.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-all ${
                              ativo
                                ? 'border-blue-500/50 bg-blue-500/5 text-blue-600'
                                : 'border-border text-muted-foreground hover:border-blue-500/30'
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
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : editMode ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

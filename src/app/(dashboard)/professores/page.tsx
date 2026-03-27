"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { StatCard } from '@/components/ui/stat-card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Edit, Trash2, Phone, Mail, Calendar, GraduationCap, BookOpen, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CARGOS, getCargo } from '@/lib/constants'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Professor {
  id: string; nome: string; especialidade: string; turmas: string[]
  turmaAluno: string | null; telefone: string; email: string; dataIngresso: string; cargo: string
}
interface Turma { id: string; nome: string }

const FORM_VAZIO = { nome: '', telefone: '', email: '', especialidade: '', turmas: [] as string[], turmaAluno: null as string | null, cargo: '' }

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ProfessoresPage() {
  const db = supabase as any

  const [professores, setProfessores] = useState<Professor[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'nome' | 'turmas'>('nome')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Professor | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [isSaving, setIsSaving] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    async function load() {
      try {
        const [{ data: profsData }, { data: turmasData }] = await Promise.all([
          db.from('professores').select('id, nome, especialidade, telefone, email, data_ingresso, turma_aluno_id, cargo, professor_turmas(turma_id)').eq('ativo', true).order('nome'),
          db.from('turmas').select('id, nome').eq('ativa', true).order('nome'),
        ])
        if (cancelado) return
        setProfessores((profsData ?? []).map((p: any) => ({
          id: p.id, nome: p.nome, especialidade: p.especialidade ?? '', telefone: p.telefone ?? '',
          email: p.email ?? '', dataIngresso: p.data_ingresso ?? new Date().toISOString().split('T')[0],
          turmaAluno: p.turma_aluno_id ?? null, turmas: (p.professor_turmas ?? []).map((pt: any) => pt.turma_id),
          cargo: p.cargo ?? '',
        })))
        setTurmas(turmasData ?? [])
      } catch (e: any) {
        if (!cancelado) toast('Erro ao carregar professores: ' + (e?.message ?? 'erro inesperado'), 'error')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    load()
    return () => { cancelado = true }
  }, [])

  function handleSort(key: 'nome' | 'turmas') {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const filtered = professores
    .filter(p =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.especialidade.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'turmas') return (a.turmas.length - b.turmas.length) * dir
      return a.nome.localeCompare(b.nome, 'pt-BR') * dir
    })

  const getTurmasNomes = (ids: string[]) => turmas.filter(t => ids.includes(t.id)).map(t => t.nome)
  const getTurmaNome = (id: string | null) => id ? (turmas.find(t => t.id === id)?.nome ?? '—') : '—'
  const toggleTurma = (id: string) => setForm(prev => ({ ...prev, turmas: prev.turmas.includes(id) ? prev.turmas.filter(x => x !== id) : [...prev.turmas, id] }))

  function openDialog(professor?: Professor) {
    if (professor) {
      setEditMode(true); setSelected(professor)
      setForm({ nome: professor.nome, telefone: professor.telefone, email: professor.email, especialidade: professor.especialidade, turmas: professor.turmas, turmaAluno: professor.turmaAluno, cargo: professor.cargo ?? '' })
    } else {
      setEditMode(false); setSelected(null); setForm(FORM_VAZIO)
    }
    setDialogOpen(true)
  }

  function closeDialog() { setDialogOpen(false); setEditMode(false); setSelected(null); setForm(FORM_VAZIO) }

  async function sincronizarAluno(profId: string, nome: string, turmaAluno: string | null) {
    const marcador = `professor:${profId}`
    const { data: existente } = await db.from('alunos').select('id').eq('responsavel', marcador).maybeSingle()
    if (turmaAluno) {
      if (existente) await db.from('alunos').update({ nome, turma_id: turmaAluno, ativo: true }).eq('id', existente.id)
      else           await db.from('alunos').insert({ nome, turma_id: turmaAluno, responsavel: marcador, ativo: true })
    } else if (existente) {
      await db.from('alunos').delete().eq('id', existente.id)
    }
  }

  // Salva cargo no professor e sincroniza com o aluno correspondente (se existir)
  async function salvarCargoProf(profId: string, cargo: string) {
    await Promise.all([
      db.from('professores').update({ cargo: cargo || null }).eq('id', profId),
      db.from('alunos').update({ cargo: cargo || null }).eq('responsavel', `professor:${profId}`),
    ])
  }

  async function handleSave() {
    if (!form.nome) { toast('Por favor, preencha o nome do professor.', 'error'); return }
    if (isSaving) return
    setIsSaving(true)
    try {
      const payloadBase = { nome: form.nome, telefone: form.telefone, email: form.email, especialidade: form.especialidade, turma_aluno_id: form.turmaAluno }
      if (editMode && selected) {
        const { error } = await db.from('professores').update(payloadBase).eq('id', selected.id)
        if (error) { toast('Erro ao atualizar professor.', 'error'); return }
        await Promise.all([
          salvarCargoProf(selected.id, form.cargo),
          (async () => {
            await db.from('professor_turmas').delete().eq('professor_id', selected.id)
            if (form.turmas.length > 0) await db.from('professor_turmas').insert(form.turmas.map((tid: string) => ({ professor_id: selected.id, turma_id: tid })))
          })(),
          sincronizarAluno(selected.id, form.nome, form.turmaAluno),
        ])
        setProfessores(professores.map(p => p.id === selected.id ? { ...p, ...payloadBase, turmaAluno: form.turmaAluno, turmas: form.turmas, cargo: form.cargo } : p))
        toast('Professor atualizado com sucesso!')
      } else {
        const { data, error } = await db.from('professores').insert({ ...payloadBase, data_ingresso: new Date().toISOString().split('T')[0] }).select('id').single()
        if (error || !data) { toast('Erro ao cadastrar professor.', 'error'); return }
        await salvarCargoProf(data.id, form.cargo)
        if (form.turmas.length > 0) await db.from('professor_turmas').insert(form.turmas.map((tid: string) => ({ professor_id: data.id, turma_id: tid })))
        await sincronizarAluno(data.id, form.nome, form.turmaAluno)
        setProfessores([...professores, { id: data.id, nome: form.nome, telefone: form.telefone, email: form.email, especialidade: form.especialidade, turmas: form.turmas, turmaAluno: form.turmaAluno, cargo: form.cargo, dataIngresso: new Date().toISOString().split('T')[0] }])
        toast('Professor cadastrado com sucesso!')
      }
      closeDialog()
    } catch (e: any) {
      toast('Erro ao salvar professor: ' + (e?.message ?? 'erro inesperado'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    await db.from('alunos').delete().eq('responsavel', `professor:${selected.id}`)
    const { error } = await db.from('professores').delete().eq('id', selected.id)
    if (error) { toast('Erro ao excluir professor.', 'error'); return }
    setProfessores(professores.filter(p => p.id !== selected.id))
    toast('Professor excluído com sucesso!')
    setDeleteOpen(false); setSelected(null)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (carregando) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <div className="h-8 w-10 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Professores</h1>
          <p className="text-muted-foreground mt-2">Gerencie os professores da Escola Bíblica Dominical</p>
        </div>
        <Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-2" />Novo Professor</Button>
      </div>

      {/* Stats Mobile */}
      <div className="sm:hidden rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y">
          <div className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-muted"><Users className="h-4 w-4 text-muted-foreground" /></div>
            <div><p className="text-xl font-bold">{professores.length}</p><p className="text-xs text-muted-foreground">Professores</p></div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-muted"><GraduationCap className="h-4 w-4 text-muted-foreground" /></div>
            <div><p className="text-xl font-bold">{professores.reduce((a, p) => a + p.turmas.length, 0)}</p><p className="text-xs text-muted-foreground">Atribuições</p></div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-muted"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>
            <div><p className="text-xl font-bold">{professores.filter(p => p.turmaAluno !== null).length}</p><p className="text-xs text-muted-foreground">Tb. Alunos</p></div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-muted"><Search className="h-4 w-4 text-muted-foreground" /></div>
            <div><p className="text-xl font-bold">{new Set(professores.map(p => p.especialidade).filter(Boolean)).size}</p><p className="text-xs text-muted-foreground">Especialidades</p></div>
          </div>
        </div>
      </div>

      {/* Stats Desktop */}
      <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Professores" value={professores.length} icon={Users} description="Ativos no sistema" />
        <StatCard title="Atribuições" value={professores.reduce((a, p) => a + p.turmas.length, 0)} icon={GraduationCap} description="Turmas lecionadas" />
        <StatCard title="Também Alunos" value={professores.filter(p => p.turmaAluno !== null).length} icon={BookOpen} description="Matriculados em turma" />
        <StatCard title="Especialidades" value={new Set(professores.map(p => p.especialidade).filter(Boolean)).size} description="Diferentes áreas" />
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Professores</CardTitle>
          <CardDescription>Visualize e gerencie todos os professores cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, especialidade ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          {/* Controles de sort para mobile */}
          <div className="flex flex-wrap gap-1.5 sm:hidden mb-2">
            <span className="text-xs text-muted-foreground self-center">Ordenar:</span>
            {(['nome', 'turmas'] as const).map(key => (
              <button key={key} onClick={() => handleSort(key)}
                className={cn('px-2.5 py-1 rounded text-xs font-medium border transition-all',
                  sortKey === key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground border-border')}>
                {key === 'nome' ? 'Nome' : 'Turmas'}
                {sortKey === key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </button>
            ))}
          </div>

          {/* Lista mobile */}
          <div className="sm:hidden space-y-3 mt-2">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Nenhum professor encontrado</p>
            ) : filtered.map((prof) => {
              const cargoInfo = getCargo(prof.cargo)
              const turmasNomesList = getTurmasNomes(prof.turmas)
              return (
                <div key={prof.id} className="rounded-xl border bg-card overflow-hidden">
                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{prof.nome}</span>
                        {cargoInfo && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                            style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}>
                            {cargoInfo.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        Desde {new Date(prof.dataIngresso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                        {prof.especialidade && <span className="ml-1 truncate">· {prof.especialidade}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(prof)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(prof); setDeleteOpen(true) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  {/* Turmas */}
                  <div className="px-4 pb-3">
                    <div className="flex items-start gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      {turmasNomesList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {turmasNomesList.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem turma atribuída</span>
                      )}
                    </div>
                  </div>
                  {/* Rodapé: turma aluno + contato */}
                  {(prof.turmaAluno || prof.telefone || prof.email) && (
                    <div className="border-t bg-muted/30 px-4 py-2 flex flex-wrap gap-x-4 gap-y-1">
                      {prof.turmaAluno && (
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Aluno em</span>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px] py-0 px-1.5">{getTurmaNome(prof.turmaAluno)}</Badge>
                        </div>
                      )}
                      {prof.telefone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{prof.telefone}
                        </div>
                      )}
                      {prof.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{prof.email}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => handleSort('nome')} className="flex items-center font-semibold hover:text-foreground transition-colors">
                      Nome <SortIcon col="nome" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Especialidade</TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('turmas')} className="flex items-center font-semibold hover:text-foreground transition-colors">
                      <GraduationCap className="h-3 w-3 mr-1" />Leciona em <SortIcon col="turmas" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell"><div className="flex items-center gap-1"><BookOpen className="h-3 w-3" />Aluno em</div></TableHead>
                  <TableHead className="hidden lg:table-cell">Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((prof) => (
                  <TableRow key={prof.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{prof.nome}</span>
                        {(() => {
                          const c = getCargo(prof.cargo)
                          return c ? (
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                              style={{ backgroundColor: c.bg, color: c.color, borderColor: c.border }}
                            >
                              {c.label}
                            </span>
                          ) : null
                        })()}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        Desde {new Date(prof.dataIngresso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                      </div>
                      {/* Contato visível apenas no mobile */}
                      <div className="flex flex-col gap-0.5 mt-1 lg:hidden">
                        {prof.telefone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{prof.telefone}</div>}
                        {prof.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{prof.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {prof.especialidade ? <Badge variant="outline">{prof.especialidade}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {prof.turmas.length > 0
                          ? getTurmasNomes(prof.turmas).map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)
                          : <span className="text-xs text-muted-foreground">Nenhuma</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {prof.turmaAluno
                        ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">{getTurmaNome(prof.turmaAluno)}</Badge>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm"><Phone className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{prof.telefone || '—'}</span></div>
                        <div className="flex items-center gap-2 text-sm"><Mail className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{prof.email || '—'}</span></div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(prof)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelected(prof); setDeleteOpen(true) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum professor encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Professor' : 'Novo Professor'}</DialogTitle>
            <DialogDescription>{editMode ? 'Atualize as informações do professor abaixo.' : 'Preencha os dados do novo professor.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Digite o nome completo" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="especialidade">Especialidade</Label>
              <Input id="especialidade" value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} placeholder="Ex: Estudos Bíblicos, Teologia, etc." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cargo">Cargo Eclesiástico</Label>
              <Select value={form.cargo || 'nenhum'} onValueChange={(v) => setForm({ ...form, cargo: v === 'nenhum' ? '' : v })}>
                <SelectTrigger id="cargo"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {CARGOS.map((c) => <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.cargo && getCargo(form.cargo) && (() => {
                const c = getCargo(form.cargo)!
                return (
                  <span className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{ backgroundColor: c.bg, color: c.color, borderColor: c.border }}>
                    {c.label}
                  </span>
                )
              })()}
            </div>
            <div className="grid gap-3">
              <Label className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />Turmas que leciona</Label>
              <div className="border rounded-lg p-4 space-y-3 max-h-[180px] overflow-y-auto">
                {turmas.length > 0 ? turmas.map((t) => (
                  <div key={t.id} className="flex items-center space-x-2">
                    <Checkbox id={`leciona-${t.id}`} checked={form.turmas.includes(t.id)} onCheckedChange={() => toggleTurma(t.id)} />
                    <Label htmlFor={`leciona-${t.id}`} className="text-sm font-normal cursor-pointer">{t.nome}</Label>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhuma turma disponível</p>}
              </div>
              <p className="text-xs text-muted-foreground">Selecione as turmas em que este professor irá lecionar</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="turmaAluno" className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Turma em que é aluno</Label>
              <Select value={form.turmaAluno !== null ? String(form.turmaAluno) : 'nenhuma'} onValueChange={(v) => setForm({ ...form, turmaAluno: v === 'nenhuma' ? null : v })}>
                <SelectTrigger id="turmaAluno"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Não é aluno</SelectItem>
                  {turmas.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selecione a turma em que este professor também participa como aluno</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editMode ? 'Salvar Alterações' : 'Cadastrar Professor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={<>Tem certeza que deseja excluir o professor <strong>{selected?.nome}</strong>? Esta ação não pode ser desfeita.</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}

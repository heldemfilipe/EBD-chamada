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
import { Plus, Search, Edit, Trash2, Phone, Mail, Calendar, GraduationCap, BookOpen, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CARGOS, getCargo } from '@/lib/constants'
import { toast } from '@/lib/toast'

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Professor | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)

  useEffect(() => {
    async function load() {
      const [{ data: profsData }, { data: turmasData }] = await Promise.all([
        db.from('professores').select('id, nome, especialidade, telefone, email, data_ingresso, turma_aluno_id, cargo, professor_turmas(turma_id)').eq('ativo', true).order('nome'),
        db.from('turmas').select('id, nome').eq('ativa', true).order('nome'),
      ])
      setProfessores((profsData ?? []).map((p: any) => ({
        id: p.id, nome: p.nome, especialidade: p.especialidade ?? '', telefone: p.telefone ?? '',
        email: p.email ?? '', dataIngresso: p.data_ingresso ?? new Date().toISOString().split('T')[0],
        turmaAluno: p.turma_aluno_id ?? null, turmas: (p.professor_turmas ?? []).map((pt: any) => pt.turma_id),
        cargo: p.cargo ?? '',
      })))
      setTurmas(turmasData ?? [])
    }
    load()
  }, [])

  const filtered = professores.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.especialidade.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

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
  async function tentarSalvarCargo(profId: string, cargo: string) {
    try {
      await db.from('professores').update({ cargo: cargo || null }).eq('id', profId)
    } catch (_) { /* coluna ainda não criada */ }
    try {
      // Atualiza o cargo no registro de aluno vinculado ao professor
      await db.from('alunos').update({ cargo: cargo || null }).eq('responsavel', `professor:${profId}`)
    } catch (_) { /* sem aluno vinculado ou coluna não criada */ }
  }

  async function handleSave() {
    if (!form.nome) { toast('Por favor, preencha o nome do professor.', 'error'); return }

    // Payload sem cargo para não quebrar se a coluna não existir
    const payloadBase = { nome: form.nome, telefone: form.telefone, email: form.email, especialidade: form.especialidade, turma_aluno_id: form.turmaAluno }

    if (editMode && selected) {
      const { error } = await db.from('professores').update(payloadBase).eq('id', selected.id)
      if (error) { toast('Erro ao atualizar professor.', 'error'); return }
      await tentarSalvarCargo(selected.id, form.cargo)
      await db.from('professor_turmas').delete().eq('professor_id', selected.id)
      if (form.turmas.length > 0) await db.from('professor_turmas').insert(form.turmas.map((tid: string) => ({ professor_id: selected.id, turma_id: tid })))
      await sincronizarAluno(selected.id, form.nome, form.turmaAluno)
      setProfessores(professores.map(p => p.id === selected.id ? { ...p, ...payloadBase, turmaAluno: form.turmaAluno, turmas: form.turmas, cargo: form.cargo } : p))
      toast('Professor atualizado com sucesso!')
    } else {
      const { data, error } = await db.from('professores').insert({ ...payloadBase, data_ingresso: new Date().toISOString().split('T')[0] }).select('id').single()
      if (error || !data) { toast('Erro ao cadastrar professor.', 'error'); return }
      await tentarSalvarCargo(data.id, form.cargo)
      if (form.turmas.length > 0) await db.from('professor_turmas').insert(form.turmas.map((tid: string) => ({ professor_id: data.id, turma_id: tid })))
      await sincronizarAluno(data.id, form.nome, form.turmaAluno)
      setProfessores([...professores, { id: data.id, nome: form.nome, telefone: form.telefone, email: form.email, especialidade: form.especialidade, turmas: form.turmas, turmaAluno: form.turmaAluno, cargo: form.cargo, dataIngresso: new Date().toISOString().split('T')[0] }])
      toast('Professor cadastrado com sucesso!')
    }
    closeDialog()
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead><div className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />Leciona em</div></TableHead>
                  <TableHead><div className="flex items-center gap-1"><BookOpen className="h-3 w-3" />Aluno em</div></TableHead>
                  <TableHead>Contato</TableHead>
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
                    </TableCell>
                    <TableCell>
                      {prof.especialidade ? <Badge variant="outline">{prof.especialidade}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {prof.turmas.length > 0
                          ? getTurmasNomes(prof.turmas).map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)
                          : <span className="text-xs text-muted-foreground">Nenhuma</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {prof.turmaAluno
                        ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">{getTurmaNome(prof.turmaAluno)}</Badge>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave}>{editMode ? 'Salvar Alterações' : 'Cadastrar Professor'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir o professor <strong>{selected?.nome}</strong>? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

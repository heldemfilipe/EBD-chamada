"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { StatCard } from '@/components/ui/stat-card'
import { PresenceBar } from '@/components/ui/presence-bar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Edit, Trash2, Phone, Mail, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Aluno {
  id: string
  nome: string
  idade: number
  turma: string
  turmaId: string | null
  telefone: string
  email: string
  dataNascimento: string
  responsavel: string
  presenca: number
  status: string
  isProfessor: boolean
}

interface Turma { id: string; nome: string; faixaEtaria: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcularIdade(dataNascimento: string): number {
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

const FAIXAS = [
  { label: 'Cordeirinhos', desc: 'Até 5 anos',          faixa: 'Até 5 anos',           color: 'text-purple-500' },
  { label: 'Guerreiros',   desc: '6 a 11 anos',         faixa: '6 a 11 anos',           color: 'text-orange-500' },
  { label: 'Adolescentes', desc: '11 a 15 anos',        faixa: '11 a 15 anos',          color: 'text-yellow-500' },
  { label: 'Jovens',       desc: 'A partir de 16 anos', faixa: 'A partir de 16 anos',   color: 'text-green-500' },
  { label: 'Adultos',      desc: 'A partir de 18 anos', faixa: 'A partir de 18 anos',   color: 'text-blue-500' },
]

const FORM_VAZIO = { nome: '', dataNascimento: '', telefone: '', email: '', responsavel: '', turmaId: '' }

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AlunosPage() {
  const db = supabase as any

  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [search, setSearch] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Aluno | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)

  useEffect(() => {
    async function load() {
      const anoAtual = new Date().getFullYear()
      const [{ data: turmasData }, { data: alunosData }, { data: chamadasData }] = await Promise.all([
        db.from('turmas').select('id, nome, faixa_etaria').eq('ativa', true).order('nome'),
        db.from('alunos').select('id, nome, data_nascimento, telefone, email, responsavel, turma_id').order('nome'),
        db.from('chamadas').select('id').eq('ano', anoAtual),
      ])

      setTurmas((turmasData ?? []).map((t: any) => ({ id: t.id, nome: t.nome, faixaEtaria: t.faixa_etaria ?? '' })))

      // Calcular presença real de cada aluno no ano corrente
      const presencaMap: Record<string, { presentes: number; total: number }> = {}
      const chamadaIds = (chamadasData ?? []).map((c: any) => c.id)
      if (chamadaIds.length > 0) {
        const { data: presencas } = await db
          .from('presencas').select('aluno_id, presente').in('chamada_id', chamadaIds)
        for (const p of presencas ?? []) {
          if (!presencaMap[p.aluno_id]) presencaMap[p.aluno_id] = { presentes: 0, total: 0 }
          presencaMap[p.aluno_id].total++
          if (p.presente) presencaMap[p.aluno_id].presentes++
        }
      }

      setAlunos((alunosData ?? []).map((a: any) => {
        const pm = presencaMap[a.id]
        const presenca = pm ? Math.round((pm.presentes / pm.total) * 100) : 0
        return {
          id: a.id, nome: a.nome, turmaId: a.turma_id ?? null, turma: '',
          telefone: a.telefone ?? '', email: a.email ?? '',
          dataNascimento: a.data_nascimento ?? '', responsavel: a.responsavel ?? '',
          presenca, status: 'ativo',
          idade: a.data_nascimento ? calcularIdade(a.data_nascimento) : 0,
          isProfessor: (a.responsavel ?? '').startsWith('professor:'),
        }
      }))
    }
    load()
  }, [])

  const filtered = alunos.filter(a => {
    const matchSearch = a.nome.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
    const matchTurma  = turmaFilter === 'all' || a.turmaId === turmaFilter
    return matchSearch && matchTurma
  })

  const faixaPorTurma: Record<string, string> = {}
  for (const t of turmas) faixaPorTurma[t.id] = t.faixaEtaria

  function openDialog(aluno?: Aluno) {
    if (aluno) {
      setEditMode(true); setSelected(aluno)
      setForm({ nome: aluno.nome, dataNascimento: aluno.dataNascimento, telefone: aluno.telefone, email: aluno.email, responsavel: aluno.responsavel, turmaId: aluno.turmaId ?? '' })
    } else {
      setEditMode(false); setSelected(null); setForm(FORM_VAZIO)
    }
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false); setEditMode(false); setSelected(null); setForm(FORM_VAZIO)
  }

  async function handleSave() {
    if (!form.nome) { toast('Por favor, preencha o nome do aluno.', 'error'); return }
    const idade     = form.dataNascimento ? calcularIdade(form.dataNascimento) : 0
    const turmaNome = turmas.find(t => t.id === form.turmaId)?.nome ?? ''
    const payload   = { nome: form.nome, data_nascimento: form.dataNascimento || null, telefone: form.telefone, email: form.email, responsavel: form.responsavel, turma_id: form.turmaId || null }

    if (editMode && selected) {
      const { error } = await db.from('alunos').update(payload).eq('id', selected.id)
      if (error) { toast('Erro ao atualizar aluno.', 'error'); return }
      setAlunos(alunos.map(a => a.id === selected.id ? { ...a, ...payload, turmaId: form.turmaId || null, turma: turmaNome, idade, isProfessor: false } : a))
      toast('Aluno atualizado com sucesso!')
    } else {
      const { data, error } = await db.from('alunos').insert(payload).select('id').single()
      if (error || !data) { toast('Erro ao cadastrar aluno.', 'error'); return }
      setAlunos([...alunos, { id: data.id, nome: form.nome, idade, turma: turmaNome, turmaId: form.turmaId || null, telefone: form.telefone, email: form.email, dataNascimento: form.dataNascimento, responsavel: form.responsavel, presenca: 0, status: 'ativo', isProfessor: false }])
      toast('Aluno cadastrado com sucesso!')
    }
    closeDialog()
  }

  async function handleDelete() {
    if (!selected) return
    const { error } = await db.from('alunos').delete().eq('id', selected.id)
    if (error) { toast('Erro ao excluir aluno.', 'error'); return }
    setAlunos(alunos.filter(a => a.id !== selected.id))
    toast('Aluno excluído com sucesso!')
    setDeleteOpen(false); setSelected(null)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground mt-2">Gerencie os alunos da Escola Bíblica Dominical</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />Novo Aluno
        </Button>
      </div>

      {/* Stats por faixa etária */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Total" value={alunos.length} icon={Users} description="Ativos no sistema" />
        {FAIXAS.map((f) => (
          <StatCard
            key={f.faixa}
            title={f.label}
            value={alunos.filter(a => a.turmaId && faixaPorTurma[a.turmaId] === f.faixa).length}
            description={f.desc}
            valueClassName={f.color}
          />
        ))}
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
          <CardDescription>Visualize e gerencie todos os alunos cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Idade</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden md:table-cell">Presença</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((aluno) => (
                    <TableRow key={aluno.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{aluno.nome}</span>
                          {aluno.isProfessor && <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">Professor</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{aluno.idade > 0 ? `${aluno.idade} anos` : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{turmas.find(t => t.id === aluno.turmaId)?.nome ?? '—'}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm"><Phone className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{aluno.telefone || '—'}</span></div>
                          <div className="flex items-center gap-2 text-sm"><Mail className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{aluno.email || '—'}</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <PresenceBar pct={aluno.presenca} className="max-w-[100px]" />
                          <span className="text-sm font-medium">{aluno.presenca}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {aluno.isProfessor ? (
                            <span className="text-xs text-muted-foreground italic">Gerenciar em Professores</span>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openDialog(aluno)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setSelected(aluno); setDeleteOpen(true) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
            <DialogDescription>{editMode ? 'Atualize as informações do aluno abaixo.' : 'Preencha os dados do novo aluno.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Digite o nome completo" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataNascimento">Data de Nascimento</Label>
              <Input id="dataNascimento" type="date" value={form.dataNascimento} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} />
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
              <Label htmlFor="responsavel">Responsável</Label>
              <Input id="responsavel" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do responsável" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="turma">Turma</Label>
              <Select value={form.turmaId} onValueChange={(v) => setForm({ ...form, turmaId: v })}>
                <SelectTrigger id="turma"><SelectValue placeholder="Selecione uma turma" /></SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave}>{editMode ? 'Salvar Alterações' : 'Cadastrar Aluno'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir o aluno <strong>{selected?.nome}</strong>? Esta ação não pode ser desfeita.</DialogDescription>
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

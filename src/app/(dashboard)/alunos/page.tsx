"use client"

import { useState, useEffect, useMemo } from 'react'
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
import { Plus, Search, Edit, Trash2, Phone, Mail, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { buscarAlunosComTurmas, salvarAluno, excluirAluno } from '@/actions/alunos'
import { MESES, TRIMESTRES, BG_TO_HEX, CARGOS, getCargo } from '@/lib/constants'
import { toast } from '@/lib/toast'
import { cn, calcularIdade } from '@/lib/utils'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'

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
  cargo: string
  presenca: number
  status: string
  isProfessor: boolean
}

interface Turma { id: string; nome: string; faixaEtaria: string; cor: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FAIXAS = [
  { label: 'Crianças',     desc: 'Até 7 anos',           faixa: 'Até 7 anos',          color: 'text-purple-500' },
  { label: 'Juniores',     desc: '8 a 10 anos',          faixa: '8 a 10 anos',         color: 'text-orange-500' },
  { label: 'Pré-Adol.',    desc: '11 a 13 anos',        faixa: '11 a 13 anos',        color: 'text-pink-500'   },
  { label: 'Adolescentes', desc: '14 a 16 anos',        faixa: '14 a 16 anos',        color: 'text-yellow-500' },
  { label: 'Jovens',       desc: '17 a 25 anos',        faixa: '17 a 25 anos',        color: 'text-green-500'  },
  { label: 'Adultos',      desc: 'A partir de 26 anos', faixa: 'A partir de 26 anos', color: 'text-blue-500'   },
]


const FORM_VAZIO = { nome: '', dataNascimento: '', telefone: '', email: '', responsavel: '', turmaId: '', cargo: '' }

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [search, setSearch] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Aluno | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)

  // Ordenação da tabela
  const [sortKey, setSortKey] = useState<'nome' | 'idade' | 'presenca' | 'turma'>('nome')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [isSaving, setIsSaving] = useState(false)
  const [carregando, setCarregando] = useState(true)

  function handleSort(key: 'nome' | 'idade' | 'presenca' | 'turma') {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: 'nome' | 'idade' | 'presenca' | 'turma' }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />
  }

  // Filtro de período para presença
  const [periodoPresenca, setPeriodoPresenca] = useState<'ano' | 'mes' | 'trimestre'>('ano')
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [trimFiltro, setTrimFiltro] = useState(Math.floor(new Date().getMonth() / 3))
  const [presencasMap, setPresencasMap] = useState<Record<string, { total: number; presentes: number }>>({})

  useEffect(() => {
    let cancelado = false
    async function load() {
      try {
        const anoAtual = new Date().getFullYear()
        const { turmas: turmasData, alunos: alunosData, presencasMap: presencasData } = await buscarAlunosComTurmas(anoAtual)
        if (cancelado) return

        setTurmas(turmasData.map((t: any) => ({
          id: t.id, nome: t.nome, faixaEtaria: t.faixa_etaria ?? '', cor: t.cor ?? '',
        })))

        setPresencasMap(presencasData)

        setAlunos(alunosData.map((a: any) => ({
          id: a.id, nome: a.nome, turmaId: a.turma_id ?? null, turma: '',
          telefone: a.telefone ?? '', email: a.email ?? '',
          dataNascimento: a.data_nascimento ?? '', responsavel: a.responsavel ?? '',
          cargo: a.cargo ?? '', presenca: 0, status: 'ativo',
          idade: a.data_nascimento ? (calcularIdade(a.data_nascimento) ?? 0) : 0,
          isProfessor: (a.responsavel ?? '').startsWith('professor:'),
        })))
      } catch (e: any) {
        if (!cancelado) toast('Erro ao carregar alunos: ' + (e?.message ?? 'erro inesperado'), 'error')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    load()
    return () => { cancelado = true }
  }, [])

  const turmaMap = useMemo(() => {
    const m: Record<string, Turma> = {}
    for (const t of turmas) m[t.id] = t
    return m
  }, [turmas])

  const filtered = useMemo(() => {
    return alunos
      .filter(a => {
        const matchSearch = a.nome.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
        const matchTurma  = turmaFilter === 'all' || a.turmaId === turmaFilter
        return matchSearch && matchTurma
      })
      .map(a => {
        const pm = presencasMap[a.id]
        return { ...a, presenca: pm && pm.total > 0 ? Math.round((pm.presentes / pm.total) * 100) : 0 }
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'nome')     cmp = a.nome.localeCompare(b.nome, 'pt-BR')
        if (sortKey === 'idade')    cmp = a.idade - b.idade
        if (sortKey === 'presenca') cmp = a.presenca - b.presenca
        if (sortKey === 'turma') {
          const ta = turmaMap[a.turmaId ?? '']?.nome ?? ''
          const tb = turmaMap[b.turmaId ?? '']?.nome ?? ''
          cmp = ta.localeCompare(tb, 'pt-BR')
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [alunos, search, turmaFilter, presencasMap, sortKey, sortDir, turmaMap])

  const faixaPorTurma = useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of turmas) m[t.id] = t.faixaEtaria
    return m
  }, [turmas])

  function openDialog(aluno?: Aluno) {
    if (aluno) {
      setEditMode(true); setSelected(aluno)
      setForm({
        nome: aluno.nome, dataNascimento: aluno.dataNascimento,
        telefone: aluno.telefone, email: aluno.email,
        responsavel: aluno.responsavel, turmaId: aluno.turmaId ?? '',
        cargo: aluno.cargo ?? '',
      })
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
    if (isSaving) return
    setIsSaving(true)
    try {
      const idade     = form.dataNascimento ? (calcularIdade(form.dataNascimento) ?? 0) : 0
      const turmaNome = turmas.find(t => t.id === form.turmaId)?.nome ?? ''
      const dados = {
        ...(editMode && selected ? { id: selected.id } : {}),
        nome: form.nome,
        data_nascimento: form.dataNascimento || null,
        telefone: form.telefone || null,
        turma_id: form.turmaId || null,
        ativo: true,
        responsavel: form.responsavel || null,
        cargo: form.cargo || null,
      }
      const result = await salvarAluno(dados)
      if (!result.success) {
        toast(editMode ? 'Erro ao atualizar aluno.' : 'Erro ao cadastrar aluno.', 'error')
        return
      }
      if (editMode && selected) {
        setAlunos(alunos.map(a => a.id === selected.id
          ? { ...a, nome: form.nome, turmaId: form.turmaId || null, turma: turmaNome, cargo: form.cargo ?? '', idade, telefone: form.telefone, email: form.email, dataNascimento: form.dataNascimento, responsavel: form.responsavel, isProfessor: false }
          : a))
        toast('Aluno atualizado com sucesso!')
      } else {
        setAlunos([...alunos, {
          id: result.id!, nome: form.nome, idade, turma: turmaNome,
          turmaId: form.turmaId || null, telefone: form.telefone,
          email: form.email, dataNascimento: form.dataNascimento,
          responsavel: form.responsavel, cargo: form.cargo ?? '',
          presenca: 0, status: 'ativo', isProfessor: false,
        }])
        toast('Aluno cadastrado com sucesso!')
      }
      closeDialog()
    } catch (e: any) {
      toast('Erro ao salvar aluno: ' + (e?.message ?? 'erro inesperado'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    const result = await excluirAluno(selected.id)
    if (!result.success) { toast('Erro ao excluir aluno.', 'error'); return }
    setAlunos(alunos.filter(a => a.id !== selected.id))
    toast('Aluno excluído com sucesso!')
    setDeleteOpen(false); setSelected(null)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (carregando) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-9 w-28 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            <div className="h-8 w-10 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {[...Array(6)].map((_, i) => (
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
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

          {/* Filtro de período para a coluna Presença */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-muted/40 border">
            <span className="text-xs text-muted-foreground font-medium mr-1">Presença:</span>
            {(['ano', 'mes', 'trimestre'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodoPresenca(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  periodoPresenca === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground border hover:bg-muted'
                }`}
              >
                {p === 'ano' ? 'Ano todo' : p === 'mes' ? 'Por mês' : 'Por trimestre'}
              </button>
            ))}
            {periodoPresenca === 'mes' && (
              <Select value={String(mesFiltro)} onValueChange={v => setMesFiltro(Number(v))}>
                <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {periodoPresenca === 'trimestre' && (
              <Select value={String(trimFiltro)} onValueChange={v => setTrimFiltro(Number(v))}>
                <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIMESTRES.map((t, i) => <SelectItem key={i} value={String(i)}>{t.label} ({t.desc})</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Controles de sort para mobile */}
          <div className="flex flex-wrap gap-1.5 md:hidden mb-2">
            <span className="text-xs text-muted-foreground self-center">Ordenar:</span>
            {(['nome', 'turma', 'presenca'] as const).map(key => (
              <button key={key} onClick={() => handleSort(key)}
                className={cn('px-2.5 py-1 rounded text-xs font-medium border transition-all',
                  sortKey === key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground border-border')}>
                {key === 'nome' ? 'Nome' : key === 'turma' ? 'Turma' : 'Presença'}
                {sortKey === key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </button>
            ))}
          </div>

          {/* Mobile: lista de cards compactos */}
          <div className="md:hidden space-y-3">
            {filtered.length > 0 ? filtered.map((aluno) => {
              const turmaObj = aluno.turmaId ? turmaMap[aluno.turmaId] : null
              const turmaCor = turmaObj?.cor ? (BG_TO_HEX[turmaObj.cor] ?? null) : null
              const cargoInfo = getCargo(aluno.cargo)
              return (
                <div key={aluno.id} className="rounded-xl border bg-card overflow-hidden">
                  {/* Nome + badges + ações */}
                  <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm">{aluno.nome}</span>
                        {aluno.isProfessor && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-400">Professor</Badge>
                        )}
                        {cargoInfo && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                            style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}
                          >
                            {cargoInfo.label}
                          </span>
                        )}
                      </div>
                      {turmaObj && (
                        <Badge
                          variant="secondary"
                          className="mt-1.5 text-xs"
                          style={turmaCor ? {
                            backgroundColor: turmaCor + '25', color: turmaCor,
                            borderColor: turmaCor + '55', borderWidth: '1px', borderStyle: 'solid',
                          } : undefined}
                        >
                          {turmaObj.nome}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {aluno.isProfessor ? (
                        <span className="text-[10px] text-muted-foreground italic pr-1">em Professores</span>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(aluno)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(aluno); setDeleteOpen(true) }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Stats row: idade + presença */}
                  <div className="grid grid-cols-3 gap-0 border-t">
                    <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                      <span className="text-[10px] text-muted-foreground mb-0.5">Idade</span>
                      <span className="text-sm font-bold">{aluno.idade > 0 ? `${aluno.idade}a` : '—'}</span>
                    </div>
                    <div className="flex flex-col justify-center py-2 px-3 col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Presença</span>
                        <span className="text-sm font-bold">{aluno.presenca}%</span>
                      </div>
                      <PresenceBar pct={aluno.presenca} />
                    </div>
                  </div>
                  {/* Contato */}
                  {(aluno.telefone || aluno.email) && (
                    <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
                      {aluno.telefone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{aluno.telefone}</span>
                        </div>
                      )}
                      {aluno.email && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{aluno.email}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }) : (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhum aluno encontrado</div>
            )}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => handleSort('nome')} className="flex items-center font-semibold hover:text-foreground transition-colors">
                      Nome <SortIcon col="nome" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <button onClick={() => handleSort('idade')} className="flex items-center font-semibold hover:text-foreground transition-colors">
                      Idade <SortIcon col="idade" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('turma')} className="flex items-center font-semibold hover:text-foreground transition-colors">
                      Turma <SortIcon col="turma" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <button onClick={() => handleSort('presenca')} className="flex items-center font-semibold hover:text-foreground transition-colors">
                      Presença <SortIcon col="presenca" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((aluno) => {
                    const turmaObj = aluno.turmaId ? turmaMap[aluno.turmaId] : null
                    const turmaCor = turmaObj?.cor ? (BG_TO_HEX[turmaObj.cor] ?? null) : null
                    const cargoInfo = getCargo(aluno.cargo)
                    return (
                      <TableRow key={aluno.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{aluno.nome}</span>
                            {aluno.isProfessor && (
                              <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">Professor</Badge>
                            )}
                            {cargoInfo && (
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                                style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}
                              >
                                {cargoInfo.label}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{aluno.idade > 0 ? `${aluno.idade} anos` : '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={turmaCor ? {
                              backgroundColor: turmaCor + '25',
                              color: turmaCor,
                              borderColor: turmaCor + '55',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                            } : undefined}
                          >
                            {turmaObj?.nome ?? '—'}
                          </Badge>
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
                    )
                  })
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
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
            <div className="grid gap-2">
              <Label htmlFor="cargo">Cargo Eclesiástico</Label>
              <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v === 'nenhum' ? '' : v })}>
                <SelectTrigger id="cargo"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {CARGOS.map((c) => (
                    <SelectItem key={c.label} value={c.label}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Preview do cargo selecionado */}
              {form.cargo && getCargo(form.cargo) && (() => {
                const c = getCargo(form.cargo)!
                return (
                  <span
                    className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{ backgroundColor: c.bg, color: c.color, borderColor: c.border }}
                  >
                    {c.label}
                  </span>
                )
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editMode ? 'Salvar Alterações' : 'Cadastrar Aluno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={<>Tem certeza que deseja excluir o aluno <strong>{selected?.nome}</strong>? Esta ação não pode ser desfeita.</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}

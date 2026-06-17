"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Users, GraduationCap, Edit, Trash2, Eye, UserPlus, Loader2 } from 'lucide-react'
import { buscarTurmasDetalhadas, salvarTurma, excluirTurma, buscarDetalhesTurma, buscarAlunosSemTurma, matricularAluno } from '@/actions/turmas'
import { StatCard } from '@/components/ui/stat-card'
import { PresenceBar } from '@/components/ui/presence-bar'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { CARGOS, getCargo } from '@/lib/constants'
import { toast } from '@/lib/toast'
import { calcularIdade } from '@/lib/utils'

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface Turma {
  id: string
  nome: string
  faixaEtaria: string
  idadeMin: number | null
  idadeMax: number | null
  totalAlunos: number
  sala: string
  cor: string
  descricao: string
}

interface Professor {
  id: string
  nome: string
  turma_ids: string[]
}

interface AlunoDetalhe {
  id: string
  nome: string
  idade: number
  presenca: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Constantes ───────────────────────────────────────────────────────────────
const coresDisponiveis = [
  { value: 'bg-yellow-500', label: 'Amarelo' },
  { value: 'bg-orange-500', label: 'Laranja' },
  { value: 'bg-blue-500',   label: 'Azul' },
  { value: 'bg-purple-500', label: 'Roxo' },
  { value: 'bg-green-500',  label: 'Verde' },
  { value: 'bg-teal-500',   label: 'Verde-azulado' },
  { value: 'bg-red-500',    label: 'Vermelho' },
  { value: 'bg-pink-500',   label: 'Rosa' },
]

const faixasEtarias = [
  { value: 'Até 7 anos',          label: 'Crianças — Até 7 anos',            min: 0,  max: 7   },
  { value: '8 a 10 anos',         label: 'Juniores — 8 a 10 anos',           min: 8,  max: 10  },
  { value: '11 a 13 anos',        label: 'Pré-Adolescentes — 11 a 13 anos',  min: 11, max: 13  },
  { value: '14 a 16 anos',        label: 'Adolescentes — 14 a 16 anos',      min: 14, max: 16  },
  { value: '17 a 25 anos',        label: 'Jovens — 17 a 25 anos',            min: 17, max: 25  },
  { value: 'A partir de 26 anos', label: 'Adultos — A partir de 26 anos',    min: 26, max: 999 },
]

const ENROLL_FORM_VAZIO = { nome: '', dataNascimento: '', telefone: '', cargo: '' }

// ─── Componente ───────────────────────────────────────────────────────────────
export default function TurmasPage() {
  // ── Estado principal ──
  const [turmasData, setTurmasData]         = useState<Turma[]>([])
  const [professoresMock, setProfessoresMock] = useState<Professor[]>([])
  const [carregando, setCarregando]         = useState(true)

  // ── CRUD turma ──
  const [dialogOpen, setDialogOpen]         = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode, setEditMode]             = useState(false)
  const [selectedTurma, setSelectedTurma]   = useState<Turma | null>(null)
  const [formData, setFormData] = useState({
    nome: '', descricao: '', faixaEtaria: '', idadeMin: '', idadeMax: '', sala: '', cor: 'bg-blue-500',
  })

  // ── Modal de detalhes ──
  const [detailOpen, setDetailOpen]         = useState(false)
  const [detailAlunos, setDetailAlunos]     = useState<AlunoDetalhe[]>([])
  const [detailLoading, setDetailLoading]   = useState(false)

  // ── Matricular aluno ──
  const [enrollOpen, setEnrollOpen]         = useState(false)
  const [enrollTab, setEnrollTab]           = useState<'novo' | 'existente'>('novo')
  const [alunosSemTurma, setAlunosSemTurma] = useState<{ id: string; nome: string }[]>([])
  const [enrollForm, setEnrollForm]         = useState(ENROLL_FORM_VAZIO)
  const [enrollSelectedId, setEnrollSelectedId] = useState('')
  const [enrollLoading, setEnrollLoading]   = useState(false)

  // ─── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false
    async function fetchDados() {
      try {
        const { turmas, professores } = await buscarTurmasDetalhadas()
        if (cancelado) return

        setTurmasData(turmas.map(t => ({
          id: t.id, nome: t.nome, descricao: t.descricao ?? '',
          faixaEtaria: t.faixa_etaria ?? '',
          idadeMin: t.idade_min ?? null, idadeMax: t.idade_max ?? null,
          sala: t.sala ?? '',
          cor: t.cor ?? 'bg-blue-500', totalAlunos: t.totalAlunos,
        })))
        setProfessoresMock(professores)
      } catch (e: any) {
        if (!cancelado) toast('Erro ao carregar turmas: ' + (e?.message ?? 'erro inesperado'), 'error')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    fetchDados()
    return () => { cancelado = true }
  }, [])

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getProfessoresDaTurma = useCallback((turmaId: string): string[] =>
    professoresMock
      .filter(p => p.turma_ids.includes(turmaId))
      .map(p => p.nome),
  [professoresMock])

  const totalAlunos = useMemo(() => turmasData.reduce((acc, t) => acc + t.totalAlunos, 0), [turmasData])
  const mediaAlunos = useMemo(() => turmasData.length > 0 ? Math.round(totalAlunos / turmasData.length) : 0, [turmasData, totalAlunos])

  // ─── Handlers: CRUD turma ─────────────────────────────────────────────────
  function handleOpenDialog(turma?: Turma) {
    if (turma) {
      setEditMode(true); setSelectedTurma(turma)
      setFormData({
        nome: turma.nome, descricao: turma.descricao, faixaEtaria: turma.faixaEtaria,
        idadeMin: turma.idadeMin != null ? String(turma.idadeMin) : '',
        idadeMax: turma.idadeMax != null ? String(turma.idadeMax) : '',
        sala: turma.sala, cor: turma.cor,
      })
    } else {
      setEditMode(false); setSelectedTurma(null)
      setFormData({ nome: '', descricao: '', faixaEtaria: '', idadeMin: '', idadeMax: '', sala: '', cor: 'bg-blue-500' })
    }
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false); setEditMode(false); setSelectedTurma(null)
    setFormData({ nome: '', descricao: '', faixaEtaria: '', idadeMin: '', idadeMax: '', sala: '', cor: 'bg-blue-500' })
  }

  async function handleSaveTurma() {
    if (!formData.nome) { toast('Por favor, preencha o nome da turma.', 'error'); return }
    const idadeMin = formData.idadeMin !== '' ? parseInt(formData.idadeMin) : null
    const idadeMax = formData.idadeMax !== '' ? parseInt(formData.idadeMax) : null
    const resultado = await salvarTurma({
      id: editMode && selectedTurma ? selectedTurma.id : undefined,
      nome: formData.nome, descricao: formData.descricao,
      faixa_etaria: formData.faixaEtaria,
      idade_min: idadeMin, idade_max: idadeMax,
      sala: formData.sala, cor: formData.cor,
    })
    if (!resultado.success) {
      toast(editMode ? 'Erro ao atualizar turma.' : 'Erro ao cadastrar turma.', 'error')
      return
    }
    if (editMode && selectedTurma) {
      setTurmasData(turmasData.map(t =>
        t.id === selectedTurma.id
          ? { ...t, nome: formData.nome, descricao: formData.descricao, faixaEtaria: formData.faixaEtaria, idadeMin, idadeMax, sala: formData.sala, cor: formData.cor }
          : t
      ))
      toast('Turma atualizada com sucesso!')
    } else {
      setTurmasData([...turmasData, {
        id: resultado.id!, nome: formData.nome, descricao: formData.descricao,
        faixaEtaria: formData.faixaEtaria, idadeMin, idadeMax,
        sala: formData.sala, cor: formData.cor, totalAlunos: 0,
      }])
      toast('Turma cadastrada com sucesso!')
    }
    handleCloseDialog()
  }

  async function handleDeleteTurma() {
    if (!selectedTurma) return
    const resultado = await excluirTurma(selectedTurma.id)
    if (!resultado.success) { toast('Erro ao excluir turma.', 'error'); return }
    setTurmasData(turmasData.filter(t => t.id !== selectedTurma.id))
    toast('Turma excluída com sucesso!')
    setDeleteDialogOpen(false); setSelectedTurma(null)
  }

  // ─── Handlers: Modal de detalhes ──────────────────────────────────────────
  async function handleViewDetail(turma: Turma) {
    setSelectedTurma(turma)
    setDetailAlunos([])
    setDetailOpen(true)
    setDetailLoading(true)

    const anoAtual = new Date().getFullYear()
    const { alunos, presencasMap } = await buscarDetalhesTurma(turma.id, anoAtual)

    setDetailAlunos(alunos.map(a => {
      const pm = presencasMap[a.id]
      return {
        id: a.id,
        nome: a.nome,
        idade: a.data_nascimento ? (calcularIdade(a.data_nascimento) ?? 0) : 0,
        presenca: pm ? Math.round((pm.presentes / pm.total) * 100) : 0,
      }
    }))
    setDetailLoading(false)
  }

  // ─── Handlers: Matrícula ──────────────────────────────────────────────────
  async function handleOpenEnroll() {
    setEnrollForm(ENROLL_FORM_VAZIO)
    setEnrollSelectedId('')
    setEnrollTab('novo')
    const dados = await buscarAlunosSemTurma()
    setAlunosSemTurma(dados)
    setEnrollOpen(true)
  }

  async function handleEnrollNovo() {
    if (!enrollForm.nome || !selectedTurma) { toast('Preencha o nome do aluno.', 'error'); return }
    setEnrollLoading(true)
    const resultado = await matricularAluno({
      turma_id: selectedTurma.id,
      nome: enrollForm.nome,
      data_nascimento: enrollForm.dataNascimento || null,
      telefone: enrollForm.telefone || null,
    })
    setEnrollLoading(false)
    if (!resultado.success) { toast('Erro ao matricular aluno.', 'error'); return }

    const novoAluno: AlunoDetalhe = {
      id: resultado.id!, nome: enrollForm.nome,
      idade: enrollForm.dataNascimento ? (calcularIdade(enrollForm.dataNascimento) ?? 0) : 0,
      presenca: 0,
    }
    setDetailAlunos(prev => [...prev, novoAluno].sort((a, b) => a.nome.localeCompare(b.nome)))
    setTurmasData(prev => prev.map(t => t.id === selectedTurma.id ? { ...t, totalAlunos: t.totalAlunos + 1 } : t))
    setEnrollOpen(false)
    toast('Aluno matriculado com sucesso!')
  }

  async function handleEnrollExistente() {
    if (!enrollSelectedId || !selectedTurma) { toast('Selecione um aluno.', 'error'); return }
    setEnrollLoading(true)
    const resultado = await matricularAluno({ id: enrollSelectedId, turma_id: selectedTurma.id })
    setEnrollLoading(false)
    if (!resultado.success) { toast('Erro ao matricular aluno.', 'error'); return }

    const alunoSelecionado = alunosSemTurma.find(a => a.id === enrollSelectedId)
    if (alunoSelecionado) {
      const novoAluno: AlunoDetalhe = { id: alunoSelecionado.id, nome: alunoSelecionado.nome, idade: 0, presenca: 0 }
      setDetailAlunos(prev => [...prev, novoAluno].sort((a, b) => a.nome.localeCompare(b.nome)))
      setAlunosSemTurma(prev => prev.filter(a => a.id !== enrollSelectedId))
      setTurmasData(prev => prev.map(t => t.id === selectedTurma.id ? { ...t, totalAlunos: t.totalAlunos + 1 } : t))
    }
    setEnrollOpen(false)
    toast('Aluno matriculado com sucesso!')
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (carregando) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-28 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-9 w-28 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-10 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 h-40 bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Turmas</h1>
          <p className="text-muted-foreground mt-2">Gerencie as turmas da Escola Bíblica Dominical</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />Nova Turma
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Turmas"  value={turmasData.length} icon={GraduationCap} description="Em funcionamento" />
        <StatCard title="Total de Alunos"  value={totalAlunos}       icon={Users}         description="Em todas as turmas" />
        <StatCard title="Média por Turma"  value={mediaAlunos}                            description="Alunos/turma" />
        <StatCard title="Faixas Etárias"   value={new Set(turmasData.map(t => t.faixaEtaria)).size} description="Diferentes grupos" />
      </div>

      {/* Turmas Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {turmasData.map((turma) => (
          <Card key={turma.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className={`h-2 ${turma.cor}`} />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{turma.nome}</CardTitle>
                  <CardDescription>{turma.descricao}</CardDescription>
                </div>
                <Badge variant="secondary" className="ml-2 whitespace-nowrap">{turma.faixaEtaria}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Professores */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <GraduationCap className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Professor(es)</p>
                  {getProfessoresDaTurma(turma.id).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {getProfessoresDaTurma(turma.id).map((prof, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{prof}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem professor</p>
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{turma.totalAlunos} alunos</p>
                    <p className="text-xs text-muted-foreground">Matriculados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{turma.sala || '—'}</p>
                    <p className="text-xs text-muted-foreground">Local</p>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => handleViewDetail(turma)}>
                  <Eye className="h-4 w-4 mr-2" />Ver Turma
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(turma)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setSelectedTurma(turma); setDeleteDialogOpen(true) }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Dialog: Detalhes da Turma ─────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedTurma && <div className={`w-3 h-3 rounded-full ${selectedTurma.cor}`} />}
              <DialogTitle>{selectedTurma?.nome}</DialogTitle>
            </div>
            <DialogDescription>
              {selectedTurma?.faixaEtaria} · {selectedTurma?.sala}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Professores */}
            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />Professor(es)
              </p>
              {selectedTurma && getProfessoresDaTurma(selectedTurma.id).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {getProfessoresDaTurma(selectedTurma.id).map((prof, i) => (
                    <Badge key={i} variant="secondary">{prof}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum professor atribuído</p>
              )}
            </div>

            {/* Alunos */}
            <div className="rounded-lg border">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Alunos matriculados
                  <Badge variant="secondary" className="ml-1">{detailAlunos.length}</Badge>
                </p>
                <Button size="sm" onClick={handleOpenEnroll} className="h-7 text-xs">
                  <UserPlus className="h-3.5 w-3.5 mr-1" />Matricular
                </Button>
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : detailAlunos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum aluno matriculado nesta turma.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[400px]">
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-center w-20">Idade</TableHead>
                        <TableHead className="text-center w-36">Presença (ano)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailAlunos.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.nome}</TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {a.idade > 0 ? `${a.idade} anos` : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-center">
                              <PresenceBar pct={a.presenca} className="max-w-[70px]" />
                              <span className="text-xs font-semibold w-8">{a.presenca}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Matricular Aluno ──────────────────────────────────────────── */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />Matricular Aluno
            </DialogTitle>
            <DialogDescription>
              Adicionar aluno à turma <strong>{selectedTurma?.nome}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg border bg-muted/30">
            {(['novo', 'existente'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setEnrollTab(tab)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  enrollTab === tab
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'novo' ? 'Novo Aluno' : 'Aluno Existente'}
              </button>
            ))}
          </div>

          {enrollTab === 'novo' ? (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="enroll-nome">Nome Completo *</Label>
                <Input
                  id="enroll-nome"
                  value={enrollForm.nome}
                  onChange={(e) => setEnrollForm({ ...enrollForm, nome: e.target.value })}
                  placeholder="Digite o nome do aluno"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="enroll-nasc">Data de Nascimento</Label>
                <Input
                  id="enroll-nasc"
                  type="date"
                  value={enrollForm.dataNascimento}
                  onChange={(e) => setEnrollForm({ ...enrollForm, dataNascimento: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="enroll-tel">Telefone</Label>
                <Input
                  id="enroll-tel"
                  value={enrollForm.telefone}
                  onChange={(e) => setEnrollForm({ ...enrollForm, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="enroll-cargo">Cargo Eclesiástico</Label>
                <Select value={enrollForm.cargo || 'nenhum'} onValueChange={(v) => setEnrollForm({ ...enrollForm, cargo: v === 'nenhum' ? '' : v })}>
                  <SelectTrigger id="enroll-cargo"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {CARGOS.map((c) => <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {enrollForm.cargo && getCargo(enrollForm.cargo) && (() => {
                  const c = getCargo(enrollForm.cargo)!
                  return (
                    <span className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{ backgroundColor: c.bg, color: c.color, borderColor: c.border }}>
                      {c.label}
                    </span>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecione um aluno sem turma para matricular nesta turma.
              </p>
              {alunosSemTurma.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4 border rounded-lg">
                  Nenhum aluno sem turma encontrado.
                </p>
              ) : (
                <Select value={enrollSelectedId} onValueChange={setEnrollSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno..." />
                  </SelectTrigger>
                  <SelectContent>
                    {alunosSemTurma.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)} disabled={enrollLoading}>
              Cancelar
            </Button>
            <Button
              onClick={enrollTab === 'novo' ? handleEnrollNovo : handleEnrollExistente}
              disabled={enrollLoading || (enrollTab === 'existente' && !enrollSelectedId)}
            >
              {enrollLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Matricular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Adicionar/Editar Turma ───────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Atualize as informações da turma abaixo.' : 'Preencha os dados da nova turma.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome da Turma *</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Crianças - Pequeninos" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descrição breve da turma" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faixaEtaria">Faixa Etária</Label>
              <Select
                value={formData.faixaEtaria}
                onValueChange={(v) => {
                  const faixa = faixasEtarias.find(f => f.value === v)
                  setFormData({
                    ...formData, faixaEtaria: v,
                    idadeMin: faixa ? String(faixa.min) : formData.idadeMin,
                    idadeMax: faixa ? String(faixa.max) : formData.idadeMax,
                  })
                }}
              >
                <SelectTrigger id="faixaEtaria"><SelectValue placeholder="Selecione a faixa etária" /></SelectTrigger>
                <SelectContent>
                  {faixasEtarias.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="idadeMin">Idade mínima</Label>
                <Input
                  id="idadeMin"
                  type="number"
                  min={0}
                  max={150}
                  value={formData.idadeMin}
                  onChange={(e) => setFormData({ ...formData, idadeMin: e.target.value })}
                  placeholder="Ex: 0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="idadeMax">Idade máxima</Label>
                <Input
                  id="idadeMax"
                  type="number"
                  min={0}
                  max={999}
                  value={formData.idadeMax}
                  onChange={(e) => setFormData({ ...formData, idadeMax: e.target.value })}
                  placeholder="Ex: 12"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sala">Sala</Label>
              <Input id="sala" value={formData.sala} onChange={(e) => setFormData({ ...formData, sala: e.target.value })} placeholder="Ex: Sala 1, Auditório" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cor">Cor Identificadora</Label>
              <Select value={formData.cor} onValueChange={(v) => setFormData({ ...formData, cor: v })}>
                <SelectTrigger id="cor"><SelectValue placeholder="Selecione uma cor" /></SelectTrigger>
                <SelectContent>
                  {coresDisponiveis.map((cor) => (
                    <SelectItem key={cor.value} value={cor.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${cor.value}`} />
                        {cor.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSaveTurma}>{editMode ? 'Salvar Alterações' : 'Cadastrar Turma'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        description={<>Tem certeza que deseja excluir a turma <strong>{selectedTurma?.nome}</strong>? Esta ação não pode ser desfeita.</>}
        onConfirm={handleDeleteTurma}
      />
    </div>
  )
}

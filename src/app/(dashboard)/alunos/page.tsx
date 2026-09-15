"use client"

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { StatCard } from '@/components/ui/stat-card'
import { PresenceBar } from '@/components/ui/presence-bar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, Search, Edit, UserX, UserCheck, Phone, Mail, Users, GraduationCap, AlertTriangle, CalendarX2, Cake, History,
  CheckCircle2, XCircle, Book, BookOpen,
} from 'lucide-react'
import { buscarAlunosComTurmas, salvarAluno, definirAtivoAluno } from '@/actions/alunos'
import { promoverAlunoParaProfessor } from '@/actions/professores'
import { MESES, TRIMESTRES, BG_TO_HEX, CARGOS, ANOS_DISPONIVEIS, getCargo } from '@/lib/constants'
import { toast } from '@/lib/toast'
import { cn, calcularIdade } from '@/lib/utils'
import { corTextoPresenca } from '@/lib/presence'
import { criarRotuloNome, normalizarNome, sequenciaFaltas } from '@/lib/relatorio-utils'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { useTableSort } from '@/hooks/useTableSort'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AlunoBase {
  id: string
  nome: string
  idade: number | null
  turmaId: string | null
  telefone: string
  email: string
  dataNascimento: string
  responsavel: string
  cargo: string
  ativo: boolean
  isProfessor: boolean
}

interface Turma { id: string; nome: string; faixaEtaria: string; cor: string; idadeMin: number | null; idadeMax: number | null }
interface Chamada { id: string; data: string; turmaId: string | null }
interface Registro { alunoId: string; chamadaId: string; presente: boolean; biblia: boolean; revista: boolean }

type Pendencia = 'todas' | 'sem_nascimento' | 'fora_faixa' | 'faltas'

// ─── Constantes ───────────────────────────────────────────────────────────────
const FAIXAS = [
  { label: 'Crianças',     desc: 'Até 7 anos',          faixa: 'Até 7 anos',          color: 'text-purple-500' },
  { label: 'Juniores',     desc: '8 a 10 anos',         faixa: '8 a 10 anos',         color: 'text-orange-500' },
  { label: 'Pré-Adol.',    desc: '11 a 13 anos',        faixa: '11 a 13 anos',        color: 'text-pink-500'   },
  { label: 'Adolescentes', desc: '14 a 16 anos',        faixa: '14 a 16 anos',        color: 'text-yellow-500' },
  { label: 'Jovens',       desc: '17 a 25 anos',        faixa: '17 a 25 anos',        color: 'text-green-500'  },
  { label: 'Adultos',      desc: 'A partir de 26 anos', faixa: 'A partir de 26 anos', color: 'text-blue-500'   },
]

const FORM_VAZIO = { nome: '', dataNascimento: '', telefone: '', email: '', responsavel: '', turmaId: '', cargo: '' }
const LIMITE_FALTAS = 3

const fmtData = (iso: string | null) => (iso ? format(parseISO(iso), 'dd/MM/yyyy') : '—')
const faixaTexto = (t: Turma) => t.idadeMax !== null && t.idadeMax >= 150 ? `${t.idadeMin ?? 0}+` : `${t.idadeMin ?? 0}–${t.idadeMax ?? '?'}`

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AlunosPage() {
  const [alunos, setAlunos] = useState<AlunoBase[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [chamadas, setChamadas] = useState<Chamada[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'ativos' | 'inativos' | 'todos'>('ativos')
  const [pendencia, setPendencia] = useState<Pendencia>('todas')
  const [mostrarProfessores, setMostrarProfessores] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [periodoPresenca, setPeriodoPresenca] = useState<'ano' | 'mes' | 'trimestre'>('ano')
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [trimFiltro, setTrimFiltro] = useState(Math.floor(new Date().getMonth() / 3))
  const { sortKey, sortDir, handleSort, SortIcon } = useTableSort<'nome' | 'idade' | 'presenca' | 'turma' | 'faltas'>('nome')

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false)
  const [desativarOpen, setDesativarOpen] = useState(false)
  const [promoverOpen, setPromoverOpen] = useState(false)
  const [historicoId, setHistoricoId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<AlunoBase | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [isSaving, setIsSaving] = useState(false)
  const [promovendo, setPromovendo] = useState(false)

  // ─── Carga (recarrega ao trocar o ano) ─────────────────────────────────────
  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    buscarAlunosComTurmas(ano)
      .then(dados => {
        if (cancelado) return
        setTurmas(dados.turmas.map((t: any) => ({
          id: t.id, nome: t.nome, faixaEtaria: t.faixa_etaria ?? '', cor: t.cor ?? '',
          idadeMin: t.idade_min ?? null, idadeMax: t.idade_max ?? null,
        })))
        setChamadas(dados.chamadas)
        setRegistros(dados.presencasDetalhe)
        setAlunos(dados.alunos.map((a: any) => ({
          id: a.id, nome: a.nome, turmaId: a.turma_id ?? null,
          telefone: a.telefone ?? '', email: a.email ?? '',
          dataNascimento: a.data_nascimento ?? '', responsavel: a.responsavel ?? '',
          cargo: a.cargo ?? '', ativo: a.ativo ?? true,
          idade: a.data_nascimento ? calcularIdade(a.data_nascimento) : null,
          isProfessor: (a.responsavel ?? '').startsWith('professor:'),
        })))
      })
      .catch((e: any) => { if (!cancelado) toast('Erro ao carregar alunos: ' + (e?.message ?? 'erro inesperado'), 'error') })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [ano])

  const turmaMap = useMemo(() => Object.fromEntries(turmas.map(t => [t.id, t])), [turmas])
  const chamadaMap = useMemo(() => new Map(chamadas.map(c => [c.id, c])), [chamadas])
  const rotulo = useMemo(
    () => criarRotuloNome(alunos.map(a => ({ id: a.id, nome: a.nome, turma: a.turmaId ? turmaMap[a.turmaId]?.nome : null }))),
    [alunos, turmaMap]
  )

  // Registros por aluno (com data e turma da chamada)
  const registrosPorAluno = useMemo(() => {
    const m = new Map<string, (Registro & { data: string; turmaId: string | null })[]>()
    for (const r of registros) {
      const c = chamadaMap.get(r.chamadaId)
      if (!c) continue
      const lista = m.get(r.alunoId) ?? []
      lista.push({ ...r, data: c.data, turmaId: c.turmaId })
      m.set(r.alunoId, lista)
    }
    return m
  }, [registros, chamadaMap])

  const noPeriodo = (data: string) => {
    if (periodoPresenca === 'ano') return true
    const mes = parseISO(data).getMonth()
    return periodoPresenca === 'mes' ? mes === mesFiltro : TRIMESTRES[trimFiltro].meses.includes(mes)
  }

  // Aluno enriquecido: presença (regra única), faltas seguidas e pendências
  const enriquecidos = useMemo(() => alunos.map(a => {
    const regs = registrosPorAluno.get(a.id) ?? []
    const regsPeriodo = regs.filter(r => noPeriodo(r.data))
    const presentes = regsPeriodo.filter(r => r.presente).length
    const seq = sequenciaFaltas(regs)
    const turma = a.turmaId ? turmaMap[a.turmaId] : null
    const foraDaFaixa = !!turma && a.idade !== null && (
      (turma.idadeMin !== null && a.idade < turma.idadeMin) || (turma.idadeMax !== null && a.idade > turma.idadeMax)
    )
    return {
      ...a,
      nomeExibicao: rotulo(a.id, a.nome),
      turma,
      presentes,
      totalRegistros: regsPeriodo.length,
      presenca: regsPeriodo.length ? Math.round((presentes / regsPeriodo.length) * 100) : null,
      faltasSeguidas: seq.faltasSeguidas,
      ultimaPresenca: seq.ultimaPresenca,
      semNascimento: !a.dataNascimento,
      foraDaFaixa,
    }
  }), [alunos, registrosPorAluno, turmaMap, rotulo, periodoPresenca, mesFiltro, trimFiltro]) // eslint-disable-line react-hooks/exhaustive-deps

  // Contagem das pendências (entre os ativos)
  const pendencias = useMemo(() => {
    const ativos = enriquecidos.filter(a => a.ativo)
    return {
      sem_nascimento: ativos.filter(a => a.semNascimento).length,
      fora_faixa: ativos.filter(a => a.foraDaFaixa).length,
      faltas: ativos.filter(a => a.faltasSeguidas >= LIMITE_FALTAS).length,
    }
  }, [enriquecidos])

  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase()
    return enriquecidos
      .filter(a => {
        if (termo && ![a.nome, a.email, a.responsavel.startsWith('professor:') ? '' : a.responsavel].some(v => v.toLowerCase().includes(termo))) return false
        if (turmaFilter !== 'all' && a.turmaId !== turmaFilter) return false
        if (statusFilter !== 'todos' && (statusFilter === 'ativos') !== a.ativo) return false
        if (!mostrarProfessores && a.isProfessor) return false
        if (pendencia === 'sem_nascimento' && !a.semNascimento) return false
        if (pendencia === 'fora_faixa' && !a.foraDaFaixa) return false
        if (pendencia === 'faltas' && a.faltasSeguidas < LIMITE_FALTAS) return false
        return true
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'nome')     cmp = a.nome.localeCompare(b.nome, 'pt-BR')
        if (sortKey === 'idade')    cmp = (a.idade ?? -1) - (b.idade ?? -1)
        if (sortKey === 'presenca') cmp = (a.presenca ?? -1) - (b.presenca ?? -1)
        if (sortKey === 'faltas')   cmp = a.faltasSeguidas - b.faltasSeguidas
        if (sortKey === 'turma')    cmp = (a.turma?.nome ?? '').localeCompare(b.turma?.nome ?? '', 'pt-BR')
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [enriquecidos, search, turmaFilter, statusFilter, mostrarProfessores, pendencia, sortKey, sortDir])

  const faixaPorTurma = useMemo(() => Object.fromEntries(turmas.map(t => [t.id, t.faixaEtaria])), [turmas])
  const ativos = alunos.filter(a => a.ativo)
  const professoresAtivos = ativos.filter(a => a.isProfessor).length

  // ─── Ações ─────────────────────────────────────────────────────────────────
  function openDialog(aluno?: AlunoBase) {
    if (aluno) {
      setEditMode(true); setSelected(aluno)
      setForm({
        nome: aluno.nome, dataNascimento: aluno.dataNascimento, telefone: aluno.telefone, email: aluno.email,
        responsavel: aluno.isProfessor ? '' : aluno.responsavel, turmaId: aluno.turmaId ?? '', cargo: aluno.cargo ?? '',
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
    if (!form.nome.trim()) { toast('Por favor, preencha o nome do aluno.', 'error'); return }
    if (isSaving) return

    // Nome repetido: avisa e sugere diferenciar (sobrenome)
    const iguais = alunos.filter(a => a.ativo && a.id !== selected?.id && normalizarNome(a.nome) === normalizarNome(form.nome))
    if (iguais.length > 0) {
      const onde = iguais.map(a => a.turmaId ? turmaMap[a.turmaId]?.nome ?? 'sem turma' : 'sem turma').join(', ')
      const ok = confirm(`Já existe aluno chamado "${form.nome.trim()}" (${onde}).\n\nPara não confundir nas listas, prefira incluir o sobrenome. Salvar mesmo assim?`)
      if (!ok) return
    }

    setIsSaving(true)
    try {
      const result = await salvarAluno({
        ...(editMode && selected ? { id: selected.id } : {}),
        nome: form.nome.trim(),
        data_nascimento: form.dataNascimento || null,
        telefone: form.telefone || null,
        email: form.email || null,
        turma_id: form.turmaId || null,
        ativo: editMode && selected ? selected.ativo : true,
        responsavel: form.responsavel || null,
        cargo: form.cargo || null,
      })
      if (!result.success) {
        toast(`${editMode ? 'Erro ao atualizar aluno' : 'Erro ao cadastrar aluno'}: ${result.error ?? 'erro inesperado'}`, 'error')
        return
      }
      const base = {
        nome: form.nome.trim(), turmaId: form.turmaId || null, cargo: form.cargo ?? '',
        idade: form.dataNascimento ? calcularIdade(form.dataNascimento) : null,
        telefone: form.telefone, email: form.email, dataNascimento: form.dataNascimento,
      }
      if (editMode && selected) {
        setAlunos(prev => prev.map(a => a.id === selected.id
          ? { ...a, ...base, responsavel: a.isProfessor ? a.responsavel : form.responsavel }
          : a))
        toast('Aluno atualizado com sucesso!')
      } else {
        setAlunos(prev => [...prev, { id: result.id!, ...base, responsavel: form.responsavel, ativo: true, isProfessor: false }])
        toast('Aluno cadastrado com sucesso!')
      }
      closeDialog()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDesativar() {
    if (!selected) return
    const result = await definirAtivoAluno(selected.id, false)
    if (!result.success) { toast('Erro ao desativar aluno.', 'error'); return }
    setAlunos(prev => prev.map(a => a.id === selected.id ? { ...a, ativo: false } : a))
    toast('Aluno desativado com sucesso!')
    setDesativarOpen(false); setSelected(null)
  }

  async function handleReativar(aluno: AlunoBase) {
    const result = await definirAtivoAluno(aluno.id, true)
    if (!result.success) { toast('Erro ao reativar aluno.', 'error'); return }
    setAlunos(prev => prev.map(a => a.id === aluno.id ? { ...a, ativo: true } : a))
    toast('Aluno reativado com sucesso!')
  }

  async function handlePromover() {
    if (!selected) return
    setPromovendo(true)
    const result = await promoverAlunoParaProfessor(selected.id)
    setPromovendo(false)
    if (!result.success) { toast('Erro ao promover aluno: ' + (result.error ?? ''), 'error'); return }
    setAlunos(prev => prev.map(a => a.id === selected.id ? { ...a, isProfessor: true } : a))
    toast(`${selected.nome} foi promovido a professor!`)
    setPromoverOpen(false); setSelected(null)
  }

  // ─── Pedaços de UI ─────────────────────────────────────────────────────────
  const BadgesAluno = ({ a }: { a: typeof enriquecidos[number] }) => {
    const cargoInfo = getCargo(a.cargo)
    return (
      <>
        {!a.ativo && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/40 text-muted-foreground">Inativo</Badge>}
        {a.isProfessor && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-400">Professor</Badge>}
        {cargoInfo && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}>
            {cargoInfo.label}
          </span>
        )}
        {a.foraDaFaixa && a.turma && (
          <span title={`Turma para ${faixaTexto(a.turma)} anos`} className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700">
            <AlertTriangle className="h-2.5 w-2.5" />Fora da faixa
          </span>
        )}
      </>
    )
  }

  const TurmaBadge = ({ turma }: { turma: Turma | null }) => {
    const cor = turma?.cor ? (BG_TO_HEX[turma.cor] ?? null) : null
    return (
      <Badge variant="secondary" className="text-xs whitespace-nowrap"
        style={cor ? { backgroundColor: cor + '25', color: cor, borderColor: cor + '55', borderWidth: '1px', borderStyle: 'solid' } : undefined}>
        {turma?.nome ?? '—'}
      </Badge>
    )
  }

  const Acoes = ({ a, compacto }: { a: typeof enriquecidos[number]; compacto?: boolean }) => {
    const tam = compacto ? 'h-8 w-8' : ''
    return (
      <div className="flex items-center justify-end gap-0.5">
        <Button variant="ghost" size="icon" className={tam} title="Histórico de presença" onClick={() => setHistoricoId(a.id)}><History className="h-4 w-4" /></Button>
        {a.isProfessor ? (
          <span className="text-[11px] text-muted-foreground italic px-1">em Professores</span>
        ) : a.ativo ? (
          <>
            {!compacto && <Button variant="ghost" size="icon" title="Promover a professor" onClick={() => { setSelected(a); setPromoverOpen(true) }}><GraduationCap className="h-4 w-4 text-blue-400" /></Button>}
            <Button variant="ghost" size="icon" className={tam} title="Editar" onClick={() => openDialog(a)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className={tam} title="Desativar" onClick={() => { setSelected(a); setDesativarOpen(true) }}><UserX className="h-4 w-4 text-destructive" /></Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" className={tam} title="Editar" onClick={() => openDialog(a)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className={tam} title="Reativar" onClick={() => handleReativar(a)}><UserCheck className="h-4 w-4 text-green-600" /></Button>
          </>
        )}
      </div>
    )
  }

  const historico = historicoId ? enriquecidos.find(a => a.id === historicoId) ?? null : null
  const historicoRegs = historico
    ? [...(registrosPorAluno.get(historico.id) ?? [])].sort((a, b) => b.data.localeCompare(a.data))
    : []

  // ─── Render ────────────────────────────────────────────────────────────────
  if (carregando && alunos.length === 0) return (
    <div className="space-y-6">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
        {[...Array(7)].map((_, i) => <div key={i} className="h-24 rounded-xl border bg-muted/40 animate-pulse" />)}
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os alunos da Escola Bíblica Dominical</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />Novo aluno
        </Button>
      </div>

      {/* Stats por faixa etária */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard
          title="Total" value={ativos.length} icon={Users}
          description={professoresAtivos > 0 ? `${ativos.length - professoresAtivos} alunos + ${professoresAtivos} prof.` : 'Ativos no sistema'}
        />
        {FAIXAS.map(f => (
          <StatCard
            key={f.faixa} title={f.label}
            value={ativos.filter(a => a.turmaId && faixaPorTurma[a.turmaId] === f.faixa).length}
            description={f.desc} valueClassName={f.color}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de alunos</CardTitle>
          <CardDescription>Presença = presenças ÷ aulas registradas do aluno no período (em qualquer turma)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca e filtros */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, e-mail ou responsável..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Filtrar por turma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-full md:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Período da presença */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/40 border">
            <span className="text-xs text-muted-foreground font-medium mr-1">Presença:</span>
            <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
              <SelectTrigger className="h-7 text-xs w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>{ANOS_DISPONIVEIS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
            {(['ano', 'trimestre', 'mes'] as const).map(p => (
              <button key={p} onClick={() => setPeriodoPresenca(p)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', periodoPresenca === p ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground border hover:bg-muted')}>
                {p === 'ano' ? 'Ano todo' : p === 'mes' ? 'Por mês' : 'Por trimestre'}
              </button>
            ))}
            {periodoPresenca === 'mes' && (
              <Select value={String(mesFiltro)} onValueChange={v => setMesFiltro(Number(v))}>
                <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {periodoPresenca === 'trimestre' && (
              <Select value={String(trimFiltro)} onValueChange={v => setTrimFiltro(Number(v))}>
                <SelectTrigger className="h-7 text-xs w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>{TRIMESTRES.map((t, i) => <SelectItem key={i} value={String(i)}>{t.label} ({t.desc})</SelectItem>)}</SelectContent>
              </Select>
            )}
            {carregando && <span className="text-xs text-muted-foreground">carregando…</span>}
          </div>

          {/* Pendências */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Mostrar:</span>
            {([
              { id: 'todas', label: 'Todos', icon: null, n: null },
              { id: 'faltas', label: `${LIMITE_FALTAS}+ faltas seguidas`, icon: CalendarX2, n: pendencias.faltas },
              { id: 'fora_faixa', label: 'Fora da faixa etária', icon: AlertTriangle, n: pendencias.fora_faixa },
              { id: 'sem_nascimento', label: 'Sem data de nascimento', icon: Cake, n: pendencias.sem_nascimento },
            ] as const).map(p => (
              <button key={p.id} onClick={() => setPendencia(p.id)}
                className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  pendencia === p.id ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:bg-muted border-border')}>
                {p.icon && <p.icon className="h-3 w-3" />}
                {p.label}
                {p.n !== null && <span className={cn('rounded-full px-1.5 text-[10px]', pendencia === p.id ? 'bg-primary-foreground/20' : 'bg-muted')}>{p.n}</span>}
              </button>
            ))}
            <label className="inline-flex items-center gap-2 ml-auto text-xs text-muted-foreground cursor-pointer">
              <Switch checked={mostrarProfessores} onCheckedChange={setMostrarProfessores} />
              Incluir professores
            </label>
          </div>

          {/* Ordenação (mobile) */}
          <div className="flex flex-wrap gap-1.5 md:hidden">
            <span className="text-xs text-muted-foreground self-center">Ordenar:</span>
            {(['nome', 'turma', 'presenca', 'faltas'] as const).map(key => (
              <button key={key} onClick={() => handleSort(key)}
                className={cn('px-2.5 py-1 rounded text-xs font-medium border transition-all',
                  sortKey === key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground border-border')}>
                {key === 'nome' ? 'Nome' : key === 'turma' ? 'Turma' : key === 'presenca' ? 'Presença' : 'Faltas'}
                {sortKey === key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">{filtered.length} aluno{filtered.length !== 1 ? 's' : ''}</p>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtered.length > 0 ? filtered.map(a => (
              <div key={a.id} className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setHistoricoId(a.id)} className="font-semibold text-sm text-left hover:underline">{a.nomeExibicao}</button>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1"><BadgesAluno a={a} /></div>
                    {a.turma && <div className="mt-1.5"><TurmaBadge turma={a.turma} /></div>}
                  </div>
                  <Acoes a={a} compacto />
                </div>
                <div className="grid grid-cols-3 border-t">
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <span className="text-[10px] text-muted-foreground mb-0.5">Idade</span>
                    <span className="text-sm font-bold">{a.idade !== null ? `${a.idade}a` : '—'}</span>
                  </div>
                  <div className="flex flex-col justify-center py-2 px-3 col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Presença {a.totalRegistros > 0 && `(${a.presentes}/${a.totalRegistros})`}</span>
                      <span className={cn('text-sm font-bold', a.presenca !== null && corTextoPresenca(a.presenca))}>{a.presenca !== null ? `${a.presenca}%` : '—'}</span>
                    </div>
                    <PresenceBar pct={a.presenca ?? 0} />
                  </div>
                </div>
                {(a.faltasSeguidas >= LIMITE_FALTAS || a.ultimaPresenca) && (
                  <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
                    <span>Última presença: {fmtData(a.ultimaPresenca)}</span>
                    {a.faltasSeguidas >= LIMITE_FALTAS && <span className="font-semibold text-red-600">{a.faltasSeguidas} faltas seguidas</span>}
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhum aluno encontrado</div>
            )}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead><button onClick={() => handleSort('nome')} className="flex items-center font-semibold hover:text-foreground">Nome <SortIcon col="nome" /></button></TableHead>
                  <TableHead><button onClick={() => handleSort('idade')} className="flex items-center font-semibold hover:text-foreground">Idade <SortIcon col="idade" /></button></TableHead>
                  <TableHead><button onClick={() => handleSort('turma')} className="flex items-center font-semibold hover:text-foreground">Turma <SortIcon col="turma" /></button></TableHead>
                  <TableHead><button onClick={() => handleSort('presenca')} className="flex items-center font-semibold hover:text-foreground">Presença <SortIcon col="presenca" /></button></TableHead>
                  <TableHead><button onClick={() => handleSort('faltas')} className="flex items-center font-semibold hover:text-foreground">Última presença <SortIcon col="faltas" /></button></TableHead>
                  <TableHead className="hidden xl:table-cell">Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setHistoricoId(a.id)} className="font-medium text-left hover:underline" title="Ver histórico de presença">{a.nomeExibicao}</button>
                        <BadgesAluno a={a} />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {a.idade !== null ? `${a.idade} anos` : <span className="text-xs text-muted-foreground">sem data</span>}
                    </TableCell>
                    <TableCell><TurmaBadge turma={a.turma} /></TableCell>
                    <TableCell>
                      {a.presenca === null ? <span className="text-xs text-muted-foreground">sem registros</span> : (
                        <div className="flex items-center gap-2">
                          <PresenceBar pct={a.presenca} className="w-16" />
                          <div className="flex flex-col leading-tight">
                            <span className={cn('text-sm font-medium', corTextoPresenca(a.presenca))}>{a.presenca}%</span>
                            <span className="text-xs text-muted-foreground">{a.presentes}/{a.totalRegistros} aulas</span>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm">{fmtData(a.ultimaPresenca)}</span>
                        {a.faltasSeguidas >= LIMITE_FALTAS
                          ? <span className="text-xs font-semibold text-red-600">{a.faltasSeguidas} faltas seguidas</span>
                          : a.faltasSeguidas > 0 ? <span className="text-xs text-muted-foreground">{a.faltasSeguidas} falta{a.faltasSeguidas > 1 ? 's' : ''} seguida{a.faltasSeguidas > 1 ? 's' : ''}</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2"><Phone className="h-3 w-3" />{a.telefone || '—'}</span>
                        <span className="flex items-center gap-2"><Mail className="h-3 w-3" />{a.email || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right"><Acoes a={a} /></TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: histórico do aluno */}
      <Dialog open={!!historico} onOpenChange={v => { if (!v) setHistoricoId(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          {historico && (
            <>
              <DialogHeader>
                <DialogTitle>{historico.nomeExibicao}</DialogTitle>
                <DialogDescription>
                  {historico.turma?.nome ?? 'Sem turma'}
                  {historico.idade !== null ? ` · ${historico.idade} anos` : ' · sem data de nascimento'}
                  {` · histórico de ${ano}`}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-1.5"><BadgesAluno a={historico} /></div>

              {(() => {
                const presentes = historicoRegs.filter(r => r.presente).length
                const pct = historicoRegs.length ? Math.round((presentes / historicoRegs.length) * 100) : null
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                      <p className={cn('text-lg font-bold', pct !== null && corTextoPresenca(pct))}>{pct !== null ? `${pct}%` : '—'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{presentes}/{historicoRegs.length} aulas</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                      <p className={cn('text-lg font-bold', historico.faltasSeguidas >= LIMITE_FALTAS && 'text-red-600')}>{historico.faltasSeguidas}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Faltas seguidas</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                      <p className="text-lg font-bold text-purple-600">{historicoRegs.filter(r => r.presente && r.biblia).length}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Bíblias</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                      <p className="text-lg font-bold text-orange-600">{historicoRegs.filter(r => r.presente && r.revista).length}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Revistas</p>
                    </div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <p><span className="text-muted-foreground">Nascimento:</span> {historico.dataNascimento ? fmtData(historico.dataNascimento) : '—'}</p>
                <p><span className="text-muted-foreground">Telefone:</span> {historico.telefone || '—'}</p>
                <p><span className="text-muted-foreground">E-mail:</span> {historico.email || '—'}</p>
                <p><span className="text-muted-foreground">Responsável:</span> {historico.isProfessor ? '—' : historico.responsavel || '—'}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Domingos ({historicoRegs.length})</p>
                {historicoRegs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum registro de chamada em {ano}.</p>
                ) : (
                  <div className="rounded-lg border divide-y max-h-[280px] overflow-y-auto">
                    {historicoRegs.map(r => (
                      <div key={r.chamadaId} className="flex items-center gap-3 px-3 py-2 text-sm">
                        {r.presente ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        <span className="w-24 flex-shrink-0">{fmtData(r.data)}</span>
                        <span className="flex-1 min-w-0 truncate text-muted-foreground">{r.turmaId ? turmaMap[r.turmaId]?.nome ?? '—' : '—'}</span>
                        {r.presente && r.biblia && <Book className="h-3.5 w-3.5 text-purple-600" aria-label="Trouxe Bíblia" />}
                        {r.presente && r.revista && <BookOpen className="h-3.5 w-3.5 text-orange-600" aria-label="Trouxe revista" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setHistoricoId(null)}>Fechar</Button>
                {!historico.isProfessor && (
                  <Button onClick={() => { setHistoricoId(null); openDialog(historico) }}><Edit className="h-4 w-4 mr-2" />Editar</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar aluno' : 'Novo aluno'}</DialogTitle>
            <DialogDescription>{editMode ? 'Atualize as informações do aluno abaixo.' : 'Preencha os dados do novo aluno.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input id="nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome e sobrenome" />
              <p className="text-[11px] text-muted-foreground">Inclua o sobrenome para diferenciar alunos com o mesmo nome.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataNascimento">Data de nascimento</Label>
              <Input id="dataNascimento" type="date" value={form.dataNascimento} onChange={e => setForm({ ...form, dataNascimento: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            {!(editMode && selected?.isProfessor) && (
              <div className="grid gap-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <Input id="responsavel" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do responsável" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="turma">Turma</Label>
              <Select value={form.turmaId} onValueChange={v => setForm({ ...form, turmaId: v })}>
                <SelectTrigger id="turma"><SelectValue placeholder="Selecione uma turma" /></SelectTrigger>
                <SelectContent>
                  {turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}{t.idadeMin !== null ? ` (${faixaTexto(t)} anos)` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {(() => {
                const t = form.turmaId ? turmaMap[form.turmaId] : null
                const idade = form.dataNascimento ? calcularIdade(form.dataNascimento) : null
                if (!t || idade === null) return null
                const fora = (t.idadeMin !== null && idade < t.idadeMin) || (t.idadeMax !== null && idade > t.idadeMax)
                return fora ? (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />Com {idade} anos, o aluno está fora da faixa desta turma ({faixaTexto(t)} anos).
                  </p>
                ) : null
              })()}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cargo">Cargo eclesiástico</Label>
              <Select value={form.cargo} onValueChange={v => setForm({ ...form, cargo: v === 'nenhum' ? '' : v })}>
                <SelectTrigger id="cargo"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {CARGOS.map(c => <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editMode ? 'Salvar alterações' : 'Cadastrar aluno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={desativarOpen}
        onOpenChange={setDesativarOpen}
        title="Desativar aluno"
        description={<>Tem certeza que deseja desativar <strong>{selected ? rotulo(selected.id, selected.nome) : ''}</strong>? Ele deixará de aparecer nas turmas, chamadas e escalas, mas o histórico de presença é mantido e pode ser reativado a qualquer momento.</>}
        confirmLabel="Desativar"
        onConfirm={handleDesativar}
      />

      <Dialog open={promoverOpen} onOpenChange={setPromoverOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Promover a professor</DialogTitle>
            <DialogDescription>
              <strong>{selected ? rotulo(selected.id, selected.nome) : ''}</strong> será cadastrado como professor e continuará na sua turma como aluno. Deseja confirmar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoverOpen(false)} disabled={promovendo}>Cancelar</Button>
            <Button onClick={handlePromover} disabled={promovendo}>{promovendo ? 'Promovendo...' : 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

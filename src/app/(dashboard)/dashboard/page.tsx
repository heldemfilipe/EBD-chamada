"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { PresenceBar } from '@/components/ui/presence-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { PeriodSelector } from '@/components/ui/period-selector'
import { GraficoEvolucao } from '@/components/ui/grafico-evolucao'
import {
  Users, GraduationCap, BookOpen, TrendingUp, CheckCircle2, Calendar, Trophy, Star, UserPlus, Cake,
  AlertTriangle, Clock, RotateCcw, MessageCircle, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import {
  buscarContadoresGerais, buscarTurmasComProfessores, buscarUltimasChamadas, buscarUltimosVisitantes,
  buscarDadosPeriodo, buscarAniversariantes, buscarProximoDomingo,
} from '@/actions/dashboard'
import { MESES_CURTOS, TRIMESTRES, getCargo } from '@/lib/constants'
import { calcularPct, resolverCor, corTextoPresenca } from '@/lib/presence'
import {
  filtrarPorPeriodo, periodoAnterior, labelPeriodo, labelCurtoPeriodo, serieEvolucao,
  criarRotuloNome, rankingComEmpates, sequenciaFaltas, type Granularidade,
} from '@/lib/relatorio-utils'
import { calcularStatusLembrete } from '@/lib/lembrete-whatsapp'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { format, parseISO, isToday, isYesterday, differenceInCalendarDays, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type DadosAno = Awaited<ReturnType<typeof buscarDadosPeriodo>>
type ProximoDomingo = Awaited<ReturnType<typeof buscarProximoDomingo>>
type Aniversariante = { id: string; nome: string; data_nascimento: string; turma_nome: string; isProfessor: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tempoRelativo(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    if (isToday(d))     return `Hoje às ${format(d, 'HH:mm')}`
    if (isYesterday(d)) return `Ontem às ${format(d, 'HH:mm')}`
    const dias = differenceInCalendarDays(new Date(), d)
    if (dias < 7) return `Há ${dias} dias`
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch { return '—' }
}

function parseDateSafe(dataNasc: string): Date | null {
  if (!dataNasc) return null
  const parts = dataNasc.split('T')[0].split('-')
  if (parts.length !== 3) return null
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return isNaN(d.getTime()) ? null : d
}

/** Data do aniversário dentro do intervalo (considera virada de ano), ou null. */
function aniversarioNoIntervalo(dataNasc: string, inicio: Date, fim: Date): Date | null {
  const nasc = parseDateSafe(dataNasc)
  if (!nasc) return null
  for (const ano of [inicio.getFullYear(), inicio.getFullYear() + 1]) {
    const aniv = new Date(ano, nasc.getMonth(), nasc.getDate())
    if (aniv >= startOfDay(inicio) && aniv <= startOfDay(fim)) return aniv
  }
  return null
}

function idadeEm(dataNasc: string, ref: Date): number {
  const nasc = parseDateSafe(dataNasc)
  if (!nasc) return 0
  let idade = ref.getFullYear() - nasc.getFullYear()
  if (ref.getMonth() < nasc.getMonth() || (ref.getMonth() === nasc.getMonth() && ref.getDate() < nasc.getDate())) idade--
  return idade
}

function agregar(chamadas: DadosAno['chamadas']) {
  let presentes = 0, total = 0
  for (const c of chamadas) {
    total += c.presencas.length
    presentes += c.presencas.filter(p => p.presente).length
  }
  return { presentes, total }
}

const ATALHOS = [
  { title: 'Chamada',    href: '/chamada',    Icon: CheckCircle2, modulo: 'chamada' },
  { title: 'Alunos',     href: '/alunos',     Icon: Users,        modulo: 'alunos' },
  { title: 'Escala',     href: '/escala',     Icon: Calendar,     modulo: 'escala' },
  { title: 'Relatórios', href: '/relatorios', Icon: TrendingUp,   modulo: 'relatorios' },
] as const

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const { modulosPermitidos } = useAuth()

  const [granularidade, setGranularidade] = useState<Granularidade>('trimestre')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [trimestre, setTrimestre] = useState(Math.floor(new Date().getMonth() / 3))
  const [mes, setMes] = useState(new Date().getMonth())
  const [salaSelecionada, setSalaSelecionada] = useState('')

  const [contadores, setContadores] = useState({ totalAlunos: 0, alunosProfessores: 0, totalProfessores: 0 })
  const [turmasAtivas, setTurmasAtivas] = useState<Awaited<ReturnType<typeof buscarTurmasComProfessores>>>([])
  const [chamadasRecentes, setChamadasRecentes] = useState<Awaited<ReturnType<typeof buscarUltimasChamadas>>>([])
  const [visitantesRecentes, setVisitantesRecentes] = useState<Awaited<ReturnType<typeof buscarUltimosVisitantes>>>([])
  const [todosAniversariantes, setTodosAniversariantes] = useState<Aniversariante[]>([])
  const [proximoDomingo, setProximoDomingo] = useState<ProximoDomingo>(null)
  const [semanaAniv, setSemanaAniv] = useState<'passada' | 'proxima'>('proxima')

  const [dadosPorAno, setDadosPorAno] = useState<Record<number, DadosAno>>({})

  // ─── Dados que não dependem do período ─────────────────────────────────────
  useEffect(() => {
    let cancelado = false
    Promise.all([
      buscarContadoresGerais(),
      buscarTurmasComProfessores(),
      buscarUltimasChamadas(5),
      buscarUltimosVisitantes(8),
      buscarAniversariantes(),
      buscarProximoDomingo(format(new Date(), 'yyyy-MM-dd')),
    ]).then(([cont, turmas, chamadas, visitantes, aniversariantes, proximo]) => {
      if (cancelado) return
      setContadores(cont)
      setTurmasAtivas(turmas)
      setChamadasRecentes(chamadas)
      setVisitantesRecentes(visitantes)
      setTodosAniversariantes(aniversariantes)
      setProximoDomingo(proximo)
    }).catch(() => {})
    return () => { cancelado = true }
  }, [])

  // ─── Dados do ano (e do ano anterior, quando a comparação precisa) ─────────
  const anterior = periodoAnterior({ granularidade: granularidade === 'dia' ? 'mes' : granularidade, ano, mes, trim: trimestre })
  useEffect(() => {
    let cancelado = false
    const anos = Array.from(new Set([ano, anterior.ano])).filter(a => !dadosPorAno[a])
    if (anos.length === 0) return
    Promise.all(anos.map(a => buscarDadosPeriodo(a).then(d => [a, d] as const)))
      .then(res => { if (!cancelado) setDadosPorAno(prev => ({ ...prev, ...Object.fromEntries(res) })) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [ano, anterior.ano]) // eslint-disable-line react-hooks/exhaustive-deps

  const dadosAno = dadosPorAno[ano]

  const analise = useMemo(() => {
    if (!dadosAno) return null
    const periodo = { granularidade, mes, trim: trimestre }
    const chamadasPeriodo = filtrarPorPeriodo(dadosAno.chamadas, periodo)
    const atual = agregar(chamadasPeriodo)

    const dadosAnt = dadosPorAno[anterior.ano]
    const ant = dadosAnt
      ? agregar(filtrarPorPeriodo(dadosAnt.chamadas, { granularidade: anterior.granularidade, mes: anterior.mes, trim: anterior.trim }))
      : null
    const pctAtual = atual.total ? calcularPct(atual.presentes, atual.total) : null
    const pctAnt = ant?.total ? calcularPct(ant.presentes, ant.total) : null

    const rotulo = criarRotuloNome(dadosAno.alunos.map(a => ({ id: a.id, nome: a.nome, turma: a.turma_nome })))
    const alunoPorId = new Map(dadosAno.alunos.map(a => [a.id, a]))

    // Gráfico
    const grafico = serieEvolucao(
      chamadasPeriodo.map(c => ({ data: c.data, presentes: c.presencas.filter(p => p.presente).length, total: c.presencas.length })),
      granularidade,
    )

    // Presença por sala
    const porTurma = new Map<string, { presentes: number; total: number }>()
    for (const c of chamadasPeriodo) {
      const acc = porTurma.get(c.turma_id) ?? { presentes: 0, total: 0 }
      acc.total += c.presencas.length
      acc.presentes += c.presencas.filter(p => p.presente).length
      porTurma.set(c.turma_id, acc)
    }
    const salas = dadosAno.turmas.map((t, idx) => {
      const v = porTurma.get(t.id)
      return {
        sala: t.nome, cor: resolverCor(t.cor, idx),
        pct: v?.total ? calcularPct(v.presentes, v.total) : null,
        valor: v?.total ? calcularPct(v.presentes, v.total) : 0,
      }
    })

    // Ranking de alunos no período
    const ppa = new Map<string, { presentes: number; total: number }>()
    for (const c of chamadasPeriodo) {
      for (const p of c.presencas) {
        const acc = ppa.get(p.aluno_id) ?? { presentes: 0, total: 0 }
        acc.total++
        if (p.presente) acc.presentes++
        ppa.set(p.aluno_id, acc)
      }
    }
    const lista = dadosAno.alunos
      .filter(a => (ppa.get(a.id)?.total ?? 0) > 0)
      .map(a => {
        const v = ppa.get(a.id)!
        return {
          id: a.id, nome: rotulo(a.id, a.nome), sala: a.turma_nome ?? 'Sem turma',
          presentes: v.presentes, total: v.total, pct: calcularPct(v.presentes, v.total),
          cargo: a.cargo ?? '', isProfessor: (a.responsavel ?? '').startsWith('professor:'),
        }
      })
    const top10 = rankingComEmpates(lista).slice(0, 10)
    const porSala: Record<string, ReturnType<typeof rankingComEmpates<typeof lista[number]>>> = {}
    for (const t of dadosAno.turmas) {
      const daSala = lista.filter(a => a.sala === t.nome)
      if (daSala.length) porSala[t.nome] = rankingComEmpates(daSala).slice(0, 5)
    }

    // Alunos em risco: faltas seguidas nos domingos mais recentes do ano
    const registrosPorAluno = new Map<string, { data: string; presente: boolean }[]>()
    for (const c of dadosAno.chamadas) {
      for (const p of c.presencas) {
        const lista = registrosPorAluno.get(p.aluno_id) ?? []
        lista.push({ data: c.data, presente: p.presente })
        registrosPorAluno.set(p.aluno_id, lista)
      }
    }
    const emRisco = Array.from(registrosPorAluno.entries())
      .filter(([id]) => alunoPorId.has(id))
      .map(([id, regs]) => ({ id, aluno: alunoPorId.get(id)!, ...sequenciaFaltas(regs) }))
      .filter(r => r.faltasSeguidas >= 3)
      .sort((a, b) => b.faltasSeguidas - a.faltasSeguidas || a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR'))
      .map(r => ({ ...r, nome: rotulo(r.id, r.aluno.nome) }))

    return {
      pctAtual,
      tendencia: pctAtual !== null && pctAnt !== null
        ? { valor: pctAtual - pctAnt, sufixo: ' p.p.', referencia: labelCurtoPeriodo({ granularidade: anterior.granularidade, ano: anterior.ano, mes: anterior.mes, trim: anterior.trim }) }
        : null,
      grafico, salas, top10, porSala, emRisco,
    }
  }, [dadosAno, dadosPorAno, granularidade, mes, trimestre, anterior.ano, anterior.granularidade, anterior.mes, anterior.trim])

  // Sala selecionada nos destaques: mantém válida ao trocar de período
  useEffect(() => {
    if (!analise) return
    const salas = Object.keys(analise.porSala)
    if (salas.length && !salas.includes(salaSelecionada)) setSalaSelecionada(salas[0])
  }, [analise, salaSelecionada])

  // Aniversariantes (últimos / próximos 7 dias)
  const aniversariantes = useMemo(() => {
    const hoje = startOfDay(new Date())
    const inicio = semanaAniv === 'passada' ? addDays(hoje, -7) : hoje
    const fim = semanaAniv === 'passada' ? hoje : addDays(hoje, 7)
    const rotulo = criarRotuloNome(todosAniversariantes.map(a => ({ id: a.id, nome: a.nome, turma: a.turma_nome || null })))
    return todosAniversariantes
      .map(a => ({ ...a, aniv: aniversarioNoIntervalo(a.data_nascimento, inicio, fim), nomeExibicao: rotulo(a.id, a.nome) }))
      .filter((a): a is typeof a & { aniv: Date } => !!a.aniv)
      .sort((a, b) => a.aniv.getTime() - b.aniv.getTime())
  }, [todosAniversariantes, semanaAniv])

  const label = labelPeriodo({ granularidade, ano, mes, trim: trimestre })
  const atalhos = ATALHOS.filter(a => modulosPermitidos.includes(a.modulo))
  const alunosSemProfessores = contadores.totalAlunos - contadores.alunosProfessores
  const descricaoAlunos = contadores.alunosProfessores > 0
    ? `${alunosSemProfessores} alunos + ${contadores.alunosProfessores} professores`
    : 'Ativos no sistema'
  const presencaTexto = analise?.pctAtual !== null && analise?.pctAtual !== undefined ? `${analise.pctAtual}%` : '—'
  const mediaSalas = analise?.pctAtual ?? null
  const topAlunos = analise?.porSala[salaSelecionada] ?? []

  // Próximo domingo — resumo de confirmações
  const statusProximo = proximoDomingo?.escalas.map(e => ({
    ...e,
    status: e.professor_nome
      ? calcularStatusLembrete({ data: proximoDomingo.data, confirmado: e.confirmado, lembreteEnviadoEm: e.lembrete_enviado_em, lembreteReenviadoEm: e.lembrete_reenviado_em })
      : null,
  })) ?? []
  const confirmados = statusProximo.filter(e => e.confirmado).length

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header + atalhos (somente módulos liberados) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 mb-3">Visão geral da Escola Bíblica Dominical</p>
        {atalhos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {atalhos.map(({ title, href, Icon }) => (
              <Link
                key={href} href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-sm font-medium"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {title}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Indicadores */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 2xl:max-w-6xl">
        <StatCard title="Alunos" value={contadores.totalAlunos} icon={Users} description={descricaoAlunos} />
        <StatCard title="Professores" value={contadores.totalProfessores} icon={GraduationCap} description="Ativos" />
        <StatCard title="Turmas" value={turmasAtivas.length} icon={BookOpen} description="Ativas" />
        <StatCard
          title="Presença no período"
          value={presencaTexto}
          icon={TrendingUp}
          valueClassName={analise?.pctAtual != null ? corTextoPresenca(analise.pctAtual) : ''}
          description={labelCurtoPeriodo({ granularidade, ano, mes, trim: trimestre })}
          tendencia={analise?.tendencia}
        />
      </div>

      {/* Próximo domingo + Aniversariantes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Próximo domingo
              </CardTitle>
              {proximoDomingo && statusProximo.length > 0 && (
                <Badge variant="secondary" className="text-[11px] gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />{confirmados}/{statusProximo.length} confirmados
                </Badge>
              )}
            </div>
            <CardDescription className="capitalize">
              {proximoDomingo ? format(parseISO(proximoDomingo.data), "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Escala dos professores'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!proximoDomingo || statusProximo.length === 0 ? (
              <EmptyState message="Nenhuma escala cadastrada para os próximos domingos" minHeight="h-[80px]" />
            ) : (
              <div className="space-y-1.5">
                {statusProximo.map(e => (
                  <div key={e.id} className="flex items-center gap-2.5 py-1">
                    <span className={cn('w-1 self-stretch rounded-full flex-shrink-0', e.turma_cor)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.turma_nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.professor_nome ?? 'Sem professor'}</p>
                    </div>
                    {e.status?.tipo === 'confirmado' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-green-500/15 text-green-600"><CheckCircle2 className="h-3 w-3" />Confirmado</span>
                    )}
                    {e.status?.tipo === 'aguardando' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-500/10 text-blue-600"><Clock className="h-3 w-3" />Aguardando</span>
                    )}
                    {e.status?.tipo === 'sem_resposta' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-amber-500/15 text-amber-600"><RotateCcw className="h-3 w-3" />Sem resposta</span>
                    )}
                    {e.status?.tipo === 'pendente' && (
                      <span className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground"><MessageCircle className="h-3 w-3" />Não avisado</span>
                    )}
                  </div>
                ))}
                {modulosPermitidos.includes('escala') && (
                  <Link href="/escala" className="flex items-center justify-end gap-1 pt-2 text-xs font-medium text-primary hover:underline">
                    Abrir escala <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Cake className="h-4 w-4 text-pink-500" />
                Aniversariantes
              </CardTitle>
              {aniversariantes.length > 0 && <Badge variant="secondary" className="text-[10px]">{aniversariantes.length}</Badge>}
            </div>
            <div className="flex gap-1.5 pt-1">
              {(['passada', 'proxima'] as const).map(s => (
                <button key={s} onClick={() => setSemanaAniv(s)}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                    semanaAniv === s ? 'bg-pink-600 text-white border-pink-600' : 'border-border text-muted-foreground hover:border-pink-500/50 hover:text-foreground')}>
                  {s === 'passada' ? 'Últimos 7 dias' : 'Próximos 7 dias'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {aniversariantes.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {aniversariantes.map(a => {
                  const isHoje = isToday(a.aniv)
                  return (
                    <div key={a.id} className={cn(
                      'flex items-center gap-3 py-2 px-3 rounded-lg',
                      isHoje ? 'bg-pink-500/15 ring-1 ring-pink-500/30' : a.isProfessor ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : 'bg-muted/40'
                    )}>
                      <div className={cn(
                        'flex flex-col items-center justify-center w-10 h-10 rounded-full flex-shrink-0 leading-none',
                        isHoje ? 'bg-pink-500 text-white' : a.isProfessor ? 'bg-amber-500/15 text-amber-500' : 'bg-pink-500/10 text-pink-500'
                      )}>
                        <span className="text-sm font-bold">{format(a.aniv, 'dd')}</span>
                        <span className="text-[9px] uppercase">{MESES_CURTOS[a.aniv.getMonth()]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-sm font-medium truncate', isHoje && 'font-bold')}>{a.nomeExibicao}</span>
                          {isHoje && <span className="text-[9px] font-bold text-pink-500 uppercase tracking-wide flex-shrink-0">Hoje</span>}
                          {a.isProfessor && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-500 text-amber-500 bg-amber-500/10 flex-shrink-0">Prof</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {a.turma_nome || 'Sem turma'} · {idadeEm(a.data_nascimento, a.aniv)} anos
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState message={semanaAniv === 'passada' ? 'Nenhum aniversário nos últimos 7 dias' : 'Nenhum aniversário nos próximos 7 dias'} minHeight="h-[80px]" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Período + evolução */}
      <PeriodSelector
        granularidade={granularidade} ano={ano} mes={mes} trimestre={trimestre}
        onGranularidade={setGranularidade} onAno={setAno} onMes={setMes} onTrimestre={setTrimestre}
        label={label}
      >
        <div className="px-5 pt-4 pb-3">
          <p className="text-sm font-semibold">Evolução de presença</p>
          <p className="text-xs text-muted-foreground mb-3">
            Barras: alunos presentes · linha: % de presença {granularidade === 'ano' ? 'por mês' : 'por domingo'}
          </p>
          <GraficoEvolucao dados={analise?.grafico ?? []} />
        </div>
      </PeriodSelector>

      {/* Presença por sala + alunos em risco */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Presença por sala</CardTitle>
            <CardDescription>{label}{mediaSalas !== null ? ` · linha tracejada = média geral (${mediaSalas}%)` : ''}</CardDescription>
          </CardHeader>
          <CardContent>
            {analise && analise.salas.some(s => s.pct !== null) ? (
              <>
                <div className="h-[220px] sm:h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analise.salas} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                      <XAxis dataKey="sala" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                        tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 11) + '…' : v} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip
                        formatter={(_v: any, _n: any, item: any) => [item.payload.pct === null ? 'Sem chamada' : `${item.payload.pct}%`, 'Presença']}
                        labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 10, fontSize: 13 }}
                      />
                      {mediaSalas !== null && <ReferenceLine y={mediaSalas} stroke="currentColor" strokeOpacity={0.45} strokeDasharray="4 4" />}
                      <Bar dataKey="valor" radius={[8, 8, 0, 0]} animationDuration={600}>
                        {analise.salas.map((s, i) => <Cell key={i} fill={s.pct === null ? 'transparent' : s.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t">
                  {analise.salas.map(s => (
                    <div key={s.sala} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.cor }} />
                      <span className="text-xs text-muted-foreground">{s.sala}</span>
                      <span className={cn('text-xs font-semibold', s.pct === null ? 'text-muted-foreground font-normal italic' : corTextoPresenca(s.pct))}>
                        {s.pct === null ? 'sem dados' : `${s.pct}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[220px]" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Alunos em risco
              </CardTitle>
              {analise && analise.emRisco.length > 0 && <Badge variant="secondary" className="text-[10px]">{analise.emRisco.length}</Badge>}
            </div>
            <CardDescription>3 ou mais faltas seguidas nos últimos domingos de {ano}</CardDescription>
          </CardHeader>
          <CardContent>
            {analise && analise.emRisco.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {analise.emRisco.map(r => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.nome}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.aluno.turma_nome ?? 'Sem turma'} · {r.ultimaPresenca ? `última presença ${format(parseISO(r.ultimaPresenca), 'dd/MM')}` : 'sem presença no ano'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-red-600 flex-shrink-0">{r.faltasSeguidas} faltas</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-9 w-9 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum aluno com 3 faltas seguidas.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Destaques por sala
            </CardTitle>
            <CardDescription>Top 5 de presença no período · empates dividem a posição</CardDescription>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {analise && Object.keys(analise.porSala).length > 0 ? Object.keys(analise.porSala).map(sala => (
                <button
                  key={sala}
                  onClick={() => setSalaSelecionada(sala)}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                    salaSelecionada === sala ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')}
                >
                  {sala}
                </button>
              )) : <span className="text-xs text-muted-foreground">Nenhuma turma com dados</span>}
            </div>
          </CardHeader>
          <CardContent>
            {topAlunos.length > 0 ? (
              <div className="space-y-3">
                {topAlunos.map(aluno => (
                  <div key={aluno.id} className="flex items-center gap-3">
                    <span className={cn('w-8 text-center flex-shrink-0 text-sm font-bold', aluno.posicao === 1 ? 'text-yellow-500' : aluno.posicao === 2 ? 'text-slate-400' : aluno.posicao === 3 ? 'text-orange-600' : 'text-muted-foreground')}>
                      {aluno.posicao}º
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{aluno.nome}</span>
                        <span className={cn('text-xs font-bold ml-2 flex-shrink-0', corTextoPresenca(aluno.pct))}>{aluno.pct}%</span>
                      </div>
                      <PresenceBar pct={aluno.pct} />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {aluno.presentes} de {aluno.total} domingos{aluno.empatado ? ' · empate' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-orange-500" />
              Top 10 mais frequentes
            </CardTitle>
            <CardDescription>Maior presença no período · desempate por número de presenças</CardDescription>
          </CardHeader>
          <CardContent>
            {analise && analise.top10.length > 0 ? (
              <div className="space-y-2">
                {analise.top10.map(aluno => {
                  const cargoInfo = getCargo(aluno.cargo)
                  return (
                    <div key={aluno.id} className="flex items-center gap-3 py-1">
                      <span className={cn('flex-shrink-0 w-7 text-center text-sm font-bold', aluno.posicao === 1 ? 'text-yellow-500' : aluno.posicao === 2 ? 'text-slate-400' : aluno.posicao === 3 ? 'text-orange-600' : 'text-muted-foreground')}>
                        {aluno.posicao}º
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm font-medium">{aluno.nome}</span>
                          {aluno.isProfessor && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-400 text-blue-400">Prof</Badge>}
                          {cargoInfo && (
                            <span className="text-[9px] font-semibold px-1.5 rounded-full border leading-4 inline-flex items-center"
                              style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}>
                              {cargoInfo.label}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{aluno.sala}{aluno.empatado ? ' · empate' : ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={cn('text-xs font-bold', corTextoPresenca(aluno.pct))}>{aluno.pct}%</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{aluno.presentes}/{aluno.total}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Turmas + Histórico */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Turmas ativas</CardTitle>
            <CardDescription>Turmas e professores vinculados</CardDescription>
          </CardHeader>
          <CardContent>
            {turmasAtivas.length > 0 ? (
              <div className="space-y-2">
                {turmasAtivas.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn('w-1 self-stretch rounded-full flex-shrink-0', t.cor)} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{t.nome}{t.sala ? <span className="text-muted-foreground font-normal"> · {t.sala}</span> : null}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.professores.length > 0 ? t.professores.join(', ') : 'Sem professor'}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">{t.totalAlunos} alunos</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhuma turma cadastrada" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Histórico recente</CardTitle>
            <CardDescription>Últimas chamadas e visitantes</CardDescription>
          </CardHeader>
          <CardContent>
            {chamadasRecentes.length === 0 && visitantesRecentes.length === 0 ? (
              <EmptyState message="Nenhum registro encontrado" />
            ) : (
              <div className="space-y-1">
                {chamadasRecentes.map(c => (
                  <div key={c.id} className="flex items-start gap-3 py-2">
                    <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500 flex-shrink-0 mt-0.5"><CheckCircle2 className="h-3.5 w-3.5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none">{c.turma_nome ?? 'Turma'} — {c.presentes}/{c.total} presentes</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/70">{tempoRelativo(c.created_at ?? c.data)}</span>
                        {c.data && <span className="ml-1 text-muted-foreground/60">· EBD {format(parseISO(c.data), 'dd/MM/yyyy')}</span>}
                      </p>
                    </div>
                  </div>
                ))}
                {visitantesRecentes.length > 0 && (
                  <div className="pt-2 mt-1 border-t">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Visitantes recentes</p>
                    {visitantesRecentes.map(v => (
                      <div key={v.id} className="flex items-start gap-3 py-1.5">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 flex-shrink-0 mt-0.5"><UserPlus className="h-3.5 w-3.5" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none flex items-center gap-1.5">
                            {v.visitante_nome}
                            {v.visitas === 1
                              ? <span className="text-[9px] font-semibold uppercase text-blue-600 bg-blue-500/10 rounded px-1">1ª visita</span>
                              : <span className="text-[10px] text-muted-foreground font-normal">{v.visitas} visitas</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(parseISO(v.data), 'dd/MM/yyyy')} · {v.turma_nome ?? '—'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

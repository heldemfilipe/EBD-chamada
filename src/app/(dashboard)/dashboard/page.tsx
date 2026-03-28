"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { PresenceBar } from '@/components/ui/presence-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { PeriodSelector, labelDoPeriodo } from '@/components/ui/period-selector'
import { ChartTooltip } from '@/components/ui/chart-tooltip'
import {
  Users, GraduationCap, BookOpen, TrendingUp,
  CheckCircle2, Calendar, Trophy, Star, UserPlus,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { MESES_CURTOS, TRIMESTRES, getCargo } from '@/lib/constants'
import { calcularPct, resolverCor } from '@/lib/presence'
import { format, parseISO, isToday, isYesterday, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Retorna tempo relativo de modificação: "Hoje às 14:30", "Ontem às 09:15", "Há 3 dias", "dd/MM/yyyy" */
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

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Periodo = 'mensal' | 'trimestral' | 'anual'

function filtrarPorPeriodo(
  chamadas: any[],
  opts: { periodo: Periodo; mes: number; trimestre: number }
): any[] {
  return chamadas.filter((c: any) => {
    if (!c.data) return opts.periodo === 'anual'
    const m = parseISO(c.data).getMonth()
    if (opts.periodo === 'mensal')     return m === opts.mes
    if (opts.periodo === 'trimestral') return TRIMESTRES[opts.trimestre].meses.includes(m)
    return true
  })
}

type PontoDado = { periodo: string; presentes: number; total: number; pct: number }

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const db = supabase as any

  const [periodo, setPeriodo] = useState<Periodo>('trimestral')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [trimestre, setTrimestre] = useState(Math.floor(new Date().getMonth() / 3))
  const [mes, setMes] = useState(new Date().getMonth())
  const [salaSelecionada, setSalaSelecionada] = useState('')

  const [stats, setStats] = useState({ totalAlunos: 0, totalProfessores: 0, totalTurmas: 0, presencaMedia: 0 })
  const [dadosAnual, setDadosAnual] = useState<PontoDado[]>([])
  const [dadosDomingos, setDadosDomingos] = useState<Record<number, Record<number, PontoDado[]>>>({})
  const [dadosPorSala, setDadosPorSala] = useState<{ sala: string; cor: string; presencaMedia: number }[]>([])
  const [topPorSala, setTopPorSala] = useState<Record<string, { nome: string; presenca: number; total: number }[]>>({})
  const [top10, setTop10] = useState<{
    nome: string; sala: string; presenca: number; total: number; pct: number;
    cargo: string; isProfessor: boolean;
  }[]>([])
  const [turmasAtivas, setTurmasAtivas] = useState<{ id: string; turma: string; professor: string; alunos: number }[]>([])
  const [chamadasRecentes, setChamadasRecentes] = useState<{
    id: string; description: string; ebdDate: string; modificadoEm: string
  }[]>([])
  const [visitantesRecentes, setVisitantesRecentes] = useState<{
    id: string; nome: string; turma: string; ebdDate: string; modificadoEm: string
  }[]>([])

  // ─── Dados estaticos (nao dependem de filtros de periodo) ────────────────────
  useEffect(() => {
    async function load() {
      const anoAtual = new Date().getFullYear()
      // Todas as queries em paralelo — 0 sequenciais
      const [
        { count: totalAlunos },
        { count: totalProfessores },
        { data: turmasData },
        { data: chamadasRecentes },
        { data: visitantesData },
      ] = await Promise.all([
        db.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true),
        db.from('professores').select('id', { count: 'exact', head: true }).eq('ativo', true),
        db.from('turmas').select('id, nome, cor, professor_turmas(professores(nome)), alunos(id)').eq('ativa', true),
        db.from('chamadas').select('id, data, created_at, turmas(nome), presencas(presente)').order('created_at', { ascending: false }).limit(5),
        db.from('historico_visitantes').select('id, data, created_at, presente, visitantes(nome), turmas(nome)').eq('presente', true).order('created_at', { ascending: false }).limit(8),
      ])

      // Turmas ativas
      setTurmasAtivas((turmasData ?? []).map((t: any) => ({
        id: t.id, turma: t.nome, alunos: (t.alunos ?? []).length,
        professor: (t.professor_turmas ?? []).map((pt: any) => pt.professores?.nome).filter(Boolean).join(', ') || 'Sem professor',
      })))

      // Stats basicos (turmas count vem do turmasData)
      setStats(prev => ({
        ...prev,
        totalAlunos: totalAlunos ?? 0,
        totalProfessores: totalProfessores ?? 0,
        totalTurmas: turmasData?.length ?? 0,
      }))

      // Chamadas recentes
      setChamadasRecentes((chamadasRecentes ?? []).map((c: any) => {
        const presentes = (c.presencas ?? []).filter((p: any) => p.presente).length
        const total = (c.presencas ?? []).length
        return {
          id: c.id,
          description: `${c.turmas?.nome ?? 'Turma'} — ${presentes}/${total} presentes`,
          ebdDate: c.data ? format(parseISO(c.data), "dd/MM/yyyy", { locale: ptBR }) : '—',
          modificadoEm: tempoRelativo(c.created_at ?? c.data),
        }
      }))

      // Visitantes recentes
      setVisitantesRecentes((visitantesData ?? []).map((v: any) => ({
        id: v.id,
        nome: v.visitantes?.nome ?? 'Visitante',
        turma: v.turmas?.nome ?? '—',
        ebdDate: v.data ? format(parseISO(v.data), 'dd/MM/yyyy', { locale: ptBR }) : '—',
        modificadoEm: tempoRelativo(v.created_at ?? v.data),
      })))
    }
    load()
  }, [])

  // ─── Dados por periodo (graficos, presenca por sala, top alunos) ────────────
  useEffect(() => {
    let cancelado = false
    async function load() {
      // 1 query de chamadas + 1 de alunos + turmas do cache (ja carregadas acima)
      const [{ data: chamadasAno }, { data: alunos }, { data: turmas }] = await Promise.all([
        db.from('chamadas').select('id, data, turma_id, presencas(aluno_id, presente)').eq('ano', ano),
        db.from('alunos').select('id, nome, turma_id, turmas(nome), responsavel, cargo').eq('ativo', true),
        db.from('turmas').select('id, nome, cor').eq('ativa', true),
      ])
      if (cancelado) return

      const todasChamadas = chamadasAno ?? []

      // --- Presenca media do ano (stats) ---
      let totalPresentes = 0, totalPresencas = 0
      for (const c of todasChamadas) {
        const ps = c.presencas ?? []
        totalPresencas += ps.length
        totalPresentes += ps.filter((p: any) => p.presente).length
      }
      setStats(prev => ({ ...prev, presencaMedia: calcularPct(totalPresentes, totalPresencas) }))

      // --- Grafico anual + domingos ---
      const porMes: Record<number, { presentes: number; total: number }> = {}
      const porMesDomingos: Record<number, PontoDado[]> = {}
      for (let i = 0; i < 12; i++) porMes[i] = { presentes: 0, total: 0 }

      for (const c of todasChamadas) {
        if (!c.data) continue
        const m = parseISO(c.data).getMonth()
        const ps = c.presencas ?? []
        const presentes = ps.filter((p: any) => p.presente).length
        porMes[m].total += ps.length
        porMes[m].presentes += presentes
        if (!porMesDomingos[m]) porMesDomingos[m] = []
        porMesDomingos[m].push({
          periodo: format(parseISO(c.data), 'dd/MM', { locale: ptBR }),
          presentes, total: ps.length, pct: calcularPct(presentes, ps.length),
        })
      }

      setDadosAnual(MESES_CURTOS.map((label, i) => ({
        periodo: label, presentes: porMes[i].presentes, total: porMes[i].total,
        pct: calcularPct(porMes[i].presentes, porMes[i].total),
      })))
      setDadosDomingos(prev => ({ ...prev, [ano]: porMesDomingos }))

      // --- Presenca por sala (filtrada por periodo) ---
      if (turmas?.length) {
        const chamadasFiltradas = filtrarPorPeriodo(todasChamadas, { periodo, mes, trimestre })
        const porTurma: Record<string, { presentes: number; total: number }> = {}
        for (const c of chamadasFiltradas) {
          if (!porTurma[c.turma_id]) porTurma[c.turma_id] = { presentes: 0, total: 0 }
          const ps = c.presencas ?? []
          porTurma[c.turma_id].total += ps.length
          porTurma[c.turma_id].presentes += ps.filter((p: any) => p.presente).length
        }
        setDadosPorSala(turmas.map((turma: any, idx: number) => ({
          sala: turma.nome,
          cor: resolverCor(turma.cor, idx),
          presencaMedia: calcularPct(porTurma[turma.id]?.presentes ?? 0, porTurma[turma.id]?.total ?? 0),
        })))

        // --- Top alunos (ja temos presencas inline, sem query extra) ---
        const chamadasIds = new Set(chamadasFiltradas.map((c: any) => c.id))
        const ppa: Record<string, { presentes: number; total: number }> = {}
        for (const c of chamadasFiltradas) {
          for (const p of (c.presencas ?? [])) {
            if (!ppa[p.aluno_id]) ppa[p.aluno_id] = { presentes: 0, total: 0 }
            ppa[p.aluno_id].total++
            if (p.presente) ppa[p.aluno_id].presentes++
          }
        }

        const lista = (alunos ?? [])
          .filter((a: any) => ppa[a.id]?.total > 0)
          .map((a: any) => ({
            id: a.id, nome: a.nome, sala: a.turmas?.nome ?? 'Sem turma',
            presenca: ppa[a.id]?.presentes ?? 0, total: ppa[a.id]?.total ?? 0,
            pct: calcularPct(ppa[a.id]?.presentes ?? 0, ppa[a.id]?.total ?? 0),
            cargo: a.cargo ?? '',
            isProfessor: (a.responsavel ?? '').startsWith('professor:'),
          }))
          .sort((a: any, b: any) => b.pct - a.pct || b.presenca - a.presenca)

        setTop10(lista.slice(0, 10))

        const porSala: Record<string, typeof lista> = {}
        for (const a of lista) {
          if (!porSala[a.sala]) porSala[a.sala] = []
          porSala[a.sala].push(a)
        }
        const topS: Record<string, { nome: string; presenca: number; total: number }[]> = {}
        for (const sala in porSala) topS[sala] = porSala[sala].slice(0, 5).map((a: any) => ({ nome: a.nome, presenca: a.presenca, total: a.total }))
        setTopPorSala(topS)
        if (!salaSelecionada && Object.keys(topS).length > 0) setSalaSelecionada(Object.keys(topS)[0])
      } else {
        setDadosPorSala([])
        setTopPorSala({})
        setTop10([])
      }
    }
    load()
    return () => { cancelado = true }
  }, [ano, periodo, trimestre, mes])

  const dadosGrafico: PontoDado[] = useMemo(() => {
    if (periodo === 'anual') return dadosAnual
    if (periodo === 'trimestral') return TRIMESTRES[trimestre].meses.map((m) => dadosAnual[m]).filter(Boolean)
    return dadosDomingos[ano]?.[mes] ?? []
  }, [periodo, trimestre, mes, ano, dadosAnual, dadosDomingos])

  const labelPeriodo = labelDoPeriodo({ periodo, ano, mes, trimestre })
  const topAlunos = topPorSala[salaSelecionada] ?? []

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header + Ações Rápidas minimalistas */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 mb-3">Bem-vindo ao sistema de gestão EBD</p>
        <div className="flex flex-wrap gap-2">
          {([
            { title: 'Chamada',    href: '/chamada',    Icon: CheckCircle2 },
            { title: 'Alunos',     href: '/alunos',     Icon: Users        },
            { title: 'Escalas',    href: '/escala',     Icon: Calendar     },
            { title: 'Relatórios', href: '/relatorios', Icon: TrendingUp   },
          ] as const).map(({ title, href, Icon }) => (
            <a
              key={href} href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-sm font-medium"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {title}
            </a>
          ))}
        </div>
      </div>

      {/* Stats mobile: card compacto 2×2 */}
      <div className="sm:hidden rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-2 gap-0">
          <div className="flex items-center gap-3 p-4 border-r border-b">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0"><Users className="h-4 w-4 text-primary" /></div>
            <div>
              <div className="text-xl font-bold">{stats.totalAlunos}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Alunos</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0"><GraduationCap className="h-4 w-4 text-primary" /></div>
            <div>
              <div className="text-xl font-bold">{stats.totalProfessores}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Professores</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 border-r">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0"><BookOpen className="h-4 w-4 text-primary" /></div>
            <div>
              <div className="text-xl font-bold">{stats.totalTurmas}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Turmas</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0"><TrendingUp className="h-4 w-4 text-green-500" /></div>
            <div>
              <div className="text-xl font-bold text-green-600">{stats.presencaMedia > 0 ? `${stats.presencaMedia}%` : '—'}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Presença</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats desktop: grid de StatCards */}
      <div className="hidden sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Alunos" value={stats.totalAlunos}      icon={Users}         description="Ativos no sistema" />
        <StatCard title="Professores"      value={stats.totalProfessores}  icon={GraduationCap} description="Cadastrados" />
        <StatCard title="Turmas Ativas"    value={stats.totalTurmas}       icon={BookOpen}      description="Todas as faixas etárias" />
        <StatCard title="Presença Média"   value={stats.presencaMedia > 0 ? `${stats.presencaMedia}%` : '—'} icon={TrendingUp} description="No período atual" />
      </div>

      {/* Seção de análise */}
      <div className="space-y-5">
        {/* Seletor de período + gráfico evolução */}
        <PeriodSelector
          periodo={periodo} ano={ano} mes={mes} trimestre={trimestre}
          onPeriodo={setPeriodo} onAno={setAno} onMes={setMes} onTrimestre={setTrimestre}
          label={labelPeriodo}
        >
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm font-semibold mb-1">Evolução de Presença</p>
            <p className="text-xs text-muted-foreground mb-3">Total de presentes e % no período selecionado</p>
            {dadosGrafico.length > 0 ? (
              <div className="h-[200px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosGrafico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradPresentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Area yAxisId="left" type="monotone" dataKey="presentes" name="Presentes" stroke="#6366f1" fill="url(#gradPresentes)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2 }} animationDuration={800} />
                    <Area yAxisId="right" type="monotone" dataKey="pct" name="Presença %" stroke="#22c55e" fill="url(#gradPct)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2 }} animationDuration={800} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[200px] sm:h-[280px]" />
            )}
          </div>
        </PeriodSelector>

        {/* Presença por Sala */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Presença Média por Sala</CardTitle>
            <CardDescription>{labelPeriodo} — percentual médio por turma</CardDescription>
          </CardHeader>
          <CardContent>
            {dadosPorSala.length > 0 ? (
              <>
                <div className="h-[200px] sm:h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosPorSala} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                      <XAxis dataKey="sala" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => {
                          const s = (v as string).replace('Crianças - ', '').replace('Adultos - ', '')
                          return s.length > 12 ? s.slice(0, 11) + '…' : s
                        }}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Presença média']} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                      <Bar dataKey="presencaMedia" name="Presença %" radius={[8, 8, 0, 0]} animationDuration={600}>
                        {dadosPorSala.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
                  {dadosPorSala.map((sala) => (
                    <div key={sala.sala} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: sala.cor }} />
                      <span className="text-xs text-muted-foreground">{sala.sala}</span>
                      <span className="text-xs font-semibold">{sala.presencaMedia}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[220px]" />
            )}
          </CardContent>
        </Card>

        {/* Rankings */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Destaques por Sala */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Destaques por Sala
              </CardTitle>
              <CardDescription>Top 5 alunos com maior presença no período</CardDescription>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.keys(topPorSala).length > 0 ? Object.keys(topPorSala).map((sala) => (
                  <button
                    key={sala}
                    onClick={() => setSalaSelecionada(sala)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${salaSelecionada === sala ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
                  >
                    {sala}
                  </button>
                )) : <span className="text-xs text-muted-foreground">Nenhuma turma com dados</span>}
              </div>
            </CardHeader>
            <CardContent>
              {topAlunos.length > 0 ? (
                <div className="space-y-3">
                  {topAlunos.map((aluno, idx) => {
                    const pct = calcularPct(aluno.presenca, aluno.total)
                    const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`
                    return (
                      <div key={aluno.nome} className="flex items-center gap-3">
                        <span className={`w-7 text-center flex-shrink-0 ${idx < 3 ? 'text-xl' : 'text-sm font-bold text-muted-foreground'}`}>{medalha}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{aluno.nome}</span>
                            <span className="text-xs font-bold text-primary ml-2 flex-shrink-0">{pct}%</span>
                          </div>
                          <PresenceBar pct={pct} presentes={aluno.presenca} total={aluno.total} />
                          <p className="text-[10px] text-muted-foreground mt-0.5">{aluno.presenca} de {aluno.total} domingos</p>
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

          {/* Top 10 Geral — com cargo e badge professor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-500" />
                Top 10 Mais Frequentes
              </CardTitle>
              <CardDescription>Alunos com maior presença geral no período</CardDescription>
            </CardHeader>
            <CardContent>
              {top10.length > 0 ? (
                <div className="space-y-2">
                  {top10.map((aluno, idx) => {
                    const cargoInfo = getCargo(aluno.cargo)
                    return (
                      <div key={`${aluno.nome}-${idx}`} className="flex items-center gap-3 py-1">
                        <span className={`flex-shrink-0 w-6 text-center text-sm font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {idx + 1}º
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm font-medium">{aluno.nome}</span>
                            {aluno.isProfessor && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-400 text-blue-400">Prof</Badge>
                            )}
                            {cargoInfo && (
                              <span
                                className="text-[9px] font-semibold px-1.5 rounded-full border leading-4 inline-flex items-center"
                                style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}
                              >
                                {cargoInfo.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{aluno.sala}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${aluno.pct === 100 ? 'bg-green-500/15 text-green-600' : aluno.pct >= 90 ? 'bg-primary/15 text-primary' : 'bg-yellow-500/15 text-yellow-600'}`}>
                            {aluno.pct}%
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{aluno.presenca}/{aluno.total}</p>
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
      </div>

      {/* Turmas + Histórico */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Turmas Ativas</CardTitle>
            <CardDescription>Turmas cadastradas e seus professores</CardDescription>
          </CardHeader>
          <CardContent>
            {turmasAtivas.length > 0 ? (
              <div className="space-y-4">
                {turmasAtivas.map((aula) => (
                  <div key={aula.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <p className="font-medium">{aula.turma}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{aula.professor}</p>
                    </div>
                    <Badge variant="secondary">{aula.alunos} alunos</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhuma turma cadastrada" />
            )}
          </CardContent>
        </Card>

        {/* Histórico: chamadas + visitantes cadastrados */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Histórico Recente</CardTitle>
            <CardDescription>Chamadas e visitantes registrados recentemente</CardDescription>
          </CardHeader>
          <CardContent>
            {chamadasRecentes.length === 0 && visitantesRecentes.length === 0 ? (
              <EmptyState message="Nenhum registro encontrado" />
            ) : (
              <div className="space-y-1">
                {chamadasRecentes.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 py-2">
                    <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500 flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none">{c.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/70">{c.modificadoEm}</span>
                        {c.ebdDate !== '—' && (
                          <span className="ml-1 text-muted-foreground/60">· EBD {c.ebdDate}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                {visitantesRecentes.length > 0 && (
                  <div className="pt-2 mt-1 border-t">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Visitantes cadastrados</p>
                    {visitantesRecentes.map((v) => (
                      <div key={v.id} className="flex items-start gap-3 py-1.5">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 flex-shrink-0 mt-0.5">
                          <UserPlus className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none">{v.nome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-medium text-foreground/70">{v.modificadoEm}</span>
                            <span className="ml-1 text-muted-foreground/60">· {v.turma}</span>
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

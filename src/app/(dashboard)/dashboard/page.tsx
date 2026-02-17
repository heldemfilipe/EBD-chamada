"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, GraduationCap, BookOpen, TrendingUp, Clock,
  CheckCircle2, Calendar, Trophy, Star, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Periodo = 'mensal' | 'trimestral' | 'anual'

// ─── Constantes estáticas ─────────────────────────────────────────────────────
const ANOS_DISPONIVEIS = [2024, 2025, 2026]

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const TRIMESTRES = [
  { label: '1º Trim', desc: 'Jan – Mar', meses: [0, 1, 2] },
  { label: '2º Trim', desc: 'Abr – Jun', meses: [3, 4, 5] },
  { label: '3º Trim', desc: 'Jul – Set', meses: [6, 7, 8] },
  { label: '4º Trim', desc: 'Out – Dez', meses: [9, 10, 11] },
]

// Constante estática — apenas cores e nomes de salas (sem dados de presença)
const salasMock = [
  { sala: 'Pequeninos', cor: '#EAB308' },
  { sala: 'Juniores', cor: '#F97316' },
  { sala: 'Adolescentes', cor: '#3B82F6' },
  { sala: 'Jovens', cor: '#A855F7' },
  { sala: 'Adultos Casais', cor: '#22C55E' },
  { sala: 'Maturidade', cor: '#14B8A6' },
]

const corSalaBg: Record<string, string> = {
  'Pequeninos': 'bg-yellow-500', 'Juniores': 'bg-orange-500',
  'Adolescentes': 'bg-blue-500', 'Jovens': 'bg-purple-500',
  'Adultos Casais': 'bg-green-500', 'Maturidade': 'bg-teal-500',
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const TooltipPresenca = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <span className="font-bold">{p.value}{p.name === 'Presença %' ? '%' : ''}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mensal')
  const [anoSelecionado, setAnoSelecionado] = useState(2026)
  const [trimestreSelecionado, setTrimestreSelecionado] = useState(0) // índice 0–3
  const [mesSelecionado, setMesSelecionado] = useState(1) // índice 0–11 (fev = 1)
  const [salaSelecionada, setSalaSelecionada] = useState('Jovens')

  // Estados de dados — inicializados vazios
  const [stats, setStats] = useState({ totalAlunos: 0, totalProfessores: 0, totalTurmas: 0, presencaMedia: 0 })
  const [dadosGraficoAnual, setDadosGraficoAnual] = useState<{ periodo: string; presentes: number; total: number; pct: number }[]>([])
  const [dadosGraficoDomingos, setDadosGraficoDomingos] = useState<Record<number, Record<number, { periodo: string; presentes: number; total: number; pct: number }[]>>>({})
  const [dadosPorSala, setDadosPorSala] = useState<{ sala: string; cor: string; presencaMedia: number }[]>([])
  const [topAlunosPorSala, setTopAlunosPorSala] = useState<Record<string, { nome: string; presenca: number; total: number }[]>>({})
  const [top10Geral, setTop10Geral] = useState<{ nome: string; sala: string; presenca: number; total: number; pct: number }[]>([])
  const [recentActivities, setRecentActivities] = useState<{ id: number; description: string; time: string; status: string }[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<{ id: number; turma: string; professor: string; horario: string; alunos: number }[]>([])

  useEffect(() => {
    // TODO: buscar do Supabase
    // const [turmas, professores, alunos, chamadas] = await Promise.all([...])
    // setStats({ totalAlunos: ..., totalProfessores: ..., totalTurmas: ..., presencaMedia: ... })
  }, [])

  useEffect(() => {
    // TODO: buscar do Supabase
    // Buscar dados de presença por mês para o ano selecionado
    // const { data } = await supabase.rpc('get_presenca_mensal', { ano: anoSelecionado })
    // setDadosGraficoAnual(data ?? [])
  }, [anoSelecionado])

  useEffect(() => {
    // TODO: buscar do Supabase
    // Buscar dados de presença por domingo para o mês selecionado
    // const { data } = await supabase.rpc('get_presenca_domingos', { ano: anoSelecionado, mes: mesSelecionado })
    // setDadosGraficoDomingos(prev => ({ ...prev, [anoSelecionado]: { ...prev[anoSelecionado], [mesSelecionado]: data ?? [] } }))
  }, [anoSelecionado, mesSelecionado])

  useEffect(() => {
    // TODO: buscar do Supabase
    // Buscar presença média por sala no período selecionado
    // const { data } = await supabase.rpc('get_presenca_por_sala', { ano: anoSelecionado, periodo })
    // setDadosPorSala(data ?? [])
  }, [anoSelecionado, periodo, trimestreSelecionado, mesSelecionado])

  useEffect(() => {
    // TODO: buscar do Supabase
    // const { data } = await supabase.rpc('get_top_alunos_por_sala', { ano: anoSelecionado })
    // setTopAlunosPorSala(data ?? {})
    // const { data: top10 } = await supabase.rpc('get_top10_alunos', { ano: anoSelecionado })
    // setTop10Geral(top10 ?? [])
  }, [anoSelecionado])

  useEffect(() => {
    // TODO: buscar do Supabase
    // const { data: activities } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(4)
    // setRecentActivities(activities ?? [])
    // const { data: upcoming } = await supabase.rpc('get_proximas_aulas')
    // setUpcomingClasses(upcoming ?? [])
  }, [])

  // ── Calcula dados do gráfico de linha conforme período ──
  const dadosGrafico = (() => {
    if (periodo === 'anual') return dadosGraficoAnual

    if (periodo === 'trimestral') {
      const trim = TRIMESTRES[trimestreSelecionado]
      return trim.meses.map((m) => dadosGraficoAnual[m]).filter(Boolean)
    }

    // mensal → domingos do mês
    const domingos = dadosGraficoDomingos[anoSelecionado]?.[mesSelecionado]
    if (domingos && domingos.length > 0) return domingos
    return []
  })()

  // ── Label do período selecionado ──
  const labelPeriodo =
    periodo === 'anual' ? `Ano ${anoSelecionado}` :
    periodo === 'trimestral' ? `${TRIMESTRES[trimestreSelecionado].label} ${anoSelecionado} (${TRIMESTRES[trimestreSelecionado].desc})` :
    `${MESES[mesSelecionado]} de ${anoSelecionado}`

  const topAlunos = topAlunosPorSala[salaSelecionada] || []

  // ── Navegação: ano ──
  const anoIdx = ANOS_DISPONIVEIS.indexOf(anoSelecionado)
  const podePrevAno = anoIdx > 0
  const podeNextAno = anoIdx < ANOS_DISPONIVEIS.length - 1

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bem-vindo ao sistema de gestão EBD</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlunos}</div>
            <p className="text-xs text-muted-foreground">Ativos no sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professores</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProfessores}</div>
            <p className="text-xs text-muted-foreground">Cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas Ativas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTurmas}</div>
            <p className="text-xs text-muted-foreground">Todas as faixas etárias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presença Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presencaMedia > 0 ? `${stats.presencaMedia}%` : '—'}</div>
            <p className="text-xs text-muted-foreground">No período atual</p>
          </CardContent>
        </Card>
      </div>

      {/* ═══ SEÇÃO DE ANÁLISE ═══ */}
      <div className="space-y-5">

        {/* Cabeçalho + controles de período */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b bg-muted/30">
            <div>
              <h2 className="text-lg font-semibold">Análise de Presença</h2>
              <p className="text-sm text-muted-foreground">{labelPeriodo}</p>
            </div>
            {/* Toggle de modo */}
            <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/40 self-start sm:self-auto">
              {(['mensal', 'trimestral', 'anual'] as Periodo[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    periodo === p
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {p === 'mensal' ? 'Mensal' : p === 'trimestral' ? 'Trimestral' : 'Anual'}
                </button>
              ))}
            </div>
          </div>

          {/* Seletor de Ano */}
          <div className="px-5 py-3 border-b bg-muted/10">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ano</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => podePrevAno && setAnoSelecionado(ANOS_DISPONIVEIS[anoIdx - 1])}
                  disabled={!podePrevAno}
                  className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div className="flex gap-1">
                  {ANOS_DISPONIVEIS.map((ano) => (
                    <button
                      key={ano}
                      onClick={() => setAnoSelecionado(ano)}
                      className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
                        anoSelecionado === ano
                          ? 'bg-primary text-primary-foreground'
                          : 'border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {ano}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => podeNextAno && setAnoSelecionado(ANOS_DISPONIVEIS[anoIdx + 1])}
                  disabled={!podeNextAno}
                  className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Seletor de Trimestre (só aparece no modo trimestral) */}
          {periodo === 'trimestral' && (
            <div className="px-5 py-3 border-b bg-muted/10">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trimestre</span>
                <div className="flex gap-1.5 flex-wrap">
                  {TRIMESTRES.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTrimestreSelecionado(idx)}
                      className={`flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        trimestreSelecionado === idx
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      <span className="font-bold">{t.label}</span>
                      <span className={`text-[10px] ${trimestreSelecionado === idx ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Seletor de Mês (só aparece no modo mensal) */}
          {periodo === 'mensal' && (
            <div className="px-5 py-3 border-b bg-muted/10">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mês</span>
                <div className="flex gap-1 flex-wrap">
                  {MESES_CURTOS.map((mes, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMesSelecionado(idx)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                        mesSelecionado === idx
                          ? 'bg-primary text-primary-foreground'
                          : 'border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {mes}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Gráfico 1: Presença ao longo do tempo */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm font-semibold mb-1">Evolução de Presença</p>
            <p className="text-xs text-muted-foreground mb-3">Total de presentes e % no período selecionado</p>
            {dadosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dadosGrafico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPresentes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<TooltipPresenca />} />
                  <Area yAxisId="left" type="monotone" dataKey="presentes" name="Presentes" stroke="#6366f1" fill="url(#gradPresentes)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area yAxisId="right" type="monotone" dataKey="pct" name="Presença %" stroke="#22c55e" fill="url(#gradPct)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                Sem dados para o período selecionado
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Presença por Sala */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Presença Média por Sala</CardTitle>
            <CardDescription>{labelPeriodo} — percentual médio por turma</CardDescription>
          </CardHeader>
          <CardContent>
            {dadosPorSala.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosPorSala} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barSize={30}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                    <XAxis dataKey="sala" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, 'Presença média']}
                      labelStyle={{ fontWeight: 600 }}
                      contentStyle={{ borderRadius: 10, fontSize: 13 }}
                    />
                    <Bar dataKey="presencaMedia" name="Presença %" radius={[6, 6, 0, 0]}>
                      {dadosPorSala.map((entry, index) => (
                        <Cell key={index} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rankings */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Top Alunos por Sala */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Destaques por Sala
              </CardTitle>
              <CardDescription>Top 3 alunos com maior presença no período</CardDescription>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.keys(topAlunosPorSala).length > 0 ? (
                  Object.keys(topAlunosPorSala).map((sala) => (
                    <button
                      key={sala}
                      onClick={() => setSalaSelecionada(sala)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                        salaSelecionada === sala
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {sala}
                    </button>
                  ))
                ) : (
                  salasMock.map((s) => (
                    <button
                      key={s.sala}
                      onClick={() => setSalaSelecionada(s.sala)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                        salaSelecionada === s.sala
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {s.sala}
                    </button>
                  ))
                )}
              </div>
            </CardHeader>
            <CardContent>
              {topAlunos.length > 0 ? (
                <div className="space-y-3">
                  {topAlunos.map((aluno, idx) => {
                    const pct = Math.round((aluno.presenca / aluno.total) * 100)
                    const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'
                    return (
                      <div key={aluno.nome} className="flex items-center gap-3">
                        <span className="text-xl w-7 text-center flex-shrink-0">{medalha}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{aluno.nome}</span>
                            <span className="text-xs font-bold text-primary ml-2 flex-shrink-0">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct >= 90 ? 'bg-primary' : 'bg-yellow-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{aluno.presenca} de {aluno.total} domingos</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  Sem dados para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 10 Geral */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-500" />
                Top 10 Mais Frequentes
              </CardTitle>
              <CardDescription>Alunos com maior presença geral no período</CardDescription>
            </CardHeader>
            <CardContent>
              {top10Geral.length > 0 ? (
                <div className="space-y-2">
                  {top10Geral.map((aluno, idx) => (
                    <div key={aluno.nome} className="flex items-center gap-3 py-1">
                      <span className={`flex-shrink-0 w-6 text-center text-sm font-bold ${
                        idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-600' : 'text-muted-foreground'
                      }`}>{idx + 1}º</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{aluno.nome}</span>
                          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${corSalaBg[aluno.sala] || 'bg-muted'}`} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{aluno.sala}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          aluno.pct === 100 ? 'bg-green-500/15 text-green-600' :
                          aluno.pct >= 90 ? 'bg-primary/15 text-primary' :
                          'bg-yellow-500/15 text-yellow-600'
                        }`}>{aluno.pct}%</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{aluno.presenca}/{aluno.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  Sem dados para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Próximas Aulas + Atividades Recentes ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Próximas Aulas</CardTitle>
            <CardDescription>Programação das aulas para o próximo domingo</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingClasses.length > 0 ? (
              <div className="space-y-4">
                {upcomingClasses.map((aula) => (
                  <div key={aula.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <p className="font-medium">{aula.turma}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{aula.professor}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        {aula.horario}
                      </div>
                      <Badge variant="secondary">{aula.alunos} alunos</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Nenhuma aula programada
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas atualizações no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${activity.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {activity.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Nenhuma atividade recente
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às funcionalidades mais usadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard title="Fazer Chamada" description="Registrar presença dos alunos" href="/chamada" icon={<CheckCircle2 className="h-5 w-5" />} />
            <QuickActionCard title="Cadastrar Aluno" description="Adicionar novo aluno" href="/alunos" icon={<Users className="h-5 w-5" />} />
            <QuickActionCard title="Ver Escalas" description="Gerenciar escalas de professores" href="/escala" icon={<Calendar className="h-5 w-5" />} />
            <QuickActionCard title="Relatórios" description="Visualizar estatísticas" href="/relatorios" icon={<TrendingUp className="h-5 w-5" />} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuickActionCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode }) {
  return (
    <a href={href} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent hover:border-primary/50 transition-all cursor-pointer group">
      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  )
}

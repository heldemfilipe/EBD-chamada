"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { PresenceBar } from '@/components/ui/presence-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { PeriodSelector, labelDoPeriodo } from '@/components/ui/period-selector'
import { ChartTooltip } from '@/components/ui/chart-tooltip'
import {
  Users, GraduationCap, BookOpen, TrendingUp,
  CheckCircle2, Calendar, Trophy, Star,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { ANOS_DISPONIVEIS, MESES_CURTOS, TRIMESTRES } from '@/lib/constants'
import { calcularPct, resolverCor, corBarraPresenca } from '@/lib/presence'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Periodo = 'mensal' | 'trimestral' | 'anual'

type PontoDado = { periodo: string; presentes: number; total: number; pct: number }

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const db = supabase as any

  const [periodo, setPeriodo] = useState<Periodo>('mensal')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [trimestre, setTrimestre] = useState(Math.floor(new Date().getMonth() / 3))
  const [mes, setMes] = useState(new Date().getMonth())
  const [salaSelecionada, setSalaSelecionada] = useState('')

  const [stats, setStats] = useState({ totalAlunos: 0, totalProfessores: 0, totalTurmas: 0, presencaMedia: 0 })
  const [dadosAnual, setDadosAnual] = useState<PontoDado[]>([])
  const [dadosDomingos, setDadosDomingos] = useState<Record<number, Record<number, PontoDado[]>>>({})
  const [dadosPorSala, setDadosPorSala] = useState<{ sala: string; cor: string; presencaMedia: number }[]>([])
  const [topPorSala, setTopPorSala] = useState<Record<string, { nome: string; presenca: number; total: number }[]>>({})
  const [top10, setTop10] = useState<{ nome: string; sala: string; presenca: number; total: number; pct: number }[]>([])
  const [turmasAtivas, setTurmasAtivas] = useState<{ id: string; turma: string; professor: string; alunos: number }[]>([])
  const [chamadasRecentes, setChamadasRecentes] = useState<{ id: string; description: string; time: string }[]>([])

  // Stats gerais
  useEffect(() => {
    async function load() {
      const [{ count: totalAlunos }, { count: totalProfessores }, { count: totalTurmas }] = await Promise.all([
        db.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true),
        db.from('professores').select('id', { count: 'exact', head: true }).eq('ativo', true),
        db.from('turmas').select('id', { count: 'exact', head: true }).eq('ativa', true),
      ])

      const anoAtual = new Date().getFullYear()
      const { data: chamadas } = await db.from('chamadas').select('id').eq('ano', anoAtual)
      let presencaMedia = 0
      if (chamadas?.length) {
        const { data: ps } = await db.from('presencas').select('presente').in('chamada_id', chamadas.map((c: any) => c.id))
        if (ps?.length) presencaMedia = calcularPct(ps.filter((p: any) => p.presente).length, ps.length)
      }

      setStats({ totalAlunos: totalAlunos ?? 0, totalProfessores: totalProfessores ?? 0, totalTurmas: totalTurmas ?? 0, presencaMedia })
    }
    load()
  }, [])

  // Gráfico anual
  useEffect(() => {
    async function load() {
      const { data: chamadas } = await db.from('chamadas').select('id, data, presencas(presente)').eq('ano', ano)
      if (!chamadas?.length) { setDadosAnual([]); return }

      const porMes: Record<number, { presentes: number; total: number }> = {}
      for (let i = 0; i < 12; i++) porMes[i] = { presentes: 0, total: 0 }

      for (const c of chamadas) {
        const m = parseISO(c.data).getMonth()
        const ps = c.presencas ?? []
        porMes[m].total += ps.length
        porMes[m].presentes += ps.filter((p: any) => p.presente).length
      }

      setDadosAnual(MESES_CURTOS.map((label, i) => ({
        periodo: label,
        presentes: porMes[i].presentes,
        total: porMes[i].total,
        pct: calcularPct(porMes[i].presentes, porMes[i].total),
      })))
    }
    load()
  }, [ano])

  // Gráfico domingos do mês
  useEffect(() => {
    async function load() {
      const m = String(mes + 1).padStart(2, '0')
      const { data: chamadas } = await db
        .from('chamadas')
        .select('id, data, presencas(presente)')
        .eq('ano', ano)
        .gte('data', `${ano}-${m}-01`)
        .lte('data', `${ano}-${m}-31`)

      const dados: PontoDado[] = chamadas?.map((c: any) => {
        const ps = c.presencas ?? []
        const presentes = ps.filter((p: any) => p.presente).length
        return { periodo: format(parseISO(c.data), 'dd/MM', { locale: ptBR }), presentes, total: ps.length, pct: calcularPct(presentes, ps.length) }
      }) ?? []

      setDadosDomingos(prev => ({ ...prev, [ano]: { ...(prev[ano] ?? {}), [mes]: dados } }))
    }
    load()
  }, [ano, mes])

  // Presença por sala
  useEffect(() => {
    async function load() {
      const { data: turmas } = await db.from('turmas').select('id, nome, cor').eq('ativa', true)
      if (!turmas?.length) { setDadosPorSala([]); return }

      let dataInicio = `${ano}-01-01`, dataFim = `${ano}-12-31`
      if (periodo === 'trimestral') {
        const mi = TRIMESTRES[trimestre].meses[0] + 1, mf = TRIMESTRES[trimestre].meses[2] + 1
        dataInicio = `${ano}-${String(mi).padStart(2, '0')}-01`
        dataFim    = `${ano}-${String(mf).padStart(2, '0')}-31`
      } else if (periodo === 'mensal') {
        const m = String(mes + 1).padStart(2, '0')
        dataInicio = `${ano}-${m}-01`; dataFim = `${ano}-${m}-31`
      }

      const resultado = await Promise.all(turmas.map(async (turma: any, idx: number) => {
        const { data: chamadas } = await db
          .from('chamadas').select('id, presencas(presente)')
          .eq('turma_id', turma.id).gte('data', dataInicio).lte('data', dataFim)
        let total = 0, presentes = 0
        for (const c of chamadas ?? []) {
          const ps = c.presencas ?? []
          total += ps.length
          presentes += ps.filter((p: any) => p.presente).length
        }
        return { sala: turma.nome, cor: resolverCor(turma.cor, idx), presencaMedia: calcularPct(presentes, total) }
      }))

      setDadosPorSala(resultado)
    }
    load()
  }, [ano, periodo, trimestre, mes])

  // Top alunos
  useEffect(() => {
    async function load() {
      const { data: chamadas } = await db.from('chamadas').select('id, turma_id').eq('ano', ano)
      const { data: alunos } = await db.from('alunos').select('id, nome, turma_id, turmas(nome)').eq('ativo', true)
      if (!chamadas?.length || !alunos?.length) { setTopPorSala({}); setTop10([]); return }

      const { data: presencas } = await db.from('presencas').select('aluno_id, presente').in('chamada_id', chamadas.map((c: any) => c.id))
      if (!presencas) { setTopPorSala({}); setTop10([]); return }

      const ppa: Record<string, { presentes: number; total: number }> = {}
      for (const p of presencas) {
        if (!ppa[p.aluno_id]) ppa[p.aluno_id] = { presentes: 0, total: 0 }
        ppa[p.aluno_id].total++
        if (p.presente) ppa[p.aluno_id].presentes++
      }

      const lista = alunos
        .filter((a: any) => ppa[a.id]?.total > 0)
        .map((a: any) => ({
          id: a.id, nome: a.nome, sala: a.turmas?.nome ?? 'Sem turma',
          presenca: ppa[a.id]?.presentes ?? 0, total: ppa[a.id]?.total ?? 0,
          pct: calcularPct(ppa[a.id]?.presentes ?? 0, ppa[a.id]?.total ?? 0),
        }))
        .sort((a: any, b: any) => b.pct - a.pct || b.presenca - a.presenca)

      setTop10(lista.slice(0, 10))

      const porSala: Record<string, typeof lista> = {}
      for (const a of lista) {
        if (!porSala[a.sala]) porSala[a.sala] = []
        porSala[a.sala].push(a)
      }
      const topS: Record<string, { nome: string; presenca: number; total: number }[]> = {}
      for (const sala in porSala) topS[sala] = porSala[sala].slice(0, 3).map((a: any) => ({ nome: a.nome, presenca: a.presenca, total: a.total }))
      setTopPorSala(topS)
      if (!salaSelecionada && Object.keys(topS).length > 0) setSalaSelecionada(Object.keys(topS)[0])
    }
    load()
  }, [ano])

  // Turmas ativas
  useEffect(() => {
    async function load() {
      const { data: turmas } = await db.from('turmas').select('id, nome, professor_turmas(professores(nome)), alunos(id)').eq('ativa', true)
      setTurmasAtivas((turmas ?? []).map((t: any) => ({
        id: t.id, turma: t.nome, alunos: (t.alunos ?? []).length,
        professor: (t.professor_turmas ?? []).map((pt: any) => pt.professores?.nome).filter(Boolean).join(', ') || 'Sem professor',
      })))
    }
    load()
  }, [])

  // Chamadas recentes
  useEffect(() => {
    async function load() {
      const { data: chamadas } = await db.from('chamadas').select('id, data, turmas(nome), presencas(presente)').order('data', { ascending: false }).limit(5)
      setChamadasRecentes((chamadas ?? []).map((c: any) => {
        const presentes = (c.presencas ?? []).filter((p: any) => p.presente).length
        const total = (c.presencas ?? []).length
        return {
          id: c.id,
          description: `Chamada "${c.turmas?.nome ?? 'Turma'}" — ${presentes}/${total} presentes`,
          time: format(parseISO(c.data), 'dd/MM/yyyy', { locale: ptBR }),
        }
      }))
    }
    load()
  }, [])

  // Dados para o gráfico de linha
  const dadosGrafico: PontoDado[] = (() => {
    if (periodo === 'anual') return dadosAnual
    if (periodo === 'trimestral') return TRIMESTRES[trimestre].meses.map((m) => dadosAnual[m]).filter(Boolean)
    return dadosDomingos[ano]?.[mes] ?? []
  })()

  const labelPeriodo = labelDoPeriodo({ periodo, ano, mes, trimestre })
  const topAlunos = topPorSala[salaSelecionada] ?? []

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bem-vindo ao sistema de gestão EBD</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Alunos"  value={stats.totalAlunos}      icon={Users}         description="Ativos no sistema" />
        <StatCard title="Professores"       value={stats.totalProfessores}  icon={GraduationCap} description="Cadastrados" />
        <StatCard title="Turmas Ativas"     value={stats.totalTurmas}       icon={BookOpen}      description="Todas as faixas etárias" />
        <StatCard title="Presença Média"    value={stats.presencaMedia > 0 ? `${stats.presencaMedia}%` : '—'} icon={TrendingUp} description="No período atual" />
      </div>

      {/* Seção de análise */}
      <div className="space-y-5">
        {/* Seletor de período */}
        <PeriodSelector
          periodo={periodo} ano={ano} mes={mes} trimestre={trimestre}
          onPeriodo={setPeriodo} onAno={setAno} onMes={setMes} onTrimestre={setTrimestre}
          label={labelPeriodo}
        >
          {/* Gráfico de evolução */}
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
                  <Tooltip content={<ChartTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="presentes" name="Presentes" stroke="#6366f1" fill="url(#gradPresentes)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area yAxisId="right" type="monotone" dataKey="pct" name="Presença %" stroke="#22c55e" fill="url(#gradPct)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[240px]" />
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
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosPorSala} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barSize={30}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                    <XAxis dataKey="sala" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Presença média']} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                    <Bar dataKey="presencaMedia" name="Presença %" radius={[6, 6, 0, 0]}>
                      {dadosPorSala.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
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
              <CardDescription>Top 3 alunos com maior presença no período</CardDescription>
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
                    const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'
                    return (
                      <div key={aluno.nome} className="flex items-center gap-3">
                        <span className="text-xl w-7 text-center flex-shrink-0">{medalha}</span>
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
              {top10.length > 0 ? (
                <div className="space-y-2">
                  {top10.map((aluno, idx) => (
                    <div key={aluno.nome} className="flex items-center gap-3 py-1">
                      <span className={`flex-shrink-0 w-6 text-center text-sm font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {idx + 1}º
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{aluno.nome}</span>
                        <p className="text-[10px] text-muted-foreground">{aluno.sala}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${aluno.pct === 100 ? 'bg-green-500/15 text-green-600' : aluno.pct >= 90 ? 'bg-primary/15 text-primary' : 'bg-yellow-500/15 text-yellow-600'}`}>
                          {aluno.pct}%
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{aluno.presenca}/{aluno.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Turmas + Chamadas Recentes */}
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

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Chamadas Recentes</CardTitle>
            <CardDescription>Últimas chamadas registradas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {chamadasRecentes.length > 0 ? (
              <div className="space-y-4">
                {chamadasRecentes.map((c) => (
                  <div key={c.id} className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{c.description}</p>
                      <p className="text-xs text-muted-foreground">{c.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhuma chamada registrada ainda" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às funcionalidades mais usadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction title="Fazer Chamada"      description="Registrar presença dos alunos" href="/chamada"   icon={<CheckCircle2 className="h-5 w-5" />} />
            <QuickAction title="Cadastrar Aluno"    description="Adicionar novo aluno"          href="/alunos"    icon={<Users className="h-5 w-5" />} />
            <QuickAction title="Ver Escalas"        description="Gerenciar escalas"             href="/escala"    icon={<Calendar className="h-5 w-5" />} />
            <QuickAction title="Relatórios"         description="Visualizar estatísticas"       href="/relatorios" icon={<TrendingUp className="h-5 w-5" />} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function QuickAction({ title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode }) {
  return (
    <a href={href} className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border hover:bg-accent hover:border-primary/50 transition-all cursor-pointer group">
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

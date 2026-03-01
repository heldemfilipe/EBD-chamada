"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ChartTooltip } from '@/components/ui/chart-tooltip'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, Download, Calendar, Users, CheckCircle2, XCircle,
  FileText, BookOpen, Book, DollarSign, UserPlus, Trophy,
  AlertTriangle, ChevronLeft, ChevronRight, BarChart3, Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ANOS_DISPONIVEIS, MESES, MESES_CURTOS, TRIMESTRES } from '@/lib/constants'
import { calcularPct, resolverCor, corPresenca, badgePresenca, labelPresenca, rangeDoPeriodo } from '@/lib/presence'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Granularidade = 'dia' | 'mes' | 'trimestre' | 'ano'

interface DadosDomingo {
  data: string; presentes: number; faltas: number; visitantes: number
  biblias: number; revistas: number; oferta: number; total: number
}
interface DadosMes {
  mes: string; presentes: number; faltas: number; visitantes: number
  biblias: number; revistas: number; oferta: number; total: number; domingos: number
}
interface DadosSala {
  sala: string; cor: string; matriculados: number; presencaMedia: number
  presentes: number; faltas: number; visitantes: number; biblias: number; revistas: number; oferta: number
}
interface AlunoFrequente { nome: string; sala: string; presentes: number; total: number; pct: number; faltas: number }
interface ProfessorDesempenho { nome: string; turmas: string[]; aulas: number; presMedia: number; biblias: number }

function dadosVazios() {
  return { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0, total: 0, domingos: 0, pct: 0 }
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const db = supabase as any

  const [granularidade, setGranularidade] = useState<Granularidade>('mes')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth())
  const [trim, setTrim] = useState(Math.floor(new Date().getMonth() / 3))
  const [domingoIdx, setDomingoIdx] = useState(0)

  const [domingosPorMes, setDomingosPorMes] = useState<Record<number, DadosDomingo[]>>({})
  const [resumoMensal, setResumoMensal] = useState<DadosMes[]>([])
  const [dadosSala, setDadosSala] = useState<DadosSala[]>([])
  const [topAlunos, setTopAlunos] = useState<AlunoFrequente[]>([])
  const [alunosAtencao, setAlunosAtencao] = useState<AlunoFrequente[]>([])
  const [professores, setProfessores] = useState<ProfessorDesempenho[]>([])

  // ── Dados anuais: chamadas + presenças ──
  useEffect(() => {
    async function load() {
      const { data: chamadas } = await db
        .from('chamadas')
        .select('id, data, turma_id, oferta, presencas(presente, trouxe_biblia, trouxe_revista), historico_visitantes(id)')
        .eq('ano', ano)
        .order('data', { ascending: true })

      if (!chamadas?.length) { setDomingosPorMes({}); setResumoMensal([]); return }

      const porMes: Record<number, DadosDomingo[]> = {}
      const mensal: DadosMes[] = Array.from({ length: 12 }, (_, i) => ({
        mes: MESES[i], presentes: 0, faltas: 0, visitantes: 0,
        biblias: 0, revistas: 0, oferta: 0, total: 0, domingos: 0,
      }))

      for (const c of chamadas) {
        const m = parseISO(c.data).getMonth()
        if (!porMes[m]) porMes[m] = []
        const ps = c.presencas ?? []
        const vs = c.historico_visitantes ?? []
        const presentes = ps.filter((p: any) => p.presente).length
        const faltas    = ps.filter((p: any) => !p.presente).length
        const biblias   = ps.filter((p: any) => p.trouxe_biblia).length
        const revistas  = ps.filter((p: any) => p.trouxe_revista).length

        porMes[m].push({
          data: format(parseISO(c.data), 'dd/MM', { locale: ptBR }),
          presentes, faltas, visitantes: vs.length, biblias, revistas,
          oferta: Number(c.oferta) || 0, total: ps.length,
        })

        mensal[m].domingos++
        mensal[m].total    += ps.length
        mensal[m].presentes += presentes
        mensal[m].faltas    += faltas
        mensal[m].biblias   += biblias
        mensal[m].revistas  += revistas
        mensal[m].visitantes += vs.length
        mensal[m].oferta    += Number(c.oferta) || 0
      }

      setDomingosPorMes(porMes)
      setResumoMensal(mensal)
    }
    load()
  }, [ano])

  // ── Dados por sala ──
  useEffect(() => {
    async function load() {
      const { dataInicio, dataFim } = rangeDoPeriodo({ granularidade, ano, mes, trimestre: trim })
      const { data: turmas } = await db.from('turmas').select('id, nome, cor').eq('ativa', true)
      if (!turmas?.length) { setDadosSala([]); return }

      const resultado: DadosSala[] = await Promise.all(turmas.map(async (turma: any, idx: number) => {
        const [{ count: matriculados }, { data: chamadas }] = await Promise.all([
          db.from('alunos').select('id', { count: 'exact', head: true }).eq('turma_id', turma.id).eq('ativo', true),
          db.from('chamadas')
            .select('id, oferta, presencas(presente, trouxe_biblia, trouxe_revista), historico_visitantes(id)')
            .eq('turma_id', turma.id).gte('data', dataInicio).lte('data', dataFim),
        ])

        let presentes = 0, faltas = 0, biblias = 0, revistas = 0, visitantes = 0, oferta = 0, total = 0
        for (const c of chamadas ?? []) {
          const ps = c.presencas ?? []
          total += ps.length
          presentes += ps.filter((p: any) => p.presente).length
          faltas    += ps.filter((p: any) => !p.presente).length
          biblias   += ps.filter((p: any) => p.trouxe_biblia).length
          revistas  += ps.filter((p: any) => p.trouxe_revista).length
          visitantes += (c.historico_visitantes ?? []).length
          oferta    += Number(c.oferta) || 0
        }

        return {
          sala: turma.nome, cor: resolverCor(turma.cor, idx),
          matriculados: matriculados ?? 0, presencaMedia: calcularPct(presentes, total),
          presentes, faltas, visitantes, biblias, revistas, oferta,
        }
      }))

      setDadosSala(resultado)
    }
    load()
  }, [ano, mes, trim, granularidade])

  // ── Top alunos + atenção ──
  useEffect(() => {
    async function load() {
      const { dataInicio, dataFim } = rangeDoPeriodo({ granularidade, ano, mes, trimestre: trim })
      const { data: chamadas } = await db.from('chamadas').select('id').gte('data', dataInicio).lte('data', dataFim)
      if (!chamadas?.length) { setTopAlunos([]); setAlunosAtencao([]); return }

      const { data: presencas } = await db.from('presencas').select('aluno_id, presente').in('chamada_id', chamadas.map((c: any) => c.id))
      if (!presencas?.length) { setTopAlunos([]); setAlunosAtencao([]); return }

      const ppa: Record<string, { presentes: number; total: number }> = {}
      for (const p of presencas) {
        if (!ppa[p.aluno_id]) ppa[p.aluno_id] = { presentes: 0, total: 0 }
        ppa[p.aluno_id].total++
        if (p.presente) ppa[p.aluno_id].presentes++
      }

      const { data: alunos } = await db.from('alunos').select('id, nome, turmas(nome)').in('id', Object.keys(ppa)).eq('ativo', true)
      if (!alunos) { setTopAlunos([]); setAlunosAtencao([]); return }

      const lista: AlunoFrequente[] = alunos
        .filter((a: any) => ppa[a.id]?.total > 0)
        .map((a: any) => {
          const d = ppa[a.id]
          const pct = calcularPct(d.presentes, d.total)
          return { nome: a.nome, sala: a.turmas?.nome ?? 'Sem turma', presentes: d.presentes, total: d.total, pct, faltas: d.total - d.presentes }
        })

      setTopAlunos([...lista].sort((a, b) => b.pct - a.pct || b.presentes - a.presentes).slice(0, 10))
      setAlunosAtencao([...lista].filter(a => a.pct < 75).sort((a, b) => a.pct - b.pct))
    }
    load()
  }, [ano, mes, trim, granularidade])

  // ── Professores ──
  useEffect(() => {
    async function load() {
      const { dataInicio, dataFim } = rangeDoPeriodo({ granularidade, ano, mes, trimestre: trim })
      const { data: profsList } = await db
        .from('professores').select('id, nome, professor_turmas(turma_id, turmas(nome))').eq('ativo', true)
      if (!profsList?.length) { setProfessores([]); return }

      const resultado: ProfessorDesempenho[] = await Promise.all(profsList.map(async (prof: any) => {
        const turmaIds = (prof.professor_turmas ?? []).map((pt: any) => pt.turma_id).filter(Boolean)
        const turmasNomes = (prof.professor_turmas ?? []).map((pt: any) => pt.turmas?.nome).filter(Boolean)

        if (!turmaIds.length) return { nome: prof.nome, turmas: [], aulas: 0, presMedia: 0, biblias: 0 }

        const { data: chamadas } = await db
          .from('chamadas').select('id, presencas(presente, trouxe_biblia)')
          .in('turma_id', turmaIds).gte('data', dataInicio).lte('data', dataFim)

        let totalPresentes = 0, totalAlunos = 0, totalBiblias = 0, aulas = 0
        for (const c of chamadas ?? []) {
          aulas++
          const ps = c.presencas ?? []
          totalAlunos   += ps.length
          totalPresentes += ps.filter((p: any) => p.presente).length
          totalBiblias  += ps.filter((p: any) => p.trouxe_biblia).length
        }

        return {
          nome: prof.nome, turmas: turmasNomes, aulas,
          presMedia: calcularPct(totalPresentes, totalAlunos),
          biblias: totalPresentes > 0 ? calcularPct(totalBiblias, totalPresentes) : 0,
        }
      }))

      setProfessores(resultado.sort((a, b) => b.presMedia - a.presMedia))
    }
    load()
  }, [ano, mes, trim, granularidade])

  // ── Cálculo do resumo do período ──
  const { dados, grafico, labelPeriodo } = (() => {
    const domingos = domingosPorMes[mes] ?? []

    if (granularidade === 'dia') {
      const d = domingos[domingoIdx] ?? { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0, total: 0 }
      return {
        dados: { ...d, domingos: 1, pct: calcularPct(d.presentes, d.total) },
        grafico: domingos.map(dd => ({ periodo: dd.data, presentes: dd.presentes, pct: calcularPct(dd.presentes, dd.total) })),
        labelPeriodo: domingos[domingoIdx] ? `${domingos[domingoIdx].data}/${ano} — ${MESES[mes]}` : `${MESES[mes]} ${ano}`,
      }
    }

    if (granularidade === 'mes') {
      const d = resumoMensal[mes] ?? dadosVazios()
      return {
        dados: { ...d, pct: calcularPct(d.presentes, d.total) },
        grafico: domingos.length > 0
          ? domingos.map(dd => ({ periodo: dd.data, presentes: dd.presentes, pct: calcularPct(dd.presentes, dd.total) }))
          : [{ periodo: MESES_CURTOS[mes], presentes: d.presentes, pct: calcularPct(d.presentes, d.total) }],
        labelPeriodo: `${MESES[mes]} de ${ano}`,
      }
    }

    if (granularidade === 'trimestre') {
      const mesesIdx = TRIMESTRES[trim].meses
      const mesesTrim = mesesIdx.map(i => resumoMensal[i]).filter(Boolean)
      const d = mesesTrim.reduce((acc, m) => ({
        ...acc, presentes: acc.presentes + m.presentes, faltas: acc.faltas + m.faltas,
        visitantes: acc.visitantes + m.visitantes, biblias: acc.biblias + m.biblias,
        revistas: acc.revistas + m.revistas, oferta: acc.oferta + m.oferta,
        domingos: acc.domingos + m.domingos, total: acc.total + m.total,
      }), dadosVazios())
      return {
        dados: { ...d, pct: calcularPct(d.presentes, d.total) },
        grafico: mesesIdx.map(i => ({ periodo: MESES_CURTOS[i], presentes: resumoMensal[i]?.presentes ?? 0, pct: calcularPct(resumoMensal[i]?.presentes ?? 0, resumoMensal[i]?.total ?? 0) })),
        labelPeriodo: `${TRIMESTRES[trim].label} ${ano} (${TRIMESTRES[trim].desc})`,
      }
    }

    // anual
    const d = resumoMensal.reduce((acc, m) => ({
      ...acc, presentes: acc.presentes + m.presentes, faltas: acc.faltas + m.faltas,
      visitantes: acc.visitantes + m.visitantes, biblias: acc.biblias + m.biblias,
      revistas: acc.revistas + m.revistas, oferta: acc.oferta + m.oferta, domingos: acc.domingos + m.domingos, total: acc.total + m.total,
    }), dadosVazios())
    return {
      dados: { ...d, pct: calcularPct(d.presentes, d.total) },
      grafico: MESES_CURTOS.map((label, i) => ({ periodo: label, presentes: resumoMensal[i]?.presentes ?? 0, pct: calcularPct(resumoMensal[i]?.presentes ?? 0, resumoMensal[i]?.total ?? 0) })),
      labelPeriodo: `Ano ${ano}`,
    }
  })()

  const anoIdx = ANOS_DISPONIVEIS.indexOf(ano)
  const domingosList = domingosPorMes[mes] ?? []

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Visualize estatísticas detalhadas por período</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-2" />PDF</Button>
          <Button variant="outline" size="sm"><BarChart3 className="h-4 w-4 mr-2" />Excel</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />CSV</Button>
        </div>
      </div>

      {/* Filtros de Período */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Granularidade */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b bg-muted/30">
          <div>
            <p className="font-semibold">Período do Relatório</p>
            <p className="text-sm text-muted-foreground">{labelPeriodo}</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/40 self-start sm:self-auto">
            {(['dia', 'mes', 'trimestre', 'ano'] as Granularidade[]).map((g) => (
              <button key={g} onClick={() => setGranularidade(g)}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-all', granularidade === g ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                {g === 'dia' ? 'Dia' : g === 'mes' ? 'Mês' : g === 'trimestre' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>
        </div>

        {/* Ano */}
        <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Ano</span>
          <div className="flex items-center gap-1">
            <button onClick={() => anoIdx > 0 && setAno(ANOS_DISPONIVEIS[anoIdx - 1])} disabled={anoIdx === 0} className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
            {ANOS_DISPONIVEIS.map(a => (
              <button key={a} onClick={() => setAno(a)} className={cn('px-3 py-1 rounded text-sm font-semibold transition-all', ano === a ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground')}>{a}</button>
            ))}
            <button onClick={() => anoIdx < ANOS_DISPONIVEIS.length - 1 && setAno(ANOS_DISPONIVEIS[anoIdx + 1])} disabled={anoIdx === ANOS_DISPONIVEIS.length - 1} className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Trimestre */}
        {granularidade === 'trimestre' && (
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Trimestre</span>
            <div className="flex gap-2 flex-wrap">
              {TRIMESTRES.map((t, i) => (
                <button key={i} onClick={() => setTrim(i)} className={cn('flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', trim === i ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground')}>
                  <span className="font-bold">{t.label}</span>
                  <span className={cn('text-[10px]', trim === i ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mês */}
        {(granularidade === 'mes' || granularidade === 'dia') && (
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Mês</span>
            <div className="flex gap-1 flex-wrap">
              {MESES_CURTOS.map((m, i) => (
                <button key={i} onClick={() => { setMes(i); setDomingoIdx(0) }}
                  className={cn('px-2.5 py-1 rounded text-xs font-medium transition-all', mes === i ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground')}>{m}</button>
              ))}
            </div>
          </div>
        )}

        {/* Domingo */}
        {granularidade === 'dia' && domingosList.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Domingo</span>
            <div className="flex gap-1.5 flex-wrap">
              {domingosList.map((d, i) => (
                <button key={i} onClick={() => setDomingoIdx(i)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all', domingoIdx === i ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground')}>{d.data}</button>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-x divide-y md:divide-y-0">
          {[
            { label: 'Presença',  value: `${dados.pct}%`,                          sub: `${dados.presentes} presentes`, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,  color: 'text-green-600' },
            { label: 'Faltas',    value: dados.faltas,                              sub: 'ausências',                    icon: <XCircle      className="h-4 w-4 text-red-500" />,    color: 'text-red-600' },
            { label: 'Visitantes',value: dados.visitantes,                          sub: 'novos',                        icon: <UserPlus     className="h-4 w-4 text-blue-500" />,   color: 'text-blue-600' },
            { label: 'Bíblias',   value: dados.biblias,                             sub: 'trouxeram',                    icon: <Book         className="h-4 w-4 text-purple-500" />, color: 'text-purple-600' },
            { label: 'Revistas',  value: dados.revistas,                            sub: 'trouxeram',                    icon: <BookOpen     className="h-4 w-4 text-orange-500" />, color: 'text-orange-600' },
            { label: 'Oferta',    value: `R$ ${dados.oferta.toLocaleString('pt-BR')}`, sub: 'arrecadado',                icon: <DollarSign   className="h-4 w-4 text-emerald-500" />, color: 'text-emerald-600' },
            { label: 'Domingos',  value: dados.domingos,                            sub: 'aulas realizadas',             icon: <Calendar     className="h-4 w-4 text-muted-foreground" />, color: '' },
          ].map((kpi, i) => (
            <div key={i} className="flex flex-col items-center justify-center py-4 px-3 text-center">
              <div className="mb-1">{kpi.icon}</div>
              <span className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{kpi.label}</span>
              <span className="text-[10px] text-muted-foreground">{kpi.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução de Presença no Período</CardTitle>
          <CardDescription>{labelPeriodo}</CardDescription>
        </CardHeader>
        <CardContent>
          {grafico.every(g => g.presentes === 0) ? (
            <EmptyState message="Sem dados para o período selecionado" minHeight="h-[230px]" />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={grafico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPres" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area yAxisId="l" type="monotone" dataKey="presentes" name="Presentes" stroke="#6366f1" fill="url(#gPres)" strokeWidth={2} dot={{ r: 3 }} />
                <Area yAxisId="r" type="monotone" dataKey="pct" name="Presença %" stroke="#22c55e" fill="url(#gPct)" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Presença por Sala */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Presença por Sala</CardTitle>
          <CardDescription>Detalhamento por turma no período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dadosSala.length === 0 ? (
            <EmptyState message="Sem dados para o período selecionado" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dadosSala} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                  <XAxis dataKey="sala" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.replace('Crianças - ', '').replace('Adultos - ', '')} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Presença']} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                  <Bar dataKey="presencaMedia" radius={[6, 6, 0, 0]}>
                    {dadosSala.map((e, i) => <Cell key={i} fill={e.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="rounded-lg border overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Sala</TableHead>
                      <TableHead className="text-center">Matrículas</TableHead>
                      <TableHead className="text-center">Presentes</TableHead>
                      <TableHead className="text-center">Faltas</TableHead>
                      <TableHead className="text-center">Visitantes</TableHead>
                      <TableHead className="text-center">Bíblias</TableHead>
                      <TableHead className="text-center">Revistas</TableHead>
                      <TableHead className="text-center">Oferta</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosSala.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.cor }} />
                            <span className="font-medium text-sm">{s.sala}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{s.matriculados}</TableCell>
                        <TableCell className="text-center text-green-600 font-semibold">{s.presentes}</TableCell>
                        <TableCell className="text-center text-red-600 font-semibold">{s.faltas}</TableCell>
                        <TableCell className="text-center text-blue-600">{s.visitantes}</TableCell>
                        <TableCell className="text-center text-purple-600">{s.biblias}</TableCell>
                        <TableCell className="text-center text-orange-600">{s.revistas}</TableCell>
                        <TableCell className="text-center text-emerald-600">R$ {s.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${s.presencaMedia}%`, backgroundColor: corPresenca(s.presencaMedia) }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: corPresenca(s.presencaMedia) }}>{s.presencaMedia}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs border', badgePresenca(s.presencaMedia))}>{labelPresenca(s.presencaMedia)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alunos: Destaques + Atenção */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />Top 10 Mais Frequentes
            </CardTitle>
            <CardDescription>Alunos com maior presença no período</CardDescription>
          </CardHeader>
          <CardContent>
            {topAlunos.length === 0 ? (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Sala</TableHead>
                      <TableHead className="text-center">Presença</TableHead>
                      <TableHead className="text-center">Faltas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAlunos.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className={`font-bold text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}º`}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{a.nome}</TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{a.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</span></TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', a.pct === 100 ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary')}>{a.pct}%</span>
                          <p className="text-[10px] text-muted-foreground">{a.presentes}/{a.total}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-sm font-semibold', a.faltas === 0 ? 'text-green-600' : 'text-red-500')}>{a.faltas}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />Alunos que Precisam de Atenção
            </CardTitle>
            <CardDescription>Presença abaixo de 75% no período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alunosAtencao.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum aluno com presença crítica no período.</p>
              </div>
            ) : (
              alunosAtencao.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-red-500/5 border-red-500/20">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{a.nome}</span>
                      <span className="text-xs font-bold text-red-600 ml-2">{a.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${a.pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{a.sala}</span>
                      <span className="text-[11px] text-red-500">{a.faltas} falta{a.faltas !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desempenho dos Professores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-orange-500" />Desempenho dos Professores
          </CardTitle>
          <CardDescription>Aulas ministradas, presença média e engajamento das turmas</CardDescription>
        </CardHeader>
        <CardContent>
          {professores.length === 0 ? (
            <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Professor</TableHead>
                    <TableHead>Turmas</TableHead>
                    <TableHead className="text-center">Aulas</TableHead>
                    <TableHead className="text-center">Presença Média</TableHead>
                    <TableHead className="text-center">Bíblias %</TableHead>
                    <TableHead>Avaliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professores.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {p.turmas.length > 0
                            ? p.turmas.map((t, j) => <span key={j} className="text-xs text-muted-foreground">{t}</span>)
                            : <span className="text-xs text-muted-foreground">Sem turma</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{p.aulas}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p.presMedia}%`, backgroundColor: corPresenca(p.presMedia) }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: corPresenca(p.presMedia) }}>{p.presMedia}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-semibold text-purple-600">{p.biblias}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs border', p.aulas > 0 ? badgePresenca(p.presMedia) : 'bg-muted text-muted-foreground border-muted')}>
                          {p.aulas > 0 ? labelPresenca(p.presMedia) : 'Sem aulas'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exportar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar Relatório</CardTitle>
          <CardDescription>Baixe o relatório de <strong>{labelPeriodo}</strong> no formato desejado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="w-full"><FileText className="h-4 w-4 mr-2" />Exportar PDF</Button>
            <Button variant="outline" className="w-full"><BarChart3 className="h-4 w-4 mr-2" />Exportar Excel</Button>
            <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

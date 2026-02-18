"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Download, Calendar, Users,
  CheckCircle2, XCircle, FileText, BookOpen, Book,
  DollarSign, UserPlus, Trophy, AlertTriangle, ChevronLeft, ChevronRight,
  BarChart3, Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Granularidade = 'dia' | 'mes' | 'trimestre' | 'ano'

interface DadosDomingo {
  data: string
  presentes: number
  faltas: number
  visitantes: number
  biblias: number
  revistas: number
  oferta: number
  total: number
}

interface DadosMes {
  mes: string
  presentes: number
  faltas: number
  visitantes: number
  biblias: number
  revistas: number
  oferta: number
  total: number
  domingos: number
}

interface DadosSala {
  sala: string
  cor: string
  matriculados: number
  presencaMedia: number
  presentes: number
  faltas: number
  visitantes: number
  biblias: number
  revistas: number
  oferta: number
}

interface AlunoFrequente {
  nome: string
  sala: string
  presentes: number
  total: number
  pct: number
  faltas: number
}

interface ProfessorDesempenho {
  nome: string
  turmas: string[]
  aulas: number
  presMedia: number
  biblias: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const ANOS = [2024, 2025, 2026]
const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const TRIMESTRES = [
  { label: '1º Trim', meses: 'Jan – Mar', idx: [0,1,2] },
  { label: '2º Trim', meses: 'Abr – Jun', idx: [3,4,5] },
  { label: '3º Trim', meses: 'Jul – Set', idx: [6,7,8] },
  { label: '4º Trim', meses: 'Out – Dez', idx: [9,10,11] },
]

const CORES_FALLBACK = ['#EAB308', '#F97316', '#3B82F6', '#A855F7', '#22C55E', '#14B8A6', '#EF4444', '#EC4899']

const corSalaBg: Record<string, string> = {
  'Crianças - Pequeninos': 'bg-yellow-500',
  'Crianças - Juniores': 'bg-orange-500',
  'Adolescentes': 'bg-blue-500',
  'Jovens': 'bg-purple-500',
  'Adultos - Casais': 'bg-green-500',
  'Adultos - Maturidade': 'bg-teal-500',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const barColor = (pct: number) => pct >= 90 ? '#22c55e' : pct >= 75 ? '#eab308' : '#ef4444'
const barLabel = (pct: number) => pct >= 90 ? 'Excelente' : pct >= 75 ? 'Bom' : 'Atenção'
const barBadge = (pct: number) =>
  pct >= 90
    ? 'bg-green-500/15 text-green-600 border-green-500/30'
    : pct >= 75
    ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
    : 'bg-red-500/15 text-red-600 border-red-500/30'

function dadosVazios() {
  return { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0, total: 0, domingos: 0, pct: 0 }
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const TooltipCustom = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
        <p className="font-semibold mb-2 border-b pb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-bold">{typeof p.value === 'number' && p.name.includes('%') ? `${p.value}%` : p.name.includes('R$') ? `R$ ${p.value}` : p.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [granularidade, setGranularidade] = useState<Granularidade>('mes')
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth())
  const [trimSelecionado, setTrimSelecionado] = useState(Math.floor(new Date().getMonth() / 3))
  const [domingoSelecionado, setDomingoSelecionado] = useState(0)

  // ── Dados do Supabase ──
  const [domingosPorMes, setDomingosPorMes] = useState<Record<number, DadosDomingo[]>>({})
  const [resumoMensal, setResumoMensal] = useState<DadosMes[]>([])
  const [dadosSala, setDadosSala] = useState<DadosSala[]>([])
  const [topAlunos, setTopAlunos] = useState<AlunoFrequente[]>([])
  const [alunosAtencao, setAlunosAtencao] = useState<AlunoFrequente[]>([])
  const [professores, setProfessores] = useState<ProfessorDesempenho[]>([])

  // ── Efeito principal: busca todas chamadas + presenças do ano ──
  useEffect(() => {
    async function fetchDadosAno() {
      const db = supabase as any

      // 1) Buscar chamadas do ano com presenças e visitantes
      const { data: chamadas } = await db
        .from('chamadas')
        .select(`
          id, data, turma_id, oferta,
          presencas(presente, trouxe_biblia, trouxe_revista),
          historico_visitantes(id)
        `)
        .eq('ano', anoSelecionado)
        .order('data', { ascending: true })

      if (!chamadas || chamadas.length === 0) {
        setDomingosPorMes({})
        setResumoMensal([])
        return
      }

      // 2) Construir DadosDomingo por mês
      const porMes: Record<number, DadosDomingo[]> = {}

      for (const c of chamadas) {
        const mes = parseISO(c.data).getMonth()
        if (!porMes[mes]) porMes[mes] = []

        const presencas = c.presencas ?? []
        const visitantes = c.historico_visitantes ?? []

        const presentes = presencas.filter((p: any) => p.presente === true).length
        const faltas = presencas.filter((p: any) => p.presente === false).length
        const biblias = presencas.filter((p: any) => p.trouxe_biblia === true).length
        const revistas = presencas.filter((p: any) => p.trouxe_revista === true).length

        porMes[mes].push({
          data: format(parseISO(c.data), 'dd/MM', { locale: ptBR }),
          presentes,
          faltas,
          visitantes: visitantes.length,
          biblias,
          revistas,
          oferta: Number(c.oferta) || 0,
          total: presencas.length,
        })
      }

      setDomingosPorMes(porMes)

      // 3) Agregar por mês para resumoMensal (12 posições, índice = mês)
      const mensal: DadosMes[] = Array.from({ length: 12 }, (_, i) => ({
        mes: MESES_NOMES[i],
        presentes: 0,
        faltas: 0,
        visitantes: 0,
        biblias: 0,
        revistas: 0,
        oferta: 0,
        total: 0,
        domingos: 0,
      }))

      for (const c of chamadas) {
        const mes = parseISO(c.data).getMonth()
        const presencas = c.presencas ?? []
        const visitantes = c.historico_visitantes ?? []

        mensal[mes].domingos++
        mensal[mes].total = presencas.length // matriculados na turma (proxy)
        mensal[mes].presentes += presencas.filter((p: any) => p.presente === true).length
        mensal[mes].faltas += presencas.filter((p: any) => p.presente === false).length
        mensal[mes].biblias += presencas.filter((p: any) => p.trouxe_biblia === true).length
        mensal[mes].revistas += presencas.filter((p: any) => p.trouxe_revista === true).length
        mensal[mes].visitantes += visitantes.length
        mensal[mes].oferta += Number(c.oferta) || 0
      }

      setResumoMensal(mensal)
    }

    fetchDadosAno()
  }, [anoSelecionado])

  // ── Efeito: presença por sala (depende do período selecionado) ──
  useEffect(() => {
    async function fetchDadosSala() {
      const db = supabase as any

      // Definir filtro de datas
      let dataInicio = `${anoSelecionado}-01-01`
      let dataFim = `${anoSelecionado}-12-31`

      if (granularidade === 'mes') {
        const mes = mesSelecionado + 1
        dataInicio = `${anoSelecionado}-${String(mes).padStart(2, '0')}-01`
        dataFim = `${anoSelecionado}-${String(mes).padStart(2, '0')}-31`
      } else if (granularidade === 'trimestre') {
        const mesInicio = TRIMESTRES[trimSelecionado].idx[0] + 1
        const mesFim = TRIMESTRES[trimSelecionado].idx[2] + 1
        dataInicio = `${anoSelecionado}-${String(mesInicio).padStart(2, '0')}-01`
        dataFim = `${anoSelecionado}-${String(mesFim).padStart(2, '0')}-31`
      } else if (granularidade === 'dia') {
        const mes = mesSelecionado + 1
        dataInicio = `${anoSelecionado}-${String(mes).padStart(2, '0')}-01`
        dataFim = `${anoSelecionado}-${String(mes).padStart(2, '0')}-31`
      }

      // Buscar turmas ativas
      const { data: turmas } = await db
        .from('turmas')
        .select('id, nome, cor')
        .eq('ativa', true)

      if (!turmas || turmas.length === 0) {
        setDadosSala([])
        return
      }

      const resultado: DadosSala[] = []

      for (let idx = 0; idx < turmas.length; idx++) {
        const turma = turmas[idx]

        // Contar matriculados
        const { count: matriculados } = await db
          .from('alunos')
          .select('id', { count: 'exact', head: true })
          .eq('turma_id', turma.id)
          .eq('ativo', true)

        // Buscar chamadas da turma no período
        const { data: chamadas } = await db
          .from('chamadas')
          .select(`
            id, oferta,
            presencas(presente, trouxe_biblia, trouxe_revista),
            historico_visitantes(id)
          `)
          .eq('turma_id', turma.id)
          .gte('data', dataInicio)
          .lte('data', dataFim)

        let presentes = 0, faltas = 0, biblias = 0, revistas = 0, visitantes = 0, oferta = 0, totalRegistros = 0

        if (chamadas) {
          for (const c of chamadas) {
            const ps = c.presencas ?? []
            const vs = c.historico_visitantes ?? []
            totalRegistros += ps.length
            presentes += ps.filter((p: any) => p.presente === true).length
            faltas += ps.filter((p: any) => p.presente === false).length
            biblias += ps.filter((p: any) => p.trouxe_biblia === true).length
            revistas += ps.filter((p: any) => p.trouxe_revista === true).length
            visitantes += vs.length
            oferta += Number(c.oferta) || 0
          }
        }

        const presencaMedia = totalRegistros > 0 ? Math.round((presentes / totalRegistros) * 100) : 0

        // Converter cor bg- para hex
        const corHex = turma.cor?.startsWith('bg-')
          ? CORES_FALLBACK[idx % CORES_FALLBACK.length]
          : (turma.cor || CORES_FALLBACK[idx % CORES_FALLBACK.length])

        resultado.push({
          sala: turma.nome,
          cor: corHex,
          matriculados: matriculados ?? 0,
          presencaMedia,
          presentes,
          faltas,
          visitantes,
          biblias,
          revistas,
          oferta,
        })
      }

      setDadosSala(resultado)
    }

    fetchDadosSala()
  }, [anoSelecionado, mesSelecionado, trimSelecionado, granularidade])

  // ── Efeito: top alunos e alunos com atenção ──
  useEffect(() => {
    async function fetchAlunos() {
      const db = supabase as any

      // Definir filtro de datas
      let dataInicio = `${anoSelecionado}-01-01`
      let dataFim = `${anoSelecionado}-12-31`

      if (granularidade === 'mes' || granularidade === 'dia') {
        const mes = mesSelecionado + 1
        dataInicio = `${anoSelecionado}-${String(mes).padStart(2, '0')}-01`
        dataFim = `${anoSelecionado}-${String(mes).padStart(2, '0')}-31`
      } else if (granularidade === 'trimestre') {
        const mesInicio = TRIMESTRES[trimSelecionado].idx[0] + 1
        const mesFim = TRIMESTRES[trimSelecionado].idx[2] + 1
        dataInicio = `${anoSelecionado}-${String(mesInicio).padStart(2, '0')}-01`
        dataFim = `${anoSelecionado}-${String(mesFim).padStart(2, '0')}-31`
      }

      // Buscar chamadas do período
      const { data: chamadas } = await db
        .from('chamadas')
        .select('id')
        .gte('data', dataInicio)
        .lte('data', dataFim)

      if (!chamadas || chamadas.length === 0) {
        setTopAlunos([])
        setAlunosAtencao([])
        return
      }

      const chamadaIds = chamadas.map((c: any) => c.id)

      // Buscar presenças
      const { data: presencas } = await db
        .from('presencas')
        .select('aluno_id, presente')
        .in('chamada_id', chamadaIds)

      if (!presencas || presencas.length === 0) {
        setTopAlunos([])
        setAlunosAtencao([])
        return
      }

      // Agregar por aluno
      const porAluno: Record<string, { presentes: number; total: number }> = {}
      for (const p of presencas) {
        if (!porAluno[p.aluno_id]) porAluno[p.aluno_id] = { presentes: 0, total: 0 }
        porAluno[p.aluno_id].total++
        if (p.presente === true) porAluno[p.aluno_id].presentes++
      }

      // Buscar nomes dos alunos
      const alunoIds = Object.keys(porAluno)
      const { data: alunos } = await db
        .from('alunos')
        .select('id, nome, turmas(nome)')
        .in('id', alunoIds)
        .eq('ativo', true)

      if (!alunos) {
        setTopAlunos([])
        setAlunosAtencao([])
        return
      }

      const lista: AlunoFrequente[] = alunos.map((a: any) => {
        const dados = porAluno[a.id] ?? { presentes: 0, total: 0 }
        const pct = dados.total > 0 ? Math.round((dados.presentes / dados.total) * 100) : 0
        return {
          nome: a.nome,
          sala: a.turmas?.nome ?? 'Sem turma',
          presentes: dados.presentes,
          total: dados.total,
          pct,
          faltas: dados.total - dados.presentes,
        }
      }).filter((a: AlunoFrequente) => a.total > 0)

      // Top 10 (maior %)
      const top = [...lista].sort((a, b) => b.pct - a.pct || b.presentes - a.presentes).slice(0, 10)
      setTopAlunos(top)

      // Atenção (< 75%)
      const atencao = [...lista].filter(a => a.pct < 75).sort((a, b) => a.pct - b.pct)
      setAlunosAtencao(atencao)
    }

    fetchAlunos()
  }, [anoSelecionado, mesSelecionado, trimSelecionado, granularidade])

  // ── Efeito: desempenho dos professores ──
  useEffect(() => {
    async function fetchProfessores() {
      const db = supabase as any

      // Definir filtro de datas
      let dataInicio = `${anoSelecionado}-01-01`
      let dataFim = `${anoSelecionado}-12-31`

      if (granularidade === 'mes' || granularidade === 'dia') {
        const mes = mesSelecionado + 1
        dataInicio = `${anoSelecionado}-${String(mes).padStart(2, '0')}-01`
        dataFim = `${anoSelecionado}-${String(mes).padStart(2, '0')}-31`
      } else if (granularidade === 'trimestre') {
        const mesInicio = TRIMESTRES[trimSelecionado].idx[0] + 1
        const mesFim = TRIMESTRES[trimSelecionado].idx[2] + 1
        dataInicio = `${anoSelecionado}-${String(mesInicio).padStart(2, '0')}-01`
        dataFim = `${anoSelecionado}-${String(mesFim).padStart(2, '0')}-31`
      }

      // Buscar professores ativos com suas turmas
      const { data: profsList } = await db
        .from('professores')
        .select(`
          id, nome,
          professor_turmas(turma_id, turmas(nome))
        `)
        .eq('ativo', true)

      if (!profsList || profsList.length === 0) {
        setProfessores([])
        return
      }

      const resultado: ProfessorDesempenho[] = []

      for (const prof of profsList) {
        const turmasDoProf = (prof.professor_turmas ?? []).map((pt: any) => pt.turmas?.nome).filter(Boolean)
        const turmaIds = (prof.professor_turmas ?? []).map((pt: any) => pt.turma_id).filter(Boolean)

        if (turmaIds.length === 0) {
          resultado.push({ nome: prof.nome, turmas: [], aulas: 0, presMedia: 0, biblias: 0 })
          continue
        }

        // Buscar chamadas das turmas do professor no período
        const { data: chamadas } = await db
          .from('chamadas')
          .select(`id, presencas(presente, trouxe_biblia)`)
          .in('turma_id', turmaIds)
          .gte('data', dataInicio)
          .lte('data', dataFim)

        let totalPresentes = 0, totalAlunos = 0, totalBiblias = 0, aulas = 0

        if (chamadas) {
          for (const c of chamadas) {
            aulas++
            const ps = c.presencas ?? []
            totalAlunos += ps.length
            totalPresentes += ps.filter((p: any) => p.presente === true).length
            totalBiblias += ps.filter((p: any) => p.trouxe_biblia === true).length
          }
        }

        const presMedia = totalAlunos > 0 ? Math.round((totalPresentes / totalAlunos) * 100) : 0
        const pctBiblias = totalPresentes > 0 ? Math.round((totalBiblias / totalPresentes) * 100) : 0

        resultado.push({
          nome: prof.nome,
          turmas: turmasDoProf,
          aulas,
          presMedia,
          biblias: pctBiblias,
        })
      }

      // Ordenar por presença média decrescente
      resultado.sort((a, b) => b.presMedia - a.presMedia)
      setProfessores(resultado)
    }

    fetchProfessores()
  }, [anoSelecionado, mesSelecionado, trimSelecionado, granularidade])

  // Índice do ano para navegação
  const anoIdx = ANOS.indexOf(anoSelecionado)

  // ── Calcula dados do período selecionado ──
  const { dados, grafico, labelPeriodo } = (() => {
    if (granularidade === 'dia') {
      const domingos = domingosPorMes[mesSelecionado] ?? []
      const d = domingos[domingoSelecionado] ?? { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0, total: 0 }
      const pct = d.total > 0 ? Math.round((d.presentes / d.total) * 100) : 0
      return {
        dados: { ...d, domingos: 1, pct },
        grafico: domingos.map(dd => ({ periodo: dd.data, presentes: dd.presentes, pct: dd.total > 0 ? Math.round(dd.presentes / dd.total * 100) : 0 })),
        labelPeriodo: domingos[domingoSelecionado]
          ? `${domingos[domingoSelecionado].data}/${anoSelecionado} — ${MESES_NOMES[mesSelecionado]}`
          : `${MESES_NOMES[mesSelecionado]} ${anoSelecionado}`,
      }
    }

    if (granularidade === 'mes') {
      const domingos = domingosPorMes[mesSelecionado] ?? []
      const mesData = resumoMensal[mesSelecionado]
      const d = mesData ?? dadosVazios()
      const pct = d.total > 0 ? Math.round((d.presentes / d.total) * 100) : 0
      return {
        dados: { ...d, pct },
        grafico: domingos.length > 0
          ? domingos.map(dd => ({ periodo: dd.data, presentes: dd.presentes, pct: dd.total > 0 ? Math.round(dd.presentes / dd.total * 100) : 0 }))
          : [{ periodo: MESES_CURTOS[mesSelecionado], presentes: d.presentes, pct }],
        labelPeriodo: `${MESES_NOMES[mesSelecionado]} de ${anoSelecionado}`,
      }
    }

    if (granularidade === 'trimestre') {
      const idxs = TRIMESTRES[trimSelecionado].idx
      const mesesTrim = idxs.map(i => resumoMensal[i]).filter(Boolean) as DadosMes[]
      const d = mesesTrim.length > 0
        ? mesesTrim.reduce((acc, m) => ({
            ...acc,
            presentes: acc.presentes + m.presentes,
            faltas: acc.faltas + m.faltas,
            visitantes: acc.visitantes + m.visitantes,
            biblias: acc.biblias + m.biblias,
            revistas: acc.revistas + m.revistas,
            oferta: acc.oferta + m.oferta,
            domingos: acc.domingos + m.domingos,
            total: m.total,
          }), dadosVazios())
        : dadosVazios()
      const pct = d.total > 0 ? Math.round((d.presentes / d.total) * 100) : 0
      return {
        dados: { ...d, pct },
        grafico: idxs.map(i => ({
          periodo: MESES_CURTOS[i],
          presentes: resumoMensal[i]?.presentes ?? 0,
          pct: resumoMensal[i]?.domingos > 0 ? Math.round((resumoMensal[i].presentes / resumoMensal[i].total) * 100) : 0,
        })),
        labelPeriodo: `${TRIMESTRES[trimSelecionado].label} ${anoSelecionado} (${TRIMESTRES[trimSelecionado].meses})`,
      }
    }

    // anual
    const d = resumoMensal.length > 0
      ? resumoMensal.reduce((acc, m) => ({
          ...acc,
          presentes: acc.presentes + m.presentes,
          faltas: acc.faltas + m.faltas,
          visitantes: acc.visitantes + m.visitantes,
          biblias: acc.biblias + m.biblias,
          revistas: acc.revistas + m.revistas,
          oferta: acc.oferta + m.oferta,
          domingos: acc.domingos + m.domingos,
          total: m.total,
        }), dadosVazios())
      : dadosVazios()
    const pct = d.total > 0 ? Math.round((d.presentes / d.total) * 100) : 0
    return {
      dados: { ...d, pct },
      grafico: MESES_CURTOS.map((mes, i) => ({
        periodo: mes,
        presentes: resumoMensal[i]?.presentes ?? 0,
        pct: resumoMensal[i]?.domingos > 0 ? Math.round((resumoMensal[i].presentes / resumoMensal[i].total) * 100) : 0,
      })),
      labelPeriodo: `Ano ${anoSelecionado}`,
    }
  })()

  const domingosList = domingosPorMes[mesSelecionado] ?? []

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Visualize estatísticas detalhadas por período</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />PDF
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />Excel
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
        </div>
      </div>

      {/* ── Filtros de Período ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Linha 1: Granularidade */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b bg-muted/30">
          <div>
            <p className="font-semibold">Período do Relatório</p>
            <p className="text-sm text-muted-foreground">{labelPeriodo}</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/40 self-start sm:self-auto">
            {(['dia', 'mes', 'trimestre', 'ano'] as Granularidade[]).map((g) => (
              <button key={g} onClick={() => setGranularidade(g)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                  granularidade === g ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}>
                {g === 'dia' ? 'Dia' : g === 'mes' ? 'Mês' : g === 'trimestre' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: Ano */}
        <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Ano</span>
          <div className="flex items-center gap-1">
            <button onClick={() => anoIdx > 0 && setAnoSelecionado(ANOS[anoIdx - 1])} disabled={anoIdx === 0}
              className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {ANOS.map(ano => (
              <button key={ano} onClick={() => setAnoSelecionado(ano)}
                className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
                  anoSelecionado === ano ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground'
                }`}>{ano}</button>
            ))}
            <button onClick={() => anoIdx < ANOS.length - 1 && setAnoSelecionado(ANOS[anoIdx + 1])} disabled={anoIdx === ANOS.length - 1}
              className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Linha 3: Trimestre (só no modo trimestre) */}
        {granularidade === 'trimestre' && (
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Trimestre</span>
            <div className="flex gap-2 flex-wrap">
              {TRIMESTRES.map((t, i) => (
                <button key={i} onClick={() => setTrimSelecionado(i)}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    trimSelecionado === i ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground'
                  }`}>
                  <span className="font-bold">{t.label}</span>
                  <span className={`text-[10px] ${trimSelecionado === i ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{t.meses}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Linha 4: Mês (no modo mes ou dia) */}
        {(granularidade === 'mes' || granularidade === 'dia') && (
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Mês</span>
            <div className="flex gap-1 flex-wrap">
              {MESES_CURTOS.map((m, i) => (
                <button key={i} onClick={() => { setMesSelecionado(i); setDomingoSelecionado(0) }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    mesSelecionado === i ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground'
                  }`}>{m}</button>
              ))}
            </div>
          </div>
        )}

        {/* Linha 5: Domingo (só no modo dia) */}
        {granularidade === 'dia' && domingosList.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Domingo</span>
            <div className="flex gap-1.5 flex-wrap">
              {domingosList.map((d, i) => (
                <button key={i} onClick={() => setDomingoSelecionado(i)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    domingoSelecionado === i ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground'
                  }`}>{d.data}</button>
              ))}
            </div>
          </div>
        )}

        {/* ─ KPIs do período ─ */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-x divide-y md:divide-y-0">
          {[
            { label: 'Presença', value: `${dados.pct}%`, sub: `${dados.presentes} presentes`, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: 'text-green-600' },
            { label: 'Faltas', value: dados.faltas, sub: 'ausências', icon: <XCircle className="h-4 w-4 text-red-500" />, color: 'text-red-600' },
            { label: 'Visitantes', value: dados.visitantes, sub: 'novos', icon: <UserPlus className="h-4 w-4 text-blue-500" />, color: 'text-blue-600' },
            { label: 'Bíblias', value: dados.biblias, sub: 'trouxeram', icon: <Book className="h-4 w-4 text-purple-500" />, color: 'text-purple-600' },
            { label: 'Revistas', value: dados.revistas, sub: 'trouxeram', icon: <BookOpen className="h-4 w-4 text-orange-500" />, color: 'text-orange-600' },
            { label: 'Oferta', value: `R$ ${dados.oferta.toLocaleString('pt-BR')}`, sub: 'arrecadado', icon: <DollarSign className="h-4 w-4 text-emerald-500" />, color: 'text-emerald-600' },
            { label: 'Domingos', value: dados.domingos, sub: 'aulas realizadas', icon: <Calendar className="h-4 w-4 text-muted-foreground" />, color: '' },
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

      {/* ── Gráfico de Evolução ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução de Presença no Período</CardTitle>
          <CardDescription>{labelPeriodo}</CardDescription>
        </CardHeader>
        <CardContent>
          {grafico.length === 0 || grafico.every(g => g.presentes === 0) ? (
            <div className="flex items-center justify-center h-[230px] text-muted-foreground text-sm">
              Sem dados para o período selecionado
            </div>
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
                <Tooltip content={<TooltipCustom />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area yAxisId="l" type="monotone" dataKey="presentes" name="Presentes" stroke="#6366f1" fill="url(#gPres)" strokeWidth={2} dot={{ r: 3 }} />
                <Area yAxisId="r" type="monotone" dataKey="pct" name="Presença %" stroke="#22c55e" fill="url(#gPct)" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Presença por Sala ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Presença por Sala</CardTitle>
          <CardDescription>Detalhamento por turma no período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dadosSala.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Sem dados para o período selecionado
            </div>
          ) : (
            <>
              {/* Gráfico de barras */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dadosSala} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                  <XAxis dataKey="sala" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v.replace('Crianças - ', '').replace('Adultos - ', '')} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Presença']} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                  <Bar dataKey="presencaMedia" radius={[6, 6, 0, 0]}>
                    {dadosSala.map((e, i) => <Cell key={i} fill={e.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Tabela detalhada */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
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
                    {dadosSala.map((s, i) => {
                      const pct = s.presencaMedia
                      return (
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
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
                              </div>
                              <span className="text-xs font-bold" style={{ color: barColor(pct) }}>{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs border ${barBadge(pct)}`}>{barLabel(pct)}</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Alunos: Destaques + Atenção ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top frequentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top 10 Mais Frequentes
            </CardTitle>
            <CardDescription>Alunos com maior presença no período</CardDescription>
          </CardHeader>
          <CardContent>
            {topAlunos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Sem dados para o período selecionado
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
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
                          {i < 3 ? ['🥇','🥈','🥉'][i] : `${i + 1}º`}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{a.nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${corSalaBg[a.sala] || 'bg-muted'}`} />
                            <span className="text-xs text-muted-foreground">{a.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            a.pct === 100 ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary'
                          }`}>{a.pct}%</span>
                          <p className="text-[10px] text-muted-foreground">{a.presentes}/{a.total}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-semibold ${a.faltas === 0 ? 'text-green-600' : 'text-red-500'}`}>{a.faltas}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alunos que precisam de atenção */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Alunos que Precisam de Atenção
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

      {/* ── Desempenho dos Professores ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-orange-500" />
            Desempenho dos Professores
          </CardTitle>
          <CardDescription>Aulas ministradas, presença média e engajamento das turmas</CardDescription>
        </CardHeader>
        <CardContent>
          {professores.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Sem dados para o período selecionado
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
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
                            ? p.turmas.map((t, j) => (
                                <span key={j} className="text-xs text-muted-foreground">{t}</span>
                              ))
                            : <span className="text-xs text-muted-foreground">Sem turma</span>
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{p.aulas}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p.presMedia}%`, backgroundColor: barColor(p.presMedia) }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: barColor(p.presMedia) }}>{p.presMedia}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-semibold text-purple-600">{p.biblias}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${p.aulas > 0 ? barBadge(p.presMedia) : 'bg-muted text-muted-foreground border-muted'}`}>
                          {p.aulas > 0 ? barLabel(p.presMedia) : 'Sem aulas'}
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

      {/* ── Exportar ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar Relatório</CardTitle>
          <CardDescription>Baixe o relatório de <strong>{labelPeriodo}</strong> no formato desejado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />Exportar PDF
            </Button>
            <Button variant="outline" className="w-full">
              <BarChart3 className="h-4 w-4 mr-2" />Exportar Excel
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

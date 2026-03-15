"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ChartTooltip } from '@/components/ui/chart-tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Settings2, Filter,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ANOS_DISPONIVEIS, MESES, MESES_CURTOS, TRIMESTRES } from '@/lib/constants'
import { calcularPct, resolverCor, corPresenca, badgePresenca, labelPresenca } from '@/lib/presence'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { exportarCSV, exportarExcel } from '@/lib/export'

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
interface TurmaSimples { id: string; nome: string }

function dadosVazios() {
  return { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0, total: 0, domingos: 0, pct: 0 }
}

function agregarPorData(entries: DadosDomingo[]): DadosDomingo[] {
  const map = new Map<string, DadosDomingo>()
  for (const dd of entries) {
    const prev = map.get(dd.data)
    if (!prev) {
      map.set(dd.data, { ...dd })
    } else {
      map.set(dd.data, {
        ...prev,
        presentes: prev.presentes + dd.presentes,
        faltas: prev.faltas + dd.faltas,
        visitantes: prev.visitantes + dd.visitantes,
        biblias: prev.biblias + dd.biblias,
        revistas: prev.revistas + dd.revistas,
        oferta: prev.oferta + dd.oferta,
        total: prev.total + dd.total,
      })
    }
  }
  return [...map.values()]
}

function filtrarPorPeriodo(
  chamadas: any[],
  opts: { granularidade: Granularidade; mes: number; trim: number }
): any[] {
  return chamadas.filter((c: any) => {
    if (!c.data) return opts.granularidade === 'ano'
    const m = parseISO(c.data).getMonth()
    if (opts.granularidade === 'mes' || opts.granularidade === 'dia') return m === opts.mes
    if (opts.granularidade === 'trimestre') return TRIMESTRES[opts.trim].meses.includes(m)
    return true
  })
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const db = supabase as any

  const [granularidade, setGranularidade] = useState<Granularidade>('mes')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth())
  const [trim, setTrim] = useState(Math.floor(new Date().getMonth() / 3))
  const [domingoIdx, setDomingoIdx] = useState(0)

  // Filtro por turma
  const [turmaFiltro, setTurmaFiltro] = useState<string>('all')
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<TurmaSimples[]>([])

  // Configurador
  const [showConfig, setShowConfig] = useState(false)
  const [secoes, setSecoes] = useState({
    resumo: true, grafico: true, porSala: true,
    topAlunos: true, atencao: true, professores: true,
  })
  const [camposExport, setCamposExport] = useState({
    presenca: true, faltas: true, visitantes: true,
    biblias: true, revistas: true, oferta: true,
  })

  const [domingosPorMes, setDomingosPorMes] = useState<Record<number, DadosDomingo[]>>({})
  const [resumoMensal, setResumoMensal] = useState<DadosMes[]>([])
  const [dadosSala, setDadosSala] = useState<DadosSala[]>([])
  const [topAlunos, setTopAlunos] = useState<AlunoFrequente[]>([])
  const [alunosAtencao, setAlunosAtencao] = useState<AlunoFrequente[]>([])
  const [professores, setProfessores] = useState<ProfessorDesempenho[]>([])

  // ── Carregar turmas disponíveis ──
  useEffect(() => {
    db.from('turmas').select('id, nome').eq('ativa', true).order('nome')
      .then(({ data }: any) => setTurmasDisponiveis(data ?? []))
  }, [])

  // ── Dados anuais: chamadas + presenças ──
  useEffect(() => {
    async function load() {
      let q = db.from('chamadas')
        .select('id, data, turma_id, oferta, presencas(presente, trouxe_biblia, trouxe_revista), historico_visitantes(id)')
        .eq('ano', ano)
        .order('data', { ascending: true })
      if (turmaFiltro !== 'all') q = q.eq('turma_id', turmaFiltro)
      const { data: chamadas } = await q

      if (!chamadas?.length) { setDomingosPorMes({}); setResumoMensal([]); return }

      const porMes: Record<number, DadosDomingo[]> = {}
      const mensal: DadosMes[] = Array.from({ length: 12 }, (_, i) => ({
        mes: MESES[i], presentes: 0, faltas: 0, visitantes: 0,
        biblias: 0, revistas: 0, oferta: 0, total: 0, domingos: 0,
      }))

      for (const c of chamadas) {
        if (!c.data) continue
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
        mensal[m].total     += ps.length
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
  }, [ano, turmaFiltro])

  // ── Dados por sala ──
  useEffect(() => {
    async function load() {
      const { data: turmas } = await db.from('turmas').select('id, nome, cor').eq('ativa', true)
      if (!turmas?.length) { setDadosSala([]); return }

      // Filtrar apenas a turma selecionada (se houver)
      const turmasFiltradas = turmaFiltro !== 'all'
        ? turmas.filter((t: any) => t.id === turmaFiltro)
        : turmas

      const resultado: DadosSala[] = await Promise.all(turmasFiltradas.map(async (turma: any, idx: number) => {
        const [{ count: matriculados }, { data: chamadasRaw }] = await Promise.all([
          db.from('alunos').select('id', { count: 'exact', head: true }).eq('turma_id', turma.id).eq('ativo', true),
          db.from('chamadas')
            .select('id, data, oferta, presencas(presente, trouxe_biblia, trouxe_revista), historico_visitantes(id)')
            .eq('turma_id', turma.id).eq('ano', ano),
        ])

        const chamadas = filtrarPorPeriodo(chamadasRaw ?? [], { granularidade, mes, trim })

        let presentes = 0, faltas = 0, biblias = 0, revistas = 0, visitantes = 0, oferta = 0, total = 0
        for (const c of chamadas) {
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
  }, [ano, mes, trim, granularidade, turmaFiltro])

  // ── Top alunos + atenção ──
  useEffect(() => {
    async function load() {
      let qCh = db.from('chamadas').select('id, data').eq('ano', ano)
      if (turmaFiltro !== 'all') qCh = qCh.eq('turma_id', turmaFiltro)
      const { data: chamadasRaw } = await qCh
      const chamadas = filtrarPorPeriodo(chamadasRaw ?? [], { granularidade, mes, trim })
      if (!chamadas.length) { setTopAlunos([]); setAlunosAtencao([]); return }

      const { data: presencas } = await db.from('presencas').select('aluno_id, presente').in('chamada_id', chamadas.map((c: any) => c.id))
      if (!presencas?.length) { setTopAlunos([]); setAlunosAtencao([]); return }

      const ppa: Record<string, { presentes: number; total: number }> = {}
      for (const p of presencas) {
        if (!ppa[p.aluno_id]) ppa[p.aluno_id] = { presentes: 0, total: 0 }
        ppa[p.aluno_id].total++
        if (p.presente) ppa[p.aluno_id].presentes++
      }

      let qAlunos = db.from('alunos').select('id, nome, turmas(nome)').in('id', Object.keys(ppa)).eq('ativo', true)
      if (turmaFiltro !== 'all') qAlunos = qAlunos.eq('turma_id', turmaFiltro)
      const { data: alunos } = await qAlunos
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
  }, [ano, mes, trim, granularidade, turmaFiltro])

  // ── Professores ──
  useEffect(() => {
    async function load() {
      let qProfs = db.from('professores').select('id, nome, professor_turmas(turma_id, turmas(nome))').eq('ativo', true)
      const { data: profsList } = await qProfs
      if (!profsList?.length) { setProfessores([]); return }

      // Filtrar professores da turma selecionada
      const profsFiltered = turmaFiltro !== 'all'
        ? profsList.filter((p: any) => (p.professor_turmas ?? []).some((pt: any) => pt.turma_id === turmaFiltro))
        : profsList

      const { data: profAlunos } = await db
        .from('alunos').select('id, responsavel, turma_id').like('responsavel', 'professor:%').eq('ativo', true)
      const profIdToAluno = new Map<string, { alunoId: string; turmaId: string | null }>()
      for (const a of profAlunos ?? []) {
        const pid = (a.responsavel as string).replace('professor:', '')
        if (pid) profIdToAluno.set(pid, { alunoId: a.id, turmaId: a.turma_id ?? null })
      }

      const resultado: ProfessorDesempenho[] = await Promise.all(profsFiltered.map(async (prof: any) => {
        const turmaIds = (prof.professor_turmas ?? []).map((pt: any) => pt.turma_id).filter(Boolean)
        const turmasNomes = (prof.professor_turmas ?? []).map((pt: any) => pt.turmas?.nome).filter(Boolean)

        if (!turmaIds.length) return { nome: prof.nome, turmas: [], aulas: 0, presMedia: 0, biblias: 0 }

        const filteredTurmaIds = turmaFiltro !== 'all' ? turmaIds.filter((id: string) => id === turmaFiltro) : turmaIds

        const { data: chamadasRaw } = await db
          .from('chamadas').select('id, data').in('turma_id', filteredTurmaIds).eq('ano', ano)
        const chamadas = filtrarPorPeriodo(chamadasRaw ?? [], { granularidade, mes, trim })
        const aulas = chamadas.length

        const alunoInfo = profIdToAluno.get(prof.id) ?? null
        let presMedia = 0, biblias = 0
        if (alunoInfo?.turmaId) {
          const { data: alunoChRaw } = await db
            .from('chamadas').select('id, data').eq('turma_id', alunoInfo.turmaId).eq('ano', ano)
          const alunoChFilt = filtrarPorPeriodo(alunoChRaw ?? [], { granularidade, mes, trim })
          if (alunoChFilt.length > 0) {
            const { data: pPresencas } = await db
              .from('presencas').select('presente, trouxe_biblia')
              .eq('aluno_id', alunoInfo.alunoId).in('chamada_id', alunoChFilt.map((c: any) => c.id))
            const presentes = pPresencas?.filter((p: any) => p.presente).length ?? 0
            const bibCount  = pPresencas?.filter((p: any) => p.trouxe_biblia).length ?? 0
            presMedia = calcularPct(presentes, alunoChFilt.length)
            biblias   = presentes > 0 ? calcularPct(bibCount, presentes) : 0
          }
        }

        return { nome: prof.nome, turmas: turmasNomes, aulas, presMedia, biblias }
      }))

      setProfessores(resultado.sort((a, b) => b.presMedia - a.presMedia))
    }
    load()
  }, [ano, mes, trim, granularidade, turmaFiltro])

  // ── Cálculo do período ──
  const domingosList = agregarPorData(domingosPorMes[mes] ?? [])

  const { dados, grafico, labelPeriodo } = (() => {
    if (granularidade === 'dia') {
      const d = domingosList[domingoIdx] ?? { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0, total: 0 }
      return {
        dados: { ...d, domingos: 1, pct: calcularPct(d.presentes, d.total) },
        grafico: domingosList.map(dd => ({ periodo: dd.data, presentes: dd.presentes, pct: calcularPct(dd.presentes, dd.total) })),
        labelPeriodo: domingosList[domingoIdx] ? `${domingosList[domingoIdx].data}/${ano} — ${MESES[mes]}` : `${MESES[mes]} ${ano}`,
      }
    }

    if (granularidade === 'mes') {
      const d = resumoMensal[mes] ?? dadosVazios()
      return {
        dados: { ...d, pct: calcularPct(d.presentes, d.total) },
        grafico: domingosList.length > 0
          ? domingosList.map(dd => ({ periodo: dd.data, presentes: dd.presentes, pct: calcularPct(dd.presentes, dd.total) }))
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

  const labelTurma = turmaFiltro === 'all' ? 'Todas as turmas' : (turmasDisponiveis.find(t => t.id === turmaFiltro)?.nome ?? '')
  const labelRelatorio = `${labelPeriodo}${turmaFiltro !== 'all' ? ` — ${labelTurma}` : ''}`
  const anoIdx = ANOS_DISPONIVEIS.indexOf(ano)

  // ── Handlers de exportação ──
  function buildFilename(ext: string) {
    const safe = labelRelatorio.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase()
    return `relatorio-ebd-${safe}.${ext}`
  }

  function buildResumoRows() {
    return [{
      Período: labelRelatorio,
      ...(camposExport.presenca ? { 'Presença (%)': dados.pct, Presentes: dados.presentes } : {}),
      ...(camposExport.faltas   ? { Faltas: dados.faltas } : {}),
      ...(camposExport.visitantes ? { Visitantes: dados.visitantes } : {}),
      ...(camposExport.biblias  ? { Bíblias: dados.biblias } : {}),
      ...(camposExport.revistas ? { Revistas: dados.revistas } : {}),
      ...(camposExport.oferta   ? { 'Oferta (R$)': (dados.oferta / 100).toFixed(2) } : {}),
      'Domingos/Aulas': dados.domingos,
    }]
  }

  function buildSalaRows() {
    return dadosSala.map(s => ({
      Sala: s.sala,
      Matriculados: s.matriculados,
      ...(camposExport.presenca ? { 'Presença (%)': s.presencaMedia, Presentes: s.presentes } : {}),
      ...(camposExport.faltas   ? { Faltas: s.faltas } : {}),
      ...(camposExport.visitantes ? { Visitantes: s.visitantes } : {}),
      ...(camposExport.biblias  ? { Bíblias: s.biblias } : {}),
      ...(camposExport.revistas ? { Revistas: s.revistas } : {}),
      ...(camposExport.oferta   ? { 'Oferta (R$)': (s.oferta / 100).toFixed(2) } : {}),
    }))
  }

  function buildAlunoRows() {
    return topAlunos.map((a, i) => ({
      '#': i + 1,
      Aluno: a.nome,
      Sala: a.sala,
      ...(camposExport.presenca ? { 'Presença (%)': a.pct, Presentes: a.presentes, Total: a.total } : {}),
      ...(camposExport.faltas   ? { Faltas: a.faltas } : {}),
    }))
  }

  function buildProfRows() {
    return professores.map(p => ({
      Professor: p.nome,
      Turmas: p.turmas.join(', '),
      Aulas: p.aulas,
      ...(camposExport.presenca ? { 'Presença pessoal (%)': p.presMedia } : {}),
      ...(camposExport.biblias  ? { 'Bíblias (%)': p.biblias } : {}),
    }))
  }

  function handleExportCSV() {
    const allRows: Record<string, any>[] = []
    if (secoes.resumo) allRows.push(...buildResumoRows())
    allRows.push({}) // linha vazia separadora
    if (secoes.porSala && dadosSala.length > 0) allRows.push(...buildSalaRows())
    allRows.push({})
    if (secoes.topAlunos && topAlunos.length > 0) allRows.push(...buildAlunoRows())
    allRows.push({})
    if (secoes.professores && professores.length > 0) allRows.push(...buildProfRows())
    exportarCSV(allRows.filter((r, i, arr) => !(Object.keys(r).length === 0 && i === arr.length - 1)), buildFilename('csv'))
  }

  function handleExportExcel() {
    const sheets: { nome: string; rows: Record<string, any>[] }[] = []
    if (secoes.resumo) sheets.push({ nome: 'Resumo', rows: buildResumoRows() })
    if (secoes.porSala && dadosSala.length > 0) sheets.push({ nome: 'Por Sala', rows: buildSalaRows() })
    if (secoes.topAlunos && topAlunos.length > 0) sheets.push({ nome: 'Top Alunos', rows: buildAlunoRows() })
    if (secoes.professores && professores.length > 0) sheets.push({ nome: 'Professores', rows: buildProfRows() })
    if (sheets.length > 0) exportarExcel(sheets, buildFilename('xlsx'))
  }

  function handlePDF() {
    window.print()
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* CSS de impressão */}
      <style>{`
        @media print {
          [data-no-print] { display: none !important; }
          [data-print-hidden] { display: none !important; }
          aside, nav { display: none !important; }
          body { background: white !important; }
          .card { page-break-inside: avoid; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-no-print>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground mt-1">Visualize e exporte estatísticas por período e turma</p>
          </div>
          <div className="flex flex-wrap gap-2" data-no-print>
            <Button variant="outline" size="sm" onClick={() => setShowConfig(v => !v)}>
              <Settings2 className="h-4 w-4 mr-2" />{showConfig ? 'Fechar config.' : 'Configurar'}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePDF}>
              <FileText className="h-4 w-4 mr-2" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <BarChart3 className="h-4 w-4 mr-2" />Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />CSV
            </Button>
          </div>
        </div>

        {/* Painel de configuração */}
        {showConfig && (
          <Card data-no-print>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="h-4 w-4" />Configurar Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Seções visíveis */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Seções visíveis</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['resumo',     'Resumo / KPIs'],
                    ['grafico',    'Gráfico evolução'],
                    ['porSala',    'Presença por sala'],
                    ['topAlunos',  'Top 10 alunos'],
                    ['atencao',    'Alunos em atenção'],
                    ['professores','Professores'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSecoes(s => ({ ...s, [key]: !s[key] }))}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                        secoes[key]
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground hover:bg-muted border-border'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos exportados */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Campos na exportação (CSV / Excel)</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['presenca',   'Presença %'],
                    ['faltas',     'Faltas'],
                    ['visitantes', 'Visitantes'],
                    ['biblias',    'Bíblias'],
                    ['revistas',   'Revistas'],
                    ['oferta',     'Oferta'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setCamposExport(s => ({ ...s, [key]: !s[key] }))}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                        camposExport[key]
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground hover:bg-muted border-border'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros de Período */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Granularidade */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b bg-muted/30" data-no-print>
            <div>
              <p className="font-semibold">Período do Relatório</p>
              <p className="text-sm text-muted-foreground">{labelRelatorio}</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/40 self-start sm:self-auto flex-wrap">
              {(['dia', 'mes', 'trimestre', 'ano'] as Granularidade[]).map((g) => (
                <button key={g} onClick={() => setGranularidade(g)}
                  className={cn('px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all', granularidade === g ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                  {g === 'dia' ? 'Dia' : g === 'mes' ? 'Mês' : g === 'trimestre' ? 'Trim.' : 'Ano'}
                </button>
              ))}
            </div>
          </div>

          {/* Ano */}
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap" data-no-print>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Ano</span>
            <div className="flex items-center gap-1">
              <button onClick={() => anoIdx > 0 && setAno(ANOS_DISPONIVEIS[anoIdx - 1])} disabled={anoIdx === 0} className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
              {ANOS_DISPONIVEIS.map(a => (
                <button key={a} onClick={() => setAno(a)} className={cn('px-3 py-1 rounded text-sm font-semibold transition-all', ano === a ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground')}>{a}</button>
              ))}
              <button onClick={() => anoIdx < ANOS_DISPONIVEIS.length - 1 && setAno(ANOS_DISPONIVEIS[anoIdx + 1])} disabled={anoIdx === ANOS_DISPONIVEIS.length - 1} className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Turma */}
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap" data-no-print>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Turma</span>
            <Select value={turmaFiltro} onValueChange={v => { setTurmaFiltro(v); setDomingoIdx(0) }}>
              <SelectTrigger className="h-8 text-sm w-auto min-w-[180px] max-w-[280px]">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmasDisponiveis.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Trimestre */}
          {granularidade === 'trimestre' && (
            <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap" data-no-print>
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
            <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap" data-no-print>
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
            <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap" data-no-print>
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
          {secoes.resumo && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-x divide-y md:divide-y-0">
              {[
                { label: 'Presença',  value: `${dados.pct}%`,                              sub: `${dados.presentes} presentes`, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,  color: 'text-green-600' },
                { label: 'Faltas',    value: dados.faltas,                                  sub: 'ausências',                    icon: <XCircle      className="h-4 w-4 text-red-500" />,    color: 'text-red-600' },
                { label: 'Visitantes',value: dados.visitantes,                              sub: 'novos',                        icon: <UserPlus     className="h-4 w-4 text-blue-500" />,   color: 'text-blue-600' },
                { label: 'Bíblias',   value: dados.biblias,                                 sub: 'trouxeram',                    icon: <Book         className="h-4 w-4 text-purple-500" />, color: 'text-purple-600' },
                { label: 'Revistas',  value: dados.revistas,                                sub: 'trouxeram',                    icon: <BookOpen     className="h-4 w-4 text-orange-500" />, color: 'text-orange-600' },
                { label: 'Oferta',    value: `R$ ${dados.oferta.toLocaleString('pt-BR')}`,  sub: 'arrecadado',                   icon: <DollarSign   className="h-4 w-4 text-emerald-500" />, color: 'text-emerald-600' },
                { label: 'Domingos',  value: dados.domingos,                                sub: 'aulas realizadas',             icon: <Calendar     className="h-4 w-4 text-muted-foreground" />, color: '' },
              ].map((kpi, i) => (
                <div key={i} className="flex flex-col items-center justify-center py-4 px-3 text-center">
                  <div className="mb-1">{kpi.icon}</div>
                  <span className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{kpi.label}</span>
                  <span className="text-[10px] text-muted-foreground">{kpi.sub}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico de Evolução */}
        {secoes.grafico && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução de Presença no Período</CardTitle>
              <CardDescription>{labelRelatorio}</CardDescription>
            </CardHeader>
            <CardContent>
              {grafico.length === 0 ? (
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
        )}

        {/* Presença por Sala */}
        {secoes.porSala && (
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

                  {/* Cards mobile */}
                  <div className="sm:hidden space-y-3">
                    {dadosSala.map((s, i) => (
                      <div key={i} className="rounded-xl border bg-card overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.cor }} />
                            <span className="font-semibold text-sm truncate">{s.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</span>
                          </div>
                          <Badge className={cn('text-xs border flex-shrink-0 ml-2', badgePresenca(s.presencaMedia))}>{s.presencaMedia}%</Badge>
                        </div>
                        <div className="px-4 pb-2">
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.presencaMedia}%`, backgroundColor: s.cor }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 divide-x border-t">
                          <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold text-green-600">{s.presentes}</span><span className="text-[10px] text-muted-foreground">Pres.</span></div>
                          <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold text-red-600">{s.faltas}</span><span className="text-[10px] text-muted-foreground">Faltas</span></div>
                          <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold text-blue-600">{s.visitantes}</span><span className="text-[10px] text-muted-foreground">Visit.</span></div>
                          <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold">{s.matriculados}</span><span className="text-[10px] text-muted-foreground">Mat.</span></div>
                        </div>
                        <div className="grid grid-cols-3 divide-x border-t bg-muted/30">
                          <div className="flex flex-col items-center py-2"><span className="text-xs font-semibold text-purple-600">{s.biblias}</span><span className="text-[10px] text-muted-foreground">Bíblias</span></div>
                          <div className="flex flex-col items-center py-2"><span className="text-xs font-semibold text-orange-600">{s.revistas}</span><span className="text-[10px] text-muted-foreground">Revistas</span></div>
                          <div className="flex flex-col items-center py-2"><span className="text-xs font-semibold text-emerald-600">{s.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span className="text-[10px] text-muted-foreground">Oferta R$</span></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block rounded-lg border overflow-x-auto">
                    <Table className="min-w-[480px]">
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Sala</TableHead>
                          <TableHead className="text-center hidden sm:table-cell">Mat.</TableHead>
                          <TableHead className="text-center">Pres.</TableHead>
                          <TableHead className="text-center">Faltas</TableHead>
                          <TableHead className="text-center hidden md:table-cell">Visit.</TableHead>
                          <TableHead className="text-center hidden md:table-cell">Bíblias</TableHead>
                          <TableHead className="text-center hidden lg:table-cell">Revistas</TableHead>
                          <TableHead className="text-center hidden lg:table-cell">Oferta</TableHead>
                          <TableHead className="text-center">%</TableHead>
                          <TableHead className="hidden sm:table-cell">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dadosSala.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.cor }} />
                                <span className="font-medium text-sm">{s.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">{s.matriculados}</TableCell>
                            <TableCell className="text-center text-green-600 font-semibold">{s.presentes}</TableCell>
                            <TableCell className="text-center text-red-600 font-semibold">{s.faltas}</TableCell>
                            <TableCell className="text-center text-blue-600 hidden md:table-cell">{s.visitantes}</TableCell>
                            <TableCell className="text-center text-purple-600 hidden md:table-cell">{s.biblias}</TableCell>
                            <TableCell className="text-center text-orange-600 hidden lg:table-cell">{s.revistas}</TableCell>
                            <TableCell className="text-center text-emerald-600 hidden lg:table-cell">R$ {s.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center gap-1.5 justify-center">
                                <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                                  <div className="h-full rounded-full" style={{ width: `${s.presencaMedia}%`, backgroundColor: corPresenca(s.presencaMedia) }} />
                                </div>
                                <span className="text-xs font-bold" style={{ color: corPresenca(s.presencaMedia) }}>{s.presencaMedia}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
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
        )}

        {/* Alunos: Destaques + Atenção */}
        {(secoes.topAlunos || secoes.atencao) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {secoes.topAlunos && (
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
                    <>
                      {/* Lista mobile */}
                      <div className="sm:hidden space-y-2">
                        {topAlunos.map((a, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                            <span className={`w-7 text-center font-bold flex-shrink-0 text-sm ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                              {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}º`}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{a.nome}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{a.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', a.pct === 100 ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary')}>{a.pct}%</span>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{a.presentes}/{a.total}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden sm:block rounded-lg border overflow-x-auto">
                        <Table className="min-w-[340px]">
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="w-8">#</TableHead>
                              <TableHead>Aluno</TableHead>
                              <TableHead className="hidden sm:table-cell">Sala</TableHead>
                              <TableHead className="text-center">Presença</TableHead>
                              <TableHead className="text-center hidden sm:table-cell">Faltas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {topAlunos.map((a, i) => (
                              <TableRow key={i}>
                                <TableCell className={`font-bold text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}º`}
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                  {a.nome}
                                  <p className="text-[11px] text-muted-foreground sm:hidden">{a.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</p>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell"><span className="text-xs text-muted-foreground">{a.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</span></TableCell>
                                <TableCell className="text-center">
                                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', a.pct === 100 ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary')}>{a.pct}%</span>
                                  <p className="text-[10px] text-muted-foreground">{a.presentes}/{a.total}</p>
                                </TableCell>
                                <TableCell className="text-center hidden sm:table-cell">
                                  <span className={cn('text-sm font-semibold', a.faltas === 0 ? 'text-green-600' : 'text-red-500')}>{a.faltas}</span>
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
            )}

            {secoes.atencao && (
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
            )}
          </div>
        )}

        {/* Desempenho dos Professores */}
        {secoes.professores && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-500" />Desempenho dos Professores
              </CardTitle>
              <CardDescription>Aulas ministradas e presença pessoal de cada professor no período</CardDescription>
            </CardHeader>
            <CardContent>
              {professores.length === 0 ? (
                <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
              ) : (
                <>
                  {/* Cards mobile */}
                  <div className="sm:hidden space-y-3">
                    {professores.map((p, i) => (
                      <div key={i} className="rounded-xl border bg-card overflow-hidden">
                        <div className="px-4 py-3">
                          <p className="font-semibold text-sm">{p.nome}</p>
                          {p.turmas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {p.turmas.map((t, j) => <Badge key={j} variant="secondary" className="text-xs">{t}</Badge>)}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 divide-x border-t bg-muted/30">
                          <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold">{p.aulas}</span><span className="text-[10px] text-muted-foreground">Aulas</span></div>
                          <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold" style={{ color: corPresenca(p.presMedia) }}>{p.presMedia}%</span><span className="text-[10px] text-muted-foreground">Presença</span></div>
                          <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold text-purple-600">{p.biblias}%</span><span className="text-[10px] text-muted-foreground">Bíblias</span></div>
                        </div>
                        <div className="px-4 py-2 border-t flex items-center justify-end">
                          <Badge className={cn('text-xs border', p.aulas > 0 ? badgePresenca(p.presMedia) : 'bg-muted text-muted-foreground border-muted')}>
                            {p.aulas > 0 ? labelPresenca(p.presMedia) : 'Sem aulas'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block rounded-lg border overflow-x-auto">
                    <Table className="min-w-[480px]">
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Professor</TableHead>
                          <TableHead className="hidden sm:table-cell">Turmas</TableHead>
                          <TableHead className="text-center">Aulas</TableHead>
                          <TableHead className="text-center">Presença</TableHead>
                          <TableHead className="text-center hidden sm:table-cell">Bíblias %</TableHead>
                          <TableHead>Avaliação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {professores.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {p.nome}
                              <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5">
                                {p.turmas.map((t, j) => <span key={j} className="text-[11px] text-muted-foreground">{t}</span>)}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="flex flex-col gap-0.5">
                                {p.turmas.length > 0
                                  ? p.turmas.map((t, j) => <span key={j} className="text-xs text-muted-foreground">{t}</span>)
                                  : <span className="text-xs text-muted-foreground">Sem turma</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold">{p.aulas}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                                  <div className="h-full rounded-full" style={{ width: `${p.presMedia}%`, backgroundColor: corPresenca(p.presMedia) }} />
                                </div>
                                <span className="text-xs font-bold" style={{ color: corPresenca(p.presMedia) }}>{p.presMedia}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
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
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exportar (mobile-friendly) */}
        <Card data-no-print>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Exportar Relatório</CardTitle>
            <CardDescription>
              {labelRelatorio} — {Object.values(secoes).filter(Boolean).length} seção(ões) selecionada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <Button variant="outline" className="w-full" onClick={handlePDF}>
                <FileText className="h-4 w-4 mr-2" />Exportar PDF
              </Button>
              <Button variant="outline" className="w-full" onClick={handleExportExcel}>
                <BarChart3 className="h-4 w-4 mr-2" />Exportar Excel
              </Button>
              <Button variant="outline" className="w-full" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

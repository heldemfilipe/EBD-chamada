"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartTooltip } from '@/components/ui/chart-tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Download, Calendar, CheckCircle2, XCircle,
  FileText, BookOpen, Book, DollarSign, UserPlus, ChevronLeft, ChevronRight, BarChart3, Filter,
} from 'lucide-react'
import {
  buscarTurmasDisponiveis, buscarChamadasPorAno, buscarDadosPorSala,
  buscarRankingAlunos, buscarProfessoresRelatorio, buscarVisitantesPorChamadas, buscarAlunosTurmaDetalhado,
} from '@/actions/relatorios'
import { ANOS_DISPONIVEIS, MESES, MESES_CURTOS, TRIMESTRES } from '@/lib/constants'
import { calcularPct, resolverCor } from '@/lib/presence'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { exportarCSV, exportarExcel } from '@/lib/export'
import { filtrarPorPeriodo, type Granularidade } from '@/lib/relatorio-utils'
import { ExportDialog } from './_ExportDialog'
import { SecaoSalas } from './_SecaoSalas'
import { SecaoAlunos } from './_SecaoAlunos'
import { SecaoProfessores } from './_SecaoProfessores'
import { SecaoVisitantes } from './_SecaoVisitantes'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type FormatoExport = 'pdf' | 'excel' | 'csv'

interface ExportSecoes {
  resumo: boolean; grafico: boolean; porSala: boolean
  alunosTurma: boolean; topAlunos: boolean; atencao: boolean; professores: boolean; visitantesRelatorio: boolean
}
interface ExportCampos {
  presenca: boolean; faltas: boolean; visitantes: boolean
  biblias: boolean; revistas: boolean; oferta: boolean
}

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
interface AlunoTurmaStats {
  id: string; nome: string; cargo: string
  presentes: number; faltas: number; total: number; pct: number
  biblias: number; revistas: number
}
interface VisitanteRelatorio {
  id: string; nome: string; telefone: string; convertido: boolean
  visitas: { data: string; presente: boolean; trouxe_biblia: boolean; trouxe_revista: boolean }[]
  presentes: number; pct: number; biblias: number; revistas: number
}

const SECOES_INICIAL: ExportSecoes = {
  resumo: true, grafico: true, porSala: true,
  alunosTurma: true, topAlunos: true, atencao: true, professores: true, visitantesRelatorio: true,
}
const CAMPOS_INICIAL: ExportCampos = {
  presenca: true, faltas: true, visitantes: true,
  biblias: true, revistas: true, oferta: true,
}

function dadosVazios() {
  return { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0, total: 0, domingos: 0, pct: 0 }
}

function agregarPorData(entries: DadosDomingo[]): DadosDomingo[] {
  const map = new Map<string, DadosDomingo>()
  for (const dd of entries) {
    const prev = map.get(dd.data)
    if (!prev) { map.set(dd.data, { ...dd }) } else {
      map.set(dd.data, {
        ...prev,
        presentes: prev.presentes + dd.presentes, faltas: prev.faltas + dd.faltas,
        visitantes: prev.visitantes + dd.visitantes, biblias: prev.biblias + dd.biblias,
        revistas: prev.revistas + dd.revistas, oferta: prev.oferta + dd.oferta,
        total: prev.total + dd.total,
      })
    }
  }
  return [...map.values()]
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [granularidade, setGranularidade] = useState<Granularidade>('trimestre')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth())
  const [trim, setTrim] = useState(Math.floor(new Date().getMonth() / 3))
  const [domingoIdx, setDomingoIdx] = useState(0)

  const [turmaFiltro, setTurmaFiltro] = useState<string>('all')
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<TurmaSimples[]>([])

  // Estado do dialog de exportação
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormato, setExportFormato] = useState<FormatoExport>('pdf')
  const [exportSecoes, setExportSecoes] = useState<ExportSecoes>(SECOES_INICIAL)
  const [exportCampos, setExportCampos] = useState<ExportCampos>(CAMPOS_INICIAL)

  const [domingosPorMes, setDomingosPorMes] = useState<Record<number, DadosDomingo[]>>({})
  const [resumoMensal, setResumoMensal] = useState<DadosMes[]>([])
  const [dadosSala, setDadosSala] = useState<DadosSala[]>([])
  const [topAlunos, setTopAlunos] = useState<AlunoFrequente[]>([])
  const [alunosAtencao, setAlunosAtencao] = useState<AlunoFrequente[]>([])
  const [professores, setProfessores] = useState<ProfessorDesempenho[]>([])
  const [alunosTurma, setAlunosTurma] = useState<AlunoTurmaStats[]>([])
  const [sortAlunosTurma, setSortAlunosTurma] = useState<'pct' | 'nome' | 'faltas'>('pct')
  const [visitantesRel, setVisitantesRel] = useState<VisitanteRelatorio[]>([])
  const [sortVisitantes, setSortVisitantes] = useState<'visitas' | 'nome' | 'pct'>('visitas')
  const [chamadasRaw, setChamadasRaw] = useState<{ id: string; data: string; turma_id: string; oferta: number; presentes: number; ausentes: number; biblias: number; revistas: number; visitantes: number }[]>([])

  const chamadaIdsFiltrados = useMemo(() => {
    const filtradas = filtrarPorPeriodo(chamadasRaw, { granularidade, mes, trim })
    return filtradas.map(c => c.id)
  }, [chamadasRaw, granularidade, mes, trim])

  // ── useMemos para listas ordenadas ────────────────────────────────────────────
  const visitantesOrdenados = useMemo(() => {
    const lista = [...visitantesRel]
    if (sortVisitantes === 'visitas')  return lista.sort((a, b) => b.visitas.length - a.visitas.length)
    if (sortVisitantes === 'nome')     return lista.sort((a, b) => a.nome.localeCompare(b.nome))
    if (sortVisitantes === 'pct')      return lista.sort((a, b) => b.pct - a.pct)
    return lista
  }, [visitantesRel, sortVisitantes])

  const alunosTurmaOrdenados = useMemo(() => {
    const lista = [...alunosTurma]
    if (sortAlunosTurma === 'pct')    return lista.sort((a, b) => b.pct - a.pct)
    if (sortAlunosTurma === 'nome')   return lista.sort((a, b) => a.nome.localeCompare(b.nome))
    if (sortAlunosTurma === 'faltas') return lista.sort((a, b) => b.faltas - a.faltas)
    return lista
  }, [alunosTurma, sortAlunosTurma])

  useEffect(() => {
    buscarTurmasDisponiveis().then(setTurmasDisponiveis)
  }, [])

  useEffect(() => {
    let cancelado = false
    async function load() {
      const chamadas = await buscarChamadasPorAno(ano, turmaFiltro !== 'all' ? turmaFiltro : undefined)
      if (cancelado) return
      setChamadasRaw(chamadas)
      if (!chamadas.length) { setDomingosPorMes({}); setResumoMensal([]); return }

      const porMes: Record<number, DadosDomingo[]> = {}
      const mensal: DadosMes[] = Array.from({ length: 12 }, (_, i) => ({
        mes: MESES[i], presentes: 0, faltas: 0, visitantes: 0,
        biblias: 0, revistas: 0, oferta: 0, total: 0, domingos: 0,
      }))

      for (const c of chamadas) {
        if (!c.data) continue
        const m = parseISO(c.data).getMonth()
        if (!porMes[m]) porMes[m] = []
        const total = c.presentes + c.ausentes
        porMes[m].push({
          data: format(parseISO(c.data), 'dd/MM', { locale: ptBR }),
          presentes: c.presentes, faltas: c.ausentes, visitantes: c.visitantes,
          biblias: c.biblias, revistas: c.revistas,
          oferta: c.oferta, total,
        })
        mensal[m].domingos++
        mensal[m].total += total; mensal[m].presentes += c.presentes
        mensal[m].faltas += c.ausentes; mensal[m].biblias += c.biblias
        mensal[m].revistas += c.revistas; mensal[m].visitantes += c.visitantes
        mensal[m].oferta += c.oferta
      }
      setDomingosPorMes(porMes)
      setResumoMensal(mensal)
    }
    load()
    return () => { cancelado = true }
  }, [ano, turmaFiltro])

  useEffect(() => {
    let cancelado = false
    async function load() {
      const { turmas, chamadas } = await buscarDadosPorSala(ano)
      if (cancelado) return
      if (!turmas.length) { setDadosSala([]); return }
      const turmasFiltradas = turmaFiltro !== 'all' ? turmas.filter(t => t.id === turmaFiltro) : turmas

      const resultado: DadosSala[] = turmasFiltradas.map((turma, idx) => {
        const chamadasTurma = filtrarPorPeriodo(
          chamadas.filter(c => c.turma_id === turma.id),
          { granularidade, mes, trim }
        )
        let presentes = 0, faltas = 0, biblias = 0, revistas = 0, visitantes = 0, oferta = 0, total = 0
        for (const c of chamadasTurma) {
          total += c.presentes + c.ausentes
          presentes += c.presentes; faltas += c.ausentes
          biblias += c.biblias; revistas += c.revistas
          visitantes += c.visitantes; oferta += c.oferta
        }
        return {
          sala: turma.nome, cor: resolverCor(turma.cor, idx),
          matriculados: turma.totalAlunos,
          presencaMedia: calcularPct(presentes, total),
          presentes, faltas, visitantes, biblias, revistas, oferta,
        }
      })
      setDadosSala(resultado)
    }
    load()
    return () => { cancelado = true }
  }, [ano, mes, trim, granularidade, turmaFiltro])

  useEffect(() => {
    let cancelado = false
    async function load() {
      if (!chamadaIdsFiltrados.length) { setTopAlunos([]); setAlunosAtencao([]); return }
      const ranking = await buscarRankingAlunos(chamadaIdsFiltrados, turmaFiltro !== 'all' ? turmaFiltro : undefined)
      if (cancelado) return
      if (!ranking.length) { setTopAlunos([]); setAlunosAtencao([]); return }

      const lista: AlunoFrequente[] = ranking.map(r => {
        const pct = calcularPct(r.presentes, r.total)
        return { nome: r.nome, sala: r.turma_nome, presentes: r.presentes, total: r.total, pct, faltas: r.total - r.presentes }
      })
      setTopAlunos([...lista].sort((a, b) => b.pct - a.pct || b.presentes - a.presentes).slice(0, 10))
      setAlunosAtencao([...lista].filter(a => a.pct < 50).sort((a, b) => a.pct - b.pct))
    }
    load()
    return () => { cancelado = true }
  }, [chamadaIdsFiltrados, turmaFiltro])

  useEffect(() => {
    let cancelado = false
    async function load() {
      const data = await buscarProfessoresRelatorio(ano)
      if (cancelado) return
      if (!data.professores.length) { setProfessores([]); return }

      const profIdToAluno = new Map<string, { alunoId: string; turmaId: string | null }>()
      for (const a of data.profAlunos) {
        const pid = a.responsavel.replace('professor:', '')
        if (pid) profIdToAluno.set(pid, { alunoId: a.id, turmaId: a.turma_id })
      }

      const profsFiltered = turmaFiltro !== 'all'
        ? data.professores.filter(p =>
            p.turmas.some((t: any) => t.turma_id === turmaFiltro) ||
            profIdToAluno.get(p.id)?.turmaId === turmaFiltro
          )
        : data.professores

      const presencasPorAluno = new Map<string, Map<string, { presente: boolean; trouxe_biblia: boolean }>>()
      for (const p of data.presencas) {
        if (!presencasPorAluno.has(p.aluno_id)) presencasPorAluno.set(p.aluno_id, new Map())
        presencasPorAluno.get(p.aluno_id)!.set(p.chamada_id, { presente: p.presente, trouxe_biblia: p.trouxe_biblia })
      }

      const resultado: ProfessorDesempenho[] = profsFiltered.map(prof => {
        const turmaIds = prof.turmas.map((t: any) => t.turma_id).filter(Boolean)
        const turmasNomes = prof.turmas.map((t: any) => t.turma_nome).filter(Boolean)
        if (!turmaIds.length) return { nome: prof.nome, turmas: [], aulas: 0, presMedia: 0, biblias: 0 }

        const filteredTurmaIds = turmaFiltro !== 'all' ? turmaIds.filter((id: string) => id === turmaFiltro) : turmaIds
        const chamadasProf = filtrarPorPeriodo(
          data.chamadas.filter(c => filteredTurmaIds.includes(c.turma_id)),
          { granularidade, mes, trim }
        )
        const aulas = chamadasProf.length

        const alunoInfo = profIdToAluno.get(prof.id) ?? null
        let presMedia = 0, biblias = 0
        if (alunoInfo?.turmaId) {
          const chamadasAluno = filtrarPorPeriodo(
            data.chamadas.filter(c => c.turma_id === alunoInfo.turmaId),
            { granularidade, mes, trim }
          )
          if (chamadasAluno.length > 0) {
            const alunoPresencas = presencasPorAluno.get(alunoInfo.alunoId)
            const chamadasComPresenca = chamadasAluno.filter(c => alunoPresencas?.has(c.id))
            const presentes = chamadasComPresenca.filter(c => alunoPresencas!.get(c.id)!.presente).length
            const bibCount = chamadasComPresenca.filter(c => alunoPresencas!.get(c.id)!.trouxe_biblia).length
            presMedia = calcularPct(presentes, chamadasAluno.length)
            biblias = presentes > 0 ? calcularPct(bibCount, presentes) : 0
          }
        }
        return { nome: prof.nome, turmas: turmasNomes, aulas, presMedia, biblias }
      })
      setProfessores(resultado.sort((a, b) => b.presMedia - a.presMedia))
    }
    load()
    return () => { cancelado = true }
  }, [ano, mes, trim, granularidade, turmaFiltro])

  useEffect(() => {
    let cancelado = false
    async function load() {
      if (!chamadaIdsFiltrados.length) { setVisitantesRel([]); return }
      const hist = await buscarVisitantesPorChamadas(chamadaIdsFiltrados)
      if (cancelado) return
      if (!hist.length) { setVisitantesRel([]); return }

      const mapa: Record<string, VisitanteRelatorio> = {}
      for (const h of hist) {
        if (!mapa[h.visitante_id]) {
          mapa[h.visitante_id] = {
            id: h.visitante_id, nome: h.nome, telefone: h.telefone,
            convertido: h.convertido_em_aluno,
            visitas: [], presentes: 0, pct: 0, biblias: 0, revistas: 0,
          }
        }
        const dataFmt = h.data ? format(parseISO(h.data), 'dd/MM', { locale: ptBR }) : '—'
        mapa[h.visitante_id].visitas.push({ data: dataFmt, presente: h.presente, trouxe_biblia: h.trouxe_biblia, trouxe_revista: h.trouxe_revista })
        if (h.presente) {
          mapa[h.visitante_id].presentes++
          if (h.trouxe_biblia) mapa[h.visitante_id].biblias++
          if (h.trouxe_revista) mapa[h.visitante_id].revistas++
        }
      }

      const lista = Object.values(mapa).map(v => ({
        ...v,
        pct: calcularPct(v.presentes, v.visitas.length),
      }))
      setVisitantesRel(lista)
    }
    load()
    return () => { cancelado = true }
  }, [chamadaIdsFiltrados])

  useEffect(() => {
    let cancelado = false
    async function load() {
      if (turmaFiltro === 'all') { setAlunosTurma([]); return }

      const chamadaIdsTurma = filtrarPorPeriodo(
        chamadasRaw.filter(c => c.turma_id === turmaFiltro),
        { granularidade, mes, trim }
      ).map(c => c.id)

      const data = await buscarAlunosTurmaDetalhado(turmaFiltro, chamadaIdsTurma)
      if (cancelado) return
      if (!data.alunos.length) { setAlunosTurma([]); return }

      setAlunosTurma(data.alunos.map(a => {
        const d = data.presencas[a.id] ?? { presentes: 0, faltas: 0, biblias: 0, revistas: 0 }
        return { id: a.id, nome: a.nome, cargo: a.cargo, ...d, total: data.totalChamadas, pct: calcularPct(d.presentes, data.totalChamadas) }
      }))
    }
    load()
    return () => { cancelado = true }
  }, [turmaFiltro, chamadasRaw, mes, trim, granularidade])

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
    const d = resumoMensal.reduce((acc, m) => ({
      ...acc, presentes: acc.presentes + m.presentes, faltas: acc.faltas + m.faltas,
      visitantes: acc.visitantes + m.visitantes, biblias: acc.biblias + m.biblias,
      revistas: acc.revistas + m.revistas, oferta: acc.oferta + m.oferta,
      domingos: acc.domingos + m.domingos, total: acc.total + m.total,
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

  // ── Computed: Alunos da Turma ──
  const top3Turma = useMemo(
    () => [...alunosTurma].filter(a => a.total > 0).sort((a, b) => b.pct - a.pct).slice(0, 3),
    [alunosTurma]
  )
  const mediaPresencaTurma = useMemo(
    () => alunosTurma.length > 0
      ? Math.round(alunosTurma.reduce((s, a) => s + a.pct, 0) / alunosTurma.length)
      : 0,
    [alunosTurma]
  )

  // ── Funções de montagem de dados para exportação ──
  function buildResumoRows(campos: ExportCampos) {
    return [{
      Período: labelRelatorio,
      ...(campos.presenca   ? { 'Presença (%)': dados.pct, Presentes: dados.presentes } : {}),
      ...(campos.faltas     ? { Faltas: dados.faltas } : {}),
      ...(campos.visitantes ? { Visitantes: dados.visitantes } : {}),
      ...(campos.biblias    ? { Bíblias: dados.biblias } : {}),
      ...(campos.revistas   ? { Revistas: dados.revistas } : {}),
      ...(campos.oferta     ? { 'Oferta (R$)': dados.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } : {}),
      'Domingos/Aulas': dados.domingos,
    }]
  }

  function buildSalaRows(campos: ExportCampos) {
    return dadosSala.map(s => ({
      Sala: s.sala,
      Matriculados: s.matriculados,
      ...(campos.presenca   ? { 'Presença (%)': s.presencaMedia, Presentes: s.presentes } : {}),
      ...(campos.faltas     ? { Faltas: s.faltas } : {}),
      ...(campos.visitantes ? { Visitantes: s.visitantes } : {}),
      ...(campos.biblias    ? { Bíblias: s.biblias } : {}),
      ...(campos.revistas   ? { Revistas: s.revistas } : {}),
      ...(campos.oferta     ? { 'Oferta (R$)': s.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } : {}),
    }))
  }

  function buildAlunoRows(campos: ExportCampos) {
    return topAlunos.map((a, i) => ({
      '#': i + 1, Aluno: a.nome, Sala: a.sala,
      ...(campos.presenca ? { 'Presença (%)': a.pct, Presentes: a.presentes, Total: a.total } : {}),
      ...(campos.faltas   ? { Faltas: a.faltas } : {}),
    }))
  }

  function buildProfRows(campos: ExportCampos) {
    return professores.map(p => ({
      Professor: p.nome, Turmas: p.turmas.join(', '), Aulas: p.aulas,
      ...(campos.presenca ? { 'Presença pessoal (%)': p.presMedia } : {}),
      ...(campos.biblias  ? { 'Bíblias (%)': p.biblias } : {}),
    }))
  }

  function buildAlunosTurmaRows(campos: ExportCampos) {
    return alunosTurmaOrdenados.map((a, i) => ({
      '#': i + 1, Aluno: a.nome,
      ...(campos.presenca ? { 'Presença (%)': a.pct, Presentes: a.presentes, Total: a.total } : {}),
      ...(campos.faltas   ? { Faltas: a.faltas } : {}),
      ...(campos.biblias  ? { Bíblias: a.biblias } : {}),
      ...(campos.revistas ? { Revistas: a.revistas } : {}),
    }))
  }

  function buildVisitantesRows(campos: ExportCampos) {
    return visitantesOrdenados.map((v, i) => ({
      '#': i + 1,
      Visitante: v.nome,
      Telefone: v.telefone,
      Visitas: v.visitas.length,
      Dias: v.visitas.map(x => x.data).join(', '),
      ...(campos.presenca ? { 'Presença (%)': v.pct, Presentes: v.presentes } : {}),
      ...(campos.biblias  ? { Bíblias: v.biblias } : {}),
      ...(campos.revistas ? { Revistas: v.revistas } : {}),
      Convertido: v.convertido ? 'Sim' : 'Não',
    }))
  }

  function buildFilename(ext: string) {
    const safe = labelRelatorio.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '-').toLowerCase()
    return `relatorio-ebd-${safe}.${ext}`
  }

  // ── Geração de exportação ──
  function gerarExport() {
    const sec = exportSecoes
    const cam = exportCampos

    if (exportFormato === 'pdf') {
      const sectionIds: [keyof ExportSecoes, string][] = [
        ['resumo', 'section-resumo'],
        ['grafico', 'section-grafico'],
        ['porSala', 'section-porSala'],
        ['alunosTurma', 'section-alunosTurma'],
        ['topAlunos', 'section-topAlunos'],
        ['atencao', 'section-atencao'],
        ['professores', 'section-professores'],
        ['visitantesRelatorio', 'section-visitantesRel'],
      ]
      const toHide = sectionIds
        .filter(([key]) => !sec[key])
        .map(([, id]) => document.getElementById(id))
        .filter(Boolean) as HTMLElement[]

      toHide.forEach(el => el.setAttribute('data-print-hidden', ''))
      setExportOpen(false)
      setTimeout(() => {
        window.print()
        setTimeout(() => toHide.forEach(el => el.removeAttribute('data-print-hidden')), 500)
      }, 150)
      return
    }

    if (exportFormato === 'excel') {
      const sheets: { nome: string; rows: Record<string, any>[] }[] = []
      if (sec.resumo)     sheets.push({ nome: 'Resumo',      rows: buildResumoRows(cam) })
      if (sec.porSala && dadosSala.length > 0)   sheets.push({ nome: 'Por Sala', rows: buildSalaRows(cam) })
      if (sec.alunosTurma && alunosTurmaOrdenados.length > 0) sheets.push({ nome: 'Alunos da Turma', rows: buildAlunosTurmaRows(cam) })
      if (sec.topAlunos && topAlunos.length > 0) sheets.push({ nome: 'Top Alunos', rows: buildAlunoRows(cam) })
      if (sec.professores && professores.length > 0) sheets.push({ nome: 'Professores', rows: buildProfRows(cam) })
      if (sec.visitantesRelatorio && visitantesOrdenados.length > 0) sheets.push({ nome: 'Visitantes', rows: buildVisitantesRows(cam) })
      if (sheets.length > 0) exportarExcel(sheets, buildFilename('xlsx'))
      setExportOpen(false)
      return
    }

    if (exportFormato === 'csv') {
      const blocos: Record<string, any>[] = []
      if (sec.resumo) {
        blocos.push({ '': '=== RESUMO ===' })
        blocos.push(...buildResumoRows(cam))
        blocos.push({})
      }
      if (sec.porSala && dadosSala.length > 0) {
        blocos.push({ '': '=== POR SALA ===' })
        blocos.push(...buildSalaRows(cam))
        blocos.push({})
      }
      if (sec.alunosTurma && alunosTurmaOrdenados.length > 0) {
        blocos.push({ '': '=== ALUNOS DA TURMA ===' })
        blocos.push(...buildAlunosTurmaRows(cam))
        blocos.push({})
      }
      if (sec.topAlunos && topAlunos.length > 0) {
        blocos.push({ '': '=== TOP ALUNOS ===' })
        blocos.push(...buildAlunoRows(cam))
        blocos.push({})
      }
      if (sec.professores && professores.length > 0) {
        blocos.push({ '': '=== PROFESSORES ===' })
        blocos.push(...buildProfRows(cam))
        blocos.push({})
      }
      if (sec.visitantesRelatorio && visitantesOrdenados.length > 0) {
        blocos.push({ '': '=== VISITANTES ===' })
        blocos.push(...buildVisitantesRows(cam))
      }
      if (blocos.length > 0) exportarCSV(blocos, buildFilename('csv'))
      setExportOpen(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          [data-no-print] { display: none !important; }
          [data-print-hidden] { display: none !important; }
          aside, nav { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-no-print>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground mt-1">Visualize e exporte estatísticas por período e turma</p>
          </div>
          <Button onClick={() => { setExportSecoes(SECOES_INICIAL); setExportCampos(CAMPOS_INICIAL); setExportOpen(true) }}>
            <Download className="h-4 w-4 mr-2" />Exportar Relatório
          </Button>
        </div>

        {/* Dialog de Exportação */}
        <ExportDialog
          open={exportOpen}
          onClose={setExportOpen}
          formato={exportFormato}
          setFormato={setExportFormato}
          secoes={exportSecoes}
          setSecoes={setExportSecoes}
          campos={exportCampos}
          setCampos={setExportCampos}
          onExportar={gerarExport}
          labelRelatorio={labelRelatorio}
          turmaFiltro={turmaFiltro}
        />

        {/* Filtros de Período */}
        <div className="rounded-xl border bg-card overflow-hidden">
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
          <div id="section-resumo" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-x divide-y md:divide-y-0">
            {[
              { label: 'Presença',   value: `${dados.pct}%`,                             sub: `${dados.presentes} presentes`, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,    color: 'text-green-600', hero: true },
              { label: 'Faltas',     value: dados.faltas,                                 sub: 'ausências',                    icon: <XCircle      className="h-4 w-4 text-red-500" />,      color: 'text-red-600' },
              { label: 'Visitantes', value: dados.visitantes,                             sub: 'novos',                        icon: <UserPlus     className="h-4 w-4 text-blue-500" />,     color: 'text-blue-600' },
              { label: 'Bíblias',    value: dados.biblias,                                sub: 'trouxeram',                    icon: <Book         className="h-4 w-4 text-purple-500" />,   color: 'text-purple-600' },
              { label: 'Revistas',   value: dados.revistas,                               sub: 'trouxeram',                    icon: <BookOpen     className="h-4 w-4 text-orange-500" />,   color: 'text-orange-600' },
              { label: 'Oferta',     value: `R$ ${dados.oferta.toLocaleString('pt-BR')}`, sub: 'arrecadado',                   icon: <DollarSign   className="h-4 w-4 text-emerald-500" />,  color: 'text-emerald-600' },
              { label: 'Domingos',   value: dados.domingos,                               sub: 'aulas realizadas',             icon: <Calendar     className="h-4 w-4 text-muted-foreground" />, color: '' },
            ].map((kpi: any, i) => (
              <div key={i} className={`flex flex-col items-center justify-center py-4 px-3 text-center ${kpi.hero ? 'col-span-2 sm:col-span-1 bg-green-500/5' : ''}`}>
                <div className="mb-1">{kpi.icon}</div>
                <span className={`${kpi.hero ? 'text-2xl sm:text-xl' : 'text-xl'} font-bold ${kpi.color}`}>{kpi.value}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{kpi.label}</span>
                <span className="text-[10px] text-muted-foreground">{kpi.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Evolução */}
        <div id="section-grafico">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução de Presença no Período</CardTitle>
              <CardDescription>{labelRelatorio}</CardDescription>
            </CardHeader>
            <CardContent>
              {grafico.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] sm:h-[280px] text-muted-foreground text-sm">Sem dados para o período selecionado</div>
              ) : (
                <div className="h-[200px] sm:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={grafico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gPres" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gPct" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                      <XAxis dataKey="periodo" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Area yAxisId="l" type="monotone" dataKey="presentes" name="Presentes" stroke="#6366f1" fill="url(#gPres)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2 }} animationDuration={800} />
                      <Area yAxisId="r" type="monotone" dataKey="pct" name="Presença %" stroke="#22c55e" fill="url(#gPct)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 2 }} animationDuration={800} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Presença por Sala */}
        <SecaoSalas dados={dadosSala} />

        {/* Alunos da Turma */}
        {turmaFiltro !== 'all' && alunosTurma.length > 0 && (
          <div id="section-alunosTurma">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Alunos — {labelTurma}</CardTitle>
                <CardDescription>{labelPeriodo}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resumo rápido */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold">{alunosTurma.length}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Matriculados</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold">{mediaPresencaTurma}%</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Média presença</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold text-green-600">{alunosTurma.reduce((s, a) => s + a.presentes, 0)}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Total presenças</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold text-red-600">{alunosTurma.reduce((s, a) => s + a.faltas, 0)}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Total faltas</p>
                  </div>
                </div>

                {/* Top 3 destaques */}
                {top3Turma.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Destaques</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {top3Turma.map((a, i) => (
                        <div key={a.id} className={cn('flex items-center gap-3 p-3 rounded-lg border', i === 0 ? 'bg-yellow-500/5 border-yellow-500/30' : i === 1 ? 'bg-slate-500/5 border-slate-400/30' : 'bg-orange-600/5 border-orange-600/30')}>
                          <span className="text-xl flex-shrink-0">{['🥇', '🥈', '🥉'][i]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{a.nome}</p>
                            <p className="text-[11px] text-muted-foreground">{a.presentes}/{a.total} aulas</p>
                          </div>
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0', a.pct === 100 ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary')}>{a.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sort chips */}
                <div className="flex items-center gap-2 flex-wrap" data-no-print>
                  <span className="text-xs text-muted-foreground">Ordenar:</span>
                  {([['pct', 'Presença'], ['nome', 'Nome'], ['faltas', 'Faltas']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setSortAlunosTurma(val)}
                      className={cn('px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                        sortAlunosTurma === val ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:bg-muted border-border')}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Mobile: cards */}
                <div className="sm:hidden space-y-2">
                  {alunosTurmaOrdenados.map((a) => (
                    <div key={a.id} className="rounded-xl border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{a.nome}</p>
                          {a.cargo && <p className="text-[11px] text-muted-foreground truncate">{a.cargo}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${a.pct}%` }} />
                          </div>
                          <span className="text-xs font-bold">{a.pct}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 divide-x border-t bg-muted/20">
                        <div className="flex flex-col items-center py-2"><span className="text-xs font-bold text-green-600">{a.presentes}</span><span className="text-[10px] text-muted-foreground">Pres.</span></div>
                        <div className="flex flex-col items-center py-2"><span className="text-xs font-bold text-red-600">{a.faltas}</span><span className="text-[10px] text-muted-foreground">Faltas</span></div>
                        <div className="flex flex-col items-center py-2"><span className="text-xs font-bold text-purple-600">{a.biblias}</span><span className="text-[10px] text-muted-foreground">Bíblias</span></div>
                        <div className="flex flex-col items-center py-2"><span className="text-xs font-bold text-orange-600">{a.revistas}</span><span className="text-[10px] text-muted-foreground">Revistas</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: tabela */}
                <div className="hidden sm:block rounded-lg border overflow-x-auto">
                  <table className="min-w-[480px] w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        <th className="text-left px-4 py-3 w-8 font-medium text-muted-foreground">#</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aluno</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Presença</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Faltas</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Bíblias</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Revistas</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunosTurmaOrdenados.map((a, i) => (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="px-4 py-3 text-center text-muted-foreground text-xs font-medium">{i + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-sm">{a.nome}</p>
                            {a.cargo && <p className="text-[11px] text-muted-foreground">{a.cargo}</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                                <div className="h-full rounded-full" style={{ width: `${a.pct}%` }} />
                              </div>
                              <span className="text-xs font-bold">{a.pct}%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{a.presentes}/{a.total}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('text-sm font-semibold', a.faltas === 0 ? 'text-green-600' : 'text-red-500')}>{a.faltas}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-purple-600 hidden md:table-cell">{a.biblias}</td>
                          <td className="px-4 py-3 text-center text-orange-600 hidden md:table-cell">{a.revistas}</td>
                          <td className="px-4 py-3">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', a.total > 0 ? (a.pct >= 75 ? 'bg-green-500/10 text-green-700 border-green-500/30' : a.pct >= 50 ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30') : 'bg-muted text-muted-foreground border-muted')}>
                              {a.total > 0 ? (a.pct >= 75 ? 'Regular' : a.pct >= 50 ? 'Atenção' : 'Crítico') : 'Sem dados'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alunos: Destaques + Atenção */}
        <SecaoAlunos topAlunos={topAlunos} alunosAtencao={alunosAtencao} />

        {/* Desempenho dos Professores */}
        <SecaoProfessores professores={professores} />

        {/* Visitantes */}
        <SecaoVisitantes
          visitantes={visitantesRel}
          visitantesOrdenados={visitantesOrdenados}
          sort={sortVisitantes}
          onSort={setSortVisitantes}
          labelRelatorio={labelRelatorio}
        />
      </div>
    </>
  )
}

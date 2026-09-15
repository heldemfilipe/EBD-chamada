"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PeriodSelector } from '@/components/ui/period-selector'
import { GraficoEvolucao } from '@/components/ui/grafico-evolucao'
import {
  Download, Calendar, CheckCircle2, XCircle, BookOpen, Book, DollarSign, UserPlus, Filter, Users, ArrowUp,
} from 'lucide-react'
import {
  buscarTurmasRelatorio, buscarChamadasPorAno, buscarRankingAlunos, buscarProfessoresRelatorio,
  buscarVisitantesPorChamadas, buscarAlunosTurmaDetalhado, type ChamadaAgregada,
} from '@/actions/relatorios'
import { TRIMESTRES } from '@/lib/constants'
import { calcularPct, resolverCor, corPresenca } from '@/lib/presence'
import {
  filtrarPorPeriodo, labelPeriodo as montarLabelPeriodo, datasDistintas, serieEvolucao,
  criarRotuloNome, rankingComEmpates, type Granularidade,
} from '@/lib/relatorio-utils'
import { format, parseISO, lastDayOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { exportarCSV, exportarExcel } from '@/lib/export'
import { ExportDialog } from './_ExportDialog'
import { SecaoSalas, type DadosSala } from './_SecaoSalas'
import { SecaoAlunos, MIN_AULAS_ATENCAO, type AlunoFrequente } from './_SecaoAlunos'
import { SecaoProfessores, type ProfessorDesempenho } from './_SecaoProfessores'
import { SecaoVisitantes, type VisitanteRelatorio } from './_SecaoVisitantes'
import { SecaoAlunosTurma, type AlunoTurmaStats } from './_SecaoAlunosTurma'

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

const SECOES_INICIAL: ExportSecoes = {
  resumo: true, grafico: true, porSala: true,
  alunosTurma: true, topAlunos: true, atencao: true, professores: true, visitantesRelatorio: true,
}
const CAMPOS_INICIAL: ExportCampos = { presenca: true, faltas: true, visitantes: true, biblias: true, revistas: true, oferta: true }

const moeda = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pad = (n: number) => String(n).padStart(2, '0')

/** Intervalo [início, fim] (YYYY-MM-DD) do período selecionado. */
function limitesPeriodo(g: Granularidade, ano: number, mes: number, trim: number, dataDia: string | null): [string, string] {
  if (g === 'dia' && dataDia) return [dataDia, dataDia]
  if (g === 'dia' || g === 'mes') return [`${ano}-${pad(mes + 1)}-01`, format(lastDayOfMonth(new Date(ano, mes, 1)), 'yyyy-MM-dd')]
  if (g === 'trimestre') {
    const [ini, fim] = [TRIMESTRES[trim].meses[0], TRIMESTRES[trim].meses[2]]
    return [`${ano}-${pad(ini + 1)}-01`, format(lastDayOfMonth(new Date(ano, fim, 1)), 'yyyy-MM-dd')]
  }
  return [`${ano}-01-01`, `${ano}-12-31`]
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [granularidade, setGranularidade] = useState<Granularidade>('trimestre')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth())
  const [trim, setTrim] = useState(Math.floor(new Date().getMonth() / 3))
  const [dataDia, setDataDia] = useState<string | null>(null)
  const [turmaFiltro, setTurmaFiltro] = useState<string>('all')

  const [turmas, setTurmas] = useState<Awaited<ReturnType<typeof buscarTurmasRelatorio>>>([])
  const [chamadasAno, setChamadasAno] = useState<ChamadaAgregada[]>([])
  const [profData, setProfData] = useState<Awaited<ReturnType<typeof buscarProfessoresRelatorio>> | null>(null)
  const [ranking, setRanking] = useState<Awaited<ReturnType<typeof buscarRankingAlunos>>>([])
  const [histVisitantes, setHistVisitantes] = useState<Awaited<ReturnType<typeof buscarVisitantesPorChamadas>>>([])
  const [dadosTurma, setDadosTurma] = useState<Awaited<ReturnType<typeof buscarAlunosTurmaDetalhado>> | null>(null)
  const [sortVisitantes, setSortVisitantes] = useState<'visitas' | 'nome' | 'pct'>('visitas')
  const [carregando, setCarregando] = useState(true)

  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormato, setExportFormato] = useState<FormatoExport>('pdf')
  const [exportSecoes, setExportSecoes] = useState<ExportSecoes>(SECOES_INICIAL)
  const [exportCampos, setExportCampos] = useState<ExportCampos>(CAMPOS_INICIAL)

  // ── Cargas ──────────────────────────────────────────────────────────────────
  useEffect(() => { buscarTurmasRelatorio().then(setTurmas).catch(() => {}) }, [])

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    Promise.all([buscarChamadasPorAno(ano), buscarProfessoresRelatorio(ano)])
      .then(([chamadas, profs]) => {
        if (cancelado) return
        setChamadasAno(chamadas)
        setProfData(profs)
      })
      .catch(() => {})
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [ano])

  // ── Período ─────────────────────────────────────────────────────────────────
  const chamadasTurma = useMemo(
    () => turmaFiltro === 'all' ? chamadasAno : chamadasAno.filter(c => c.turma_id === turmaFiltro),
    [chamadasAno, turmaFiltro]
  )
  const domingosMes = useMemo(
    () => datasDistintas(filtrarPorPeriodo(chamadasTurma, { granularidade: 'mes', mes, trim })),
    [chamadasTurma, mes, trim]
  )
  // Em "Dia", mantém um domingo válido do mês (padrão: o mais recente)
  useEffect(() => {
    if (granularidade !== 'dia') return
    if (!dataDia || !domingosMes.includes(dataDia)) setDataDia(domingosMes[domingosMes.length - 1] ?? null)
  }, [granularidade, domingosMes, dataDia])

  const periodoOpts = { granularidade, mes, trim, dataDia }
  const chamadasPeriodo = useMemo(
    () => filtrarPorPeriodo(chamadasTurma, periodoOpts),
    [chamadasTurma, granularidade, mes, trim, dataDia] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const chamadaIds = useMemo(() => chamadasPeriodo.map(c => c.id), [chamadasPeriodo])
  const chaveIds = chamadaIds.join(',')
  const [inicioPeriodo, fimPeriodo] = limitesPeriodo(granularidade, ano, mes, trim, dataDia)

  useEffect(() => {
    let cancelado = false
    if (chamadaIds.length === 0) { setRanking([]); setHistVisitantes([]); return }
    Promise.all([
      buscarRankingAlunos(chamadaIds, turmaFiltro !== 'all' ? turmaFiltro : undefined),
      buscarVisitantesPorChamadas(chamadaIds),
    ]).then(([r, v]) => {
      if (cancelado) return
      setRanking(r)
      setHistVisitantes(v)
    }).catch(() => {})
    return () => { cancelado = true }
  }, [chaveIds, turmaFiltro]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelado = false
    if (turmaFiltro === 'all') { setDadosTurma(null); return }
    buscarAlunosTurmaDetalhado(turmaFiltro, chamadaIds)
      .then(d => { if (!cancelado) setDadosTurma(d) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [chaveIds, turmaFiltro]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Indicadores ─────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let presentes = 0, faltas = 0, biblias = 0, revistas = 0, visitas = 0, oferta = 0
    for (const c of chamadasPeriodo) {
      presentes += c.presentes; faltas += c.ausentes
      biblias += c.biblias; revistas += c.revistas
      visitas += c.visitantes; oferta += c.oferta
    }
    const domingos = datasDistintas(chamadasPeriodo).length
    const total = presentes + faltas
    return {
      presentes, faltas, biblias, revistas, visitas, oferta, domingos, total,
      pct: total ? calcularPct(presentes, total) : null,
      mediaPorDomingo: domingos ? Math.round(presentes / domingos) : 0,
    }
  }, [chamadasPeriodo])

  // Gráfico: dia/mês = domingos do mês · trimestre = domingos do trimestre · ano = meses
  const grafico = useMemo(() => {
    const base = granularidade === 'dia' ? filtrarPorPeriodo(chamadasTurma, { granularidade: 'mes', mes, trim }) : chamadasPeriodo
    return serieEvolucao(base.map(c => ({ data: c.data, presentes: c.presentes, total: c.presentes + c.ausentes })), granularidade === 'dia' ? 'mes' : granularidade)
  }, [chamadasTurma, chamadasPeriodo, granularidade, mes, trim])

  // Presença por sala
  const dadosSala: DadosSala[] = useMemo(() => {
    const lista = turmaFiltro === 'all' ? turmas : turmas.filter(t => t.id === turmaFiltro)
    return lista.map((t, idx) => {
      const cs = chamadasPeriodo.filter(c => c.turma_id === t.id)
      const s = { presentes: 0, faltas: 0, biblias: 0, revistas: 0, visitantes: 0, oferta: 0 }
      for (const c of cs) {
        s.presentes += c.presentes; s.faltas += c.ausentes; s.biblias += c.biblias
        s.revistas += c.revistas; s.visitantes += c.visitantes; s.oferta += c.oferta
      }
      const total = s.presentes + s.faltas
      return {
        sala: t.nome, cor: resolverCor(t.cor, idx), matriculados: t.totalAlunos,
        presencaMedia: total ? calcularPct(s.presentes, total) : null,
        domingos: datasDistintas(cs).length, ...s,
      }
    })
  }, [turmas, chamadasPeriodo, turmaFiltro])

  // Ranking de alunos
  const { topAlunos, alunosAtencao } = useMemo(() => {
    const rotulo = criarRotuloNome(ranking.map(r => ({ id: r.aluno_id, nome: r.nome, turma: r.turma_nome })))
    const lista: AlunoFrequente[] = ranking.map(r => ({
      id: r.aluno_id, nome: rotulo(r.aluno_id, r.nome), sala: r.turma_nome,
      presentes: r.presentes, total: r.total, pct: calcularPct(r.presentes, r.total), faltas: r.total - r.presentes,
    }))
    return {
      topAlunos: rankingComEmpates(lista).slice(0, 10),
      alunosAtencao: lista
        .filter(a => a.total >= MIN_AULAS_ATENCAO && a.pct < 50)
        .sort((a, b) => a.pct - b.pct || b.faltas - a.faltas),
    }
  }, [ranking])

  // Professores
  const professores: ProfessorDesempenho[] = useMemo(() => {
    if (!profData) return []
    const nomeTurma = new Map(turmas.map(t => [t.id, t.nome]))
    const alunoDoProf = new Map(profData.profAlunos.map(a => [a.professorId, a.alunoId]))
    const hoje = format(new Date(), 'yyyy-MM-dd')
    // "Aulas dadas": só escalas de domingos que já aconteceram
    const escalasPeriodo = filtrarPorPeriodo(profData.escalas, periodoOpts)
      .filter(e => e.data.slice(0, 10) <= hoje && (turmaFiltro === 'all' || e.turma_id === turmaFiltro))
    const registrosPeriodo = filtrarPorPeriodo(profData.registros, periodoOpts)

    return profData.professores
      .map(p => {
        const minhasEscalas = escalasPeriodo.filter(e => e.professor_id === p.id)
        const alunoId = alunoDoProf.get(p.id)
        const regs = alunoId ? registrosPeriodo.filter(r => r.aluno_id === alunoId) : []
        const presentes = regs.filter(r => r.presente).length
        const bibs = regs.filter(r => r.presente && r.trouxe_biblia).length
        return {
          id: p.id, nome: p.nome,
          turmas: p.turmas.map(t => t.turma_nome),
          vinculadoTurmaFiltro: p.turmas.some(t => t.turma_id === turmaFiltro),
          aulas: minhasEscalas.length,
          turmasEscaladas: Array.from(new Set(minhasEscalas.map(e => nomeTurma.get(e.turma_id) ?? '—'))),
          presentes, registros: regs.length,
          presenca: regs.length ? calcularPct(presentes, regs.length) : null,
          biblias: presentes ? calcularPct(bibs, presentes) : null,
        }
      })
      .filter(p => turmaFiltro === 'all' || p.vinculadoTurmaFiltro || p.aulas > 0)
      .sort((a, b) => b.aulas - a.aulas || (b.presenca ?? -1) - (a.presenca ?? -1) || a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [profData, turmas, turmaFiltro, granularidade, mes, trim, dataDia]) // eslint-disable-line react-hooks/exhaustive-deps

  // Visitantes
  const visitantes: VisitanteRelatorio[] = useMemo(() => {
    const mapa = new Map<string, VisitanteRelatorio>()
    for (const h of histVisitantes) {
      const v = mapa.get(h.visitante_id) ?? {
        id: h.visitante_id, nome: h.nome, telefone: h.telefone, convertido: h.convertido_em_aluno,
        primeiraVez: !!h.primeira_visita && h.primeira_visita >= inicioPeriodo && h.primeira_visita <= fimPeriodo,
        visitas: [], presentes: 0, pct: 0, biblias: 0, revistas: 0,
      }
      v.visitas.push({ data: format(parseISO(h.data), 'dd/MM', { locale: ptBR }), presente: h.presente, trouxe_biblia: h.trouxe_biblia, trouxe_revista: h.trouxe_revista })
      if (h.presente) {
        v.presentes++
        if (h.trouxe_biblia) v.biblias++
        if (h.trouxe_revista) v.revistas++
      }
      mapa.set(h.visitante_id, v)
    }
    return Array.from(mapa.values()).map(v => ({ ...v, pct: calcularPct(v.presentes, v.visitas.length) }))
  }, [histVisitantes, inicioPeriodo, fimPeriodo])

  const visitantesOrdenados = useMemo(() => {
    const lista = [...visitantes]
    if (sortVisitantes === 'nome') return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    if (sortVisitantes === 'pct') return lista.sort((a, b) => b.pct - a.pct)
    return lista.sort((a, b) => b.visitas.length - a.visitas.length)
  }, [visitantes, sortVisitantes])

  // Alunos da turma (tabela + mapa)
  const alunosTurma: AlunoTurmaStats[] = useMemo(() => {
    if (!dadosTurma) return []
    const rotulo = criarRotuloNome(dadosTurma.alunos.map(a => ({ id: a.id, nome: a.nome })))
    return dadosTurma.alunos.map(a => {
      const regs = dadosTurma.registros.filter(r => r.aluno_id === a.id)
      const presentes = regs.filter(r => r.presente).length
      return {
        id: a.id, nome: rotulo(a.id, a.nome), cargo: a.cargo,
        presentes, faltas: regs.length - presentes, total: regs.length,
        pct: regs.length ? calcularPct(presentes, regs.length) : null,
        biblias: regs.filter(r => r.presente && r.trouxe_biblia).length,
        revistas: regs.filter(r => r.presente && r.trouxe_revista).length,
        celulas: Object.fromEntries(regs.map(r => [r.chamada_id, r.presente])),
      }
    })
  }, [dadosTurma])

  // ── Rótulos ─────────────────────────────────────────────────────────────────
  const labelTurma = turmaFiltro === 'all' ? 'Todas as turmas' : (turmas.find(t => t.id === turmaFiltro)?.nome ?? '')
  const labelPeriodo = montarLabelPeriodo({ granularidade, ano, mes, trim, dataDia })
  const labelRelatorio = `${labelPeriodo}${turmaFiltro !== 'all' ? ` — ${labelTurma}` : ''}`
  const unicos = visitantes.length
  const primeiraVez = visitantes.filter(v => v.primeiraVez).length

  // ── Exportação ──────────────────────────────────────────────────────────────
  function buildResumoRows(c: ExportCampos) {
    return [{
      Período: labelRelatorio,
      ...(c.presenca   ? { 'Presença (%)': kpis.pct ?? '', Presentes: kpis.presentes, 'Média por domingo': kpis.mediaPorDomingo } : {}),
      ...(c.faltas     ? { Faltas: kpis.faltas } : {}),
      ...(c.visitantes ? { Visitas: kpis.visitas, 'Visitantes únicos': unicos, '1ª visita': primeiraVez } : {}),
      ...(c.biblias    ? { Bíblias: kpis.biblias } : {}),
      ...(c.revistas   ? { Revistas: kpis.revistas } : {}),
      ...(c.oferta     ? { 'Oferta (R$)': moeda(kpis.oferta) } : {}),
      Domingos: kpis.domingos,
    }]
  }
  function buildSalaRows(c: ExportCampos) {
    return dadosSala.map(s => ({
      Sala: s.sala, Matriculados: s.matriculados, Domingos: s.domingos,
      ...(c.presenca   ? { 'Presença (%)': s.presencaMedia ?? 'sem dados', Presentes: s.presentes } : {}),
      ...(c.faltas     ? { Faltas: s.faltas } : {}),
      ...(c.visitantes ? { Visitas: s.visitantes } : {}),
      ...(c.biblias    ? { Bíblias: s.biblias } : {}),
      ...(c.revistas   ? { Revistas: s.revistas } : {}),
      ...(c.oferta     ? { 'Oferta (R$)': moeda(s.oferta) } : {}),
    }))
  }
  function buildAlunoRows(c: ExportCampos) {
    return topAlunos.map(a => ({
      Posição: `${a.posicao}º`, Aluno: a.nome, Sala: a.sala,
      ...(c.presenca ? { 'Presença (%)': a.pct, Presentes: a.presentes, Aulas: a.total } : {}),
      ...(c.faltas ? { Faltas: a.faltas } : {}),
    }))
  }
  function buildAtencaoRows(c: ExportCampos) {
    return alunosAtencao.map(a => ({
      Aluno: a.nome, Sala: a.sala,
      ...(c.presenca ? { 'Presença (%)': a.pct, Presentes: a.presentes, Aulas: a.total } : {}),
      ...(c.faltas ? { Faltas: a.faltas } : {}),
    }))
  }
  function buildProfRows(c: ExportCampos) {
    return professores.map(p => ({
      Professor: p.nome, 'Turmas vinculadas': p.turmas.join(', '), 'Aulas dadas': p.aulas, 'Deu aula em': p.turmasEscaladas.join(', '),
      ...(c.presenca ? { 'Presença como aluno (%)': p.presenca ?? '—' } : {}),
      ...(c.biblias ? { 'Bíblias (%)': p.biblias ?? '—' } : {}),
    }))
  }
  function buildAlunosTurmaRows(c: ExportCampos) {
    return alunosTurma.map((a, i) => ({
      '#': i + 1, Aluno: a.nome,
      ...(c.presenca ? { 'Presença (%)': a.pct ?? '—', Presentes: a.presentes, Aulas: a.total } : {}),
      ...(c.faltas ? { Faltas: a.faltas } : {}),
      ...(c.biblias ? { Bíblias: a.biblias } : {}),
      ...(c.revistas ? { Revistas: a.revistas } : {}),
    }))
  }
  function buildVisitantesRows(c: ExportCampos) {
    return visitantesOrdenados.map((v, i) => ({
      '#': i + 1, Visitante: v.nome, Telefone: v.telefone, Visitas: v.visitas.length,
      Dias: v.visitas.map(x => x.data).join(', '), '1ª visita no período': v.primeiraVez ? 'Sim' : 'Não',
      ...(c.presenca ? { 'Presença (%)': v.pct, Presentes: v.presentes } : {}),
      ...(c.biblias ? { Bíblias: v.biblias } : {}),
      ...(c.revistas ? { Revistas: v.revistas } : {}),
      Convertido: v.convertido ? 'Sim' : 'Não',
    }))
  }
  function buildFilename(ext: string) {
    const safe = labelRelatorio.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '-').toLowerCase()
    return `relatorio-ebd-${safe}.${ext}`
  }

  function gerarExport() {
    const sec = exportSecoes
    const cam = exportCampos
    if (exportFormato === 'pdf') {
      const ids: [keyof ExportSecoes, string][] = [
        ['resumo', 'section-resumo'], ['grafico', 'section-grafico'], ['porSala', 'section-porSala'],
        ['alunosTurma', 'section-alunosTurma'], ['topAlunos', 'section-topAlunos'], ['atencao', 'section-atencao'],
        ['professores', 'section-professores'], ['visitantesRelatorio', 'section-visitantesRel'],
      ]
      const esconder = ids.filter(([k]) => !sec[k]).map(([, id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
      esconder.forEach(el => el.setAttribute('data-print-hidden', ''))
      setExportOpen(false)
      setTimeout(() => {
        window.print()
        setTimeout(() => esconder.forEach(el => el.removeAttribute('data-print-hidden')), 500)
      }, 150)
      return
    }
    const blocos: { nome: string; rows: Record<string, any>[] }[] = []
    if (sec.resumo) blocos.push({ nome: 'Resumo', rows: buildResumoRows(cam) })
    if (sec.porSala && dadosSala.length) blocos.push({ nome: 'Por Sala', rows: buildSalaRows(cam) })
    if (sec.alunosTurma && alunosTurma.length) blocos.push({ nome: 'Alunos da Turma', rows: buildAlunosTurmaRows(cam) })
    if (sec.topAlunos && topAlunos.length) blocos.push({ nome: 'Top Alunos', rows: buildAlunoRows(cam) })
    if (sec.atencao && alunosAtencao.length) blocos.push({ nome: 'Presença Crítica', rows: buildAtencaoRows(cam) })
    if (sec.professores && professores.length) blocos.push({ nome: 'Professores', rows: buildProfRows(cam) })
    if (sec.visitantesRelatorio && visitantesOrdenados.length) blocos.push({ nome: 'Visitantes', rows: buildVisitantesRows(cam) })

    if (exportFormato === 'excel') {
      if (blocos.length) exportarExcel(blocos, buildFilename('xlsx'))
    } else {
      const linhas: Record<string, any>[] = []
      for (const b of blocos) {
        linhas.push({ '': `=== ${b.nome.toUpperCase()} ===` }, ...b.rows, {})
      }
      if (linhas.length) exportarCSV(linhas, buildFilename('csv'))
    }
    setExportOpen(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const kpiItens = [
    { label: 'Presença', value: kpis.pct !== null ? `${kpis.pct}%` : '—', sub: `${kpis.presentes} de ${kpis.total} registros`, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, style: kpis.pct !== null ? { color: corPresenca(kpis.pct) } : undefined, hero: true },
    { label: 'Presentes', value: kpis.presentes, sub: `média ${kpis.mediaPorDomingo} por domingo`, icon: <Users className="h-4 w-4 text-indigo-500" />, color: 'text-indigo-600' },
    { label: 'Faltas', value: kpis.faltas, sub: 'ausências', icon: <XCircle className="h-4 w-4 text-red-500" />, color: 'text-red-600' },
    { label: 'Domingos', value: kpis.domingos, sub: 'com chamada', icon: <Calendar className="h-4 w-4 text-muted-foreground" />, color: '' },
    { label: 'Visitas', value: kpis.visitas, sub: `${unicos} visitante${unicos !== 1 ? 's' : ''} · ${primeiraVez} 1ª vez`, icon: <UserPlus className="h-4 w-4 text-blue-500" />, color: 'text-blue-600' },
    { label: 'Bíblias', value: kpis.biblias, sub: 'de alunos presentes', icon: <Book className="h-4 w-4 text-purple-500" />, color: 'text-purple-600' },
    { label: 'Revistas', value: kpis.revistas, sub: 'de alunos presentes', icon: <BookOpen className="h-4 w-4 text-orange-500" />, color: 'text-orange-600' },
    { label: 'Oferta', value: `R$ ${moeda(kpis.oferta)}`, sub: 'arrecadado', icon: <DollarSign className="h-4 w-4 text-emerald-500" />, color: 'text-emerald-600' },
  ]

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
            <Download className="h-4 w-4 mr-2" />Exportar relatório
          </Button>
        </div>

        <ExportDialog
          open={exportOpen} onClose={setExportOpen}
          formato={exportFormato} setFormato={setExportFormato}
          secoes={exportSecoes} setSecoes={setExportSecoes}
          campos={exportCampos} setCampos={setExportCampos}
          onExportar={gerarExport} labelRelatorio={labelRelatorio} turmaFiltro={turmaFiltro}
        />

        {/* Filtros */}
        <div data-no-print>
          <PeriodSelector
            titulo="Período do relatório"
            label={labelRelatorio}
            granularidade={granularidade} ano={ano} mes={mes} trimestre={trim}
            onGranularidade={setGranularidade} onAno={setAno} onMes={setMes} onTrimestre={setTrim}
            permitirDia domingos={domingosMes} dataDia={dataDia} onDataDia={setDataDia}
            filtros={
              <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                <SelectTrigger className="h-8 text-sm w-auto min-w-[200px] max-w-[280px]">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground flex-shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            }
          />
        </div>

        {/* Barra fixa com o resumo do filtro (desktop) */}
        <div className="hidden lg:flex sticky top-0 z-20 -mx-8 px-8 py-2 bg-background/90 backdrop-blur border-b items-center justify-between gap-4" data-no-print>
          <div className="flex items-center gap-3 min-w-0 text-sm">
            <span className="font-semibold truncate">{labelRelatorio}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {kpis.pct !== null ? `${kpis.pct}% de presença` : 'sem dados'} · {kpis.domingos} domingo{kpis.domingos !== 1 ? 's' : ''}
            </span>
            {carregando && <span className="text-xs text-muted-foreground">carregando…</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp className="h-3.5 w-3.5 mr-1" />Alterar filtros
          </Button>
        </div>

        {/* Indicadores */}
        <div id="section-resumo" className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 divide-x divide-y xl:divide-y-0">
            {kpiItens.map((k: any) => (
              <div key={k.label} className={cn('flex flex-col items-center justify-center py-4 px-3 text-center', k.hero && 'bg-green-500/5')}>
                <div className="mb-1">{k.icon}</div>
                <span className={cn('text-xl font-bold', k.color)} style={k.style}>{k.value}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{k.label}</span>
                <span className="text-[10px] text-muted-foreground">{k.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Evolução */}
        <div id="section-grafico">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução de presença</CardTitle>
              <CardDescription>
                {labelRelatorio} · barras: alunos presentes · linha: % de presença {granularidade === 'ano' ? 'por mês' : 'por domingo'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GraficoEvolucao dados={grafico} />
            </CardContent>
          </Card>
        </div>

        <SecaoSalas dados={dadosSala} mediaGeral={kpis.pct} />

        {turmaFiltro !== 'all' && alunosTurma.length > 0 && dadosTurma && (
          <SecaoAlunosTurma turmaNome={labelTurma} labelPeriodo={labelPeriodo} alunos={alunosTurma} chamadas={dadosTurma.chamadas} />
        )}

        <SecaoAlunos topAlunos={topAlunos} alunosAtencao={alunosAtencao} />

        <SecaoProfessores professores={professores} />

        <SecaoVisitantes
          visitantes={visitantes}
          visitantesOrdenados={visitantesOrdenados}
          sort={sortVisitantes}
          onSort={setSortVisitantes}
          labelRelatorio={labelRelatorio}
        />
      </div>
    </>
  )
}

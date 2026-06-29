"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Calendar, Plus, Edit, Trash2, GraduationCap, BookOpen, LayoutGrid, Table2,
  ChevronDown, ChevronUp, ListFilter, Users, Sparkles, Link2, Save,
  Settings2, Unlink, SlidersHorizontal,
} from 'lucide-react'
import { ConfigSugestaoDialog, ConfigSugestao, CONFIG_PADRAO, carregarConfig } from './_ConfigSugestaoDialog'
import { buscarDadosEscala as fetchEscala, salvarEscala as salvarEscalaAction, excluirEscala as excluirEscalaAction } from '@/actions/escala'
import { ANOS_DISPONIVEIS, getTemaRevista, getLicaoTema } from '@/lib/constants'
import { toast } from '@/lib/toast'
import { turmaCorRgba } from '@/lib/presence'
import { NovaEscalaDialog } from './_NovaEscalaDialog'
import { SugestaoDialog } from './_SugestaoDialog'

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface Escala {
  id: string
  data: string
  turmaId: string
  professorId: string | null
  trimestre: number
  observacao: string
  tituloAula: string
}
interface Professor { id: string; nome: string }
interface Turma { id: string; nome: string; cor: string; sala?: string | null }

// ─── Ordenação canônica das turmas ─────────────────────────────────────────────
function ordemTurma(sala: string | null | undefined): number {
  if (!sala) return 99
  const m = sala.match(/\d+/)
  return m ? parseInt(m[0]) : 99
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getDomingosTrimestre(trimestre: number, ano: number) {
  const [mesInicio, mesFim] = [[0, 2], [3, 5], [6, 8], [9, 11]][trimestre - 1]
  const fim = new Date(ano, mesFim + 1, 0)
  const cursor = new Date(ano, mesInicio, 1)
  while (cursor.getDay() !== 0) cursor.setDate(cursor.getDate() + 1)
  const domingos: { aula: number; data: string; label: string }[] = []
  let aula = 1
  while (cursor <= fim) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    domingos.push({
      aula,
      data: iso,
      label: `Aula ${aula} — ${cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
    })
    cursor.setDate(cursor.getDate() + 7)
    aula++
  }
  return domingos
}

function getAulaInfo(data: string) {
  const d = new Date(data + 'T12:00:00')
  const ano = d.getFullYear()
  const trim = Math.floor(d.getMonth() / 3) + 1
  const found = getDomingosTrimestre(trim, ano).find(dom => dom.data === data)
  return found ? { ano, trimestre: trim, aula: found.aula } : null
}

function is2ndSunday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDate() >= 8 && d.getDate() <= 14
}

function fmtDataCurta(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtDataLonga(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

const TRIMESTRES_LABEL = [
  '1º Trimestre (Jan–Mar)',
  '2º Trimestre (Abr–Jun)',
  '3º Trimestre (Jul–Set)',
  '4º Trimestre (Out–Dez)',
]
const TRIMESTRES_SHORT = ['1º Trim', '2º Trim', '3º Trim', '4º Trim']

// ─── Gerador de escala sugerida ────────────────────────────────────────────────
function gerarEscalaSugerida(
  profTurmasMap: Record<string, string[]>,
  professoresData: Professor[],
  turmasData: Turma[],
  ano: number,
  trimestre: number,
  cfg: ConfigSugestao = CONFIG_PADRAO,
): Array<{ data: string; turmaId: string; professorId: string }> {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const pNome = (id: string) =>
    norm(professoresData.find(p => p.id === id)?.nome ?? '')
  const matchesAny = (n: string, list: string[]) => list.some(p => n.includes(p))

  const isFilhas  = (id: string) => norm(turmasData.find(t => t.id === id)?.nome ?? '').includes('filha')
  const isDynamo  = (id: string) => {
    const n = norm(turmasData.find(t => t.id === id)?.nome ?? '')
    return n.includes('dynamo') && !n.includes('pre')
  }

  const paridadeTrim = cfg.paridadePorTrim[String(trimestre)] ?? 'par'

  const domingos = getDomingosTrimestre(trimestre, ano)
  const resultado: Array<{ data: string; turmaId: string; professorId: string }> = []

  const aulasPorProf = new Map<string, Set<number>>()
  const countPorTurma = new Map<string, Map<string, number>>()
  let leandroDynamo = 0

  const turmasGen = [...turmasData]
    .sort((a, b) => ordemTurma(a.sala) - ordemTurma(b.sala))
    .filter(t => !isFilhas(t.id))

  for (const { aula, data } of domingos) {
    const isEven  = aula % 2 === 0
    const is2nd   = is2ndSunday(data)
    const isFirst = aula === 1
    const aulaProfs = new Map<string, string>()

    for (const turma of turmasGen) {
      const pool = profTurmasMap[turma.id] ?? []

      const getEligible = (relaxConseq: boolean) =>
        pool.filter(pid => {
          const n = pNome(pid)
          // Paridade configurável por trimestre
          if (matchesAny(n, cfg.profParidade)) {
            if (paridadeTrim === 'par'   && !isEven) return false
            if (paridadeTrim === 'impar' && isEven)  return false
          }
          // Sem 2º domingo do mês
          if (is2nd && matchesAny(n, cfg.semSegundoDomingo)) return false
          // Sem 1ª aula do trimestre
          if (isFirst && matchesAny(n, cfg.semPrimeiraAula)) return false
          // Leandro: máx 1 aula no Dynamo
          if (isDynamo(turma.id) && n.includes('leandro') && leandroDynamo >= 1) return false
          // Não pode ensinar duas turmas no mesmo domingo
          if (aulaProfs.has(pid)) return false
          // Sem domingos seguidos
          if (!relaxConseq && aulasPorProf.get(pid)?.has(aula - 1)) return false
          // Restrições de par fixas
          const jáEscalados = Array.from(aulaProfs.keys())
          if (n.includes('adriana')  && jáEscalados.some(id => pNome(id).includes('eder')))      return false
          if (n.includes('eder')     && jáEscalados.some(id => pNome(id).includes('adriana')))   return false
          if (n.includes('fabio')    && jáEscalados.some(id => pNome(id).includes('gabriela')))  return false
          if (n.includes('gabriela') && jáEscalados.some(id => pNome(id).includes('fabio')))     return false
          if (n.includes('gabriela') && jáEscalados.some(id => pNome(id).includes('samantha')))  return false
          if (n.includes('samantha') && jáEscalados.some(id => pNome(id).includes('gabriela')))  return false
          return true
        })

      let elig = getEligible(false)
      if (elig.length === 0) elig = getEligible(true)
      if (elig.length === 0) continue

      const tc = countPorTurma.get(turma.id) ?? new Map<string, number>()
      elig.sort((a, b) => (tc.get(a) ?? 0) - (tc.get(b) ?? 0))

      const picked = elig[0]
      resultado.push({ data, turmaId: turma.id, professorId: picked })

      if (!aulasPorProf.has(picked)) aulasPorProf.set(picked, new Set())
      aulasPorProf.get(picked)!.add(aula)
      aulaProfs.set(picked, turma.id)
      tc.set(picked, (tc.get(picked) ?? 0) + 1)
      countPorTurma.set(turma.id, tc)
      if (isDynamo(turma.id) && pNome(picked).includes('leandro')) leandroDynamo++
    }
  }

  return resultado
}

const FORM_VAZIO = {
  ano:         String(new Date().getFullYear()),
  trimestre:   String(Math.floor(new Date().getMonth() / 3) + 1),
  aulaIdx:     '1',
  turmaId:     '',
  professorId: '',
  observacao:  '',
  tituloAula:  '',
}

// ─── Componente ────────────────────────────────────────────────────────────────
export default function EscalaPage() {
  const [escalasData, setEscalasData]         = useState<Escala[]>([])
  const [professoresData, setProfessoresData]  = useState<Professor[]>([])
  const [turmasData, setTurmasData]            = useState<Turma[]>([])
  const [carregando, setCarregando]            = useState(true)

  // Filtros
  const [filtroAno,   setFiltroAno]   = useState(String(new Date().getFullYear()))
  const [filtroTrim,  setFiltroTrim]  = useState(String(Math.floor(new Date().getMonth() / 3) + 1))
  const [filtroProf,  setFiltroProf]  = useState('todos')
  const [filtroTurma, setFiltroTurma] = useState('todas')
  const [viewMode,    setViewMode]    = useState<'tabela' | 'cards'>('cards')
  const [selectedRow, setSelectedRow] = useState<string | null>(null)

  // Dialog
  const [dialogOpen,       setDialogOpen]       = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode,         setEditMode]         = useState(false)
  const [selectedEscala,   setSelectedEscala]   = useState<Escala | null>(null)
  const [formData,         setFormData]         = useState(FORM_VAZIO)
  const [isSaving,         setIsSaving]         = useState(false)
  const [isDeleting,       setIsDeleting]       = useState(false)

  // Accordion cards
  const [expandedDatas, setExpandedDatas] = useState<Set<string>>(new Set())

  // Salas unidas: turmaId → unidaComTurmaId (persiste em localStorage)
  // Salas unidas per-aula: chave = "${turmaId}::${data}", valor = turmaId com quem está unida
  const [salasUnidasConfig, setSalasUnidasConfig] = useState<Record<string, string>>({})

  // Config de sugestão (carregada do localStorage na montagem)
  const [configSugestao, setConfigSugestao] = useState<ConfigSugestao>(CONFIG_PADRAO)
  const [configOpen, setConfigOpen]         = useState(false)
  useEffect(() => { setConfigSugestao(carregarConfig()) }, [])

  // Sugestão de escala
  const [profTurmasMap, setProfTurmasMap]         = useState<Record<string, string[]>>({})
  const [sugestaoOpen, setSugestaoOpen]           = useState(false)
  // sugestaoEntradas inclui TODAS as turmas (inclusive unidas, onde professorId pode ser '' = unida)
  const [sugestaoEntradas, setSugestaoEntradas]   = useState<Array<{ data: string; turmaId: string; professorId: string }>>([])
  const [isSalvandoSugestao, setIsSalvandoSugestao] = useState(false)

  // Remover toda a escala de uma turma
  const [excluirTurmaId,         setExcluirTurmaId]         = useState<string | null>(null)
  const [excluirTurmaDialogOpen, setExcluirTurmaDialogOpen] = useState(false)
  const [isDeletingTurma,        setIsDeletingTurma]        = useState(false)

  const domingosTrimForm = useMemo(
    () => getDomingosTrimestre(parseInt(formData.trimestre), parseInt(formData.ano)),
    [formData.trimestre, formData.ano]
  )
  const dataComputada = domingosTrimForm.find(d => d.aula === parseInt(formData.aulaIdx))?.data ?? ''

  // ── Próxima aula (para destaque) ──────────────────────────────────────────────
  const proximaData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const domingos = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno))
    return domingos.find(d => d.data >= today)?.data ?? null
  }, [filtroTrim, filtroAno])

  // Auto-expande o card da próxima aula quando muda o período
  useEffect(() => {
    if (proximaData) {
      setExpandedDatas(new Set([proximaData]))
    } else {
      setExpandedDatas(new Set())
    }
  }, [filtroTrim, filtroAno])

  // ── Salas unidas: carregar do localStorage ───────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ebd_salas_unidas')
      if (raw) setSalasUnidasConfig(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  function salvarSalasUnidas(config: Record<string, string>) {
    setSalasUnidasConfig(config)
    try { localStorage.setItem('ebd_salas_unidas', JSON.stringify(config)) } catch { /* ignore */ }
  }

  // Helpers per-aula para salas unidas
  const unidaChave = (turmaId: string, data: string) => `${turmaId}::${data}`
  const unidaComIdEmData = (turmaId: string, data: string) => salasUnidasConfig[unidaChave(turmaId, data)] ?? ''
  const unidaComNomeEmData = (turmaId: string, data: string) => {
    const uid = unidaComIdEmData(turmaId, data)
    return uid ? getTurmaNome(uid) : ''
  }

  // ── Função de carga reutilizável ──────────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    try {
      const { escalas, professores, turmas, professorTurmas } = await fetchEscala()

      setEscalasData(escalas.map((e: any) => ({
        id: e.id, data: e.data, turmaId: e.turma_id, professorId: e.professor_id,
        trimestre: e.trimestre ?? (Math.floor(new Date(e.data + 'T12:00:00').getMonth() / 3) + 1),
        observacao: e.observacoes ?? '',
        tituloAula: e.titulo_aula ?? '',
      })))
      setProfessoresData(professores)
      setTurmasData(turmas)

      // Monta mapa turmaId → professorId[]
      const ptMap: Record<string, string[]> = {}
      for (const pt of professorTurmas) {
        if (!ptMap[pt.turma_id]) ptMap[pt.turma_id] = []
        ptMap[pt.turma_id].push(pt.professor_id)
      }
      setProfTurmasMap(ptMap)
    } catch (e: any) {
      const msg = e?.message ?? 'erro desconhecido'
      const ehPool = msg.includes('EMAXCONN') || msg.includes('max clients') || msg.includes('Server Components')
      toast(ehPool ? 'Serviço temporariamente sobrecarregado. Recarregue a página.' : 'Erro ao carregar escala: ' + msg, 'error')
    } finally {
      setCarregando(false)
    }
  }, [])

  // ── Carga inicial ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false

    // Safety timeout: garante que o loading não trava indefinidamente
    const safetyTimer = setTimeout(() => {
      if (!cancelado) setCarregando(false)
    }, 10000)

    carregarDados().finally(() => clearTimeout(safetyTimer))
    return () => { cancelado = true; clearTimeout(safetyTimer) }
  }, [carregarDados])

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getProfNome  = (id: string | null) => id ? (professoresData.find(p => p.id === id)?.nome ?? '—') : null
  const getTurmaNome = (id: string) => turmasData.find(t => t.id === id)?.nome ?? '—'
  const getTurmaCor  = (id: string) => turmasData.find(t => t.id === id)?.cor ?? 'bg-gray-500'

  // ── Turmas ordenadas canonicamente ────────────────────────────────────────────
  const turmasOrdenadas = useMemo(
    () => [...turmasData].sort((a, b) => ordemTurma(a.sala) - ordemTurma(b.sala)),
    [turmasData]
  )

  // ── Filtros base ──────────────────────────────────────────────────────────────
  const escalasPeriodo = useMemo(() =>
    escalasData
      .filter(e => e.data.startsWith(filtroAno) && Number(e.trimestre) === parseInt(filtroTrim))
      .sort((a, b) => a.data.localeCompare(b.data)),
    [escalasData, filtroAno, filtroTrim]
  )

  const escalasFiltradas = useMemo(() => {
    let list = escalasPeriodo
    if (filtroProf  !== 'todos')  list = list.filter(e => e.professorId === filtroProf)
    if (filtroTurma !== 'todas')  list = list.filter(e => e.turmaId === filtroTurma)
    return list
  }, [escalasPeriodo, filtroProf, filtroTurma])

  // ── View por Turma (L# × Professor com tema da lição) ─────────────────────────
  const turmaView = useMemo(() => {
    if (filtroTurma === 'todas') return null
    const turma = turmasData.find(t => t.id === filtroTurma)
    if (!turma) return null
    const domingos = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno))
    const temaRevista = getTemaRevista(turma.nome, filtroAno, parseInt(filtroTrim))
    return {
      turma,
      temaRevista,
      linhas: domingos.map(dom => {
        const escala = escalasPeriodo.find(e => e.data === dom.data && e.turmaId === filtroTurma)
        const temaLicao = escala?.tituloAula || getLicaoTema(turma.nome, filtroAno, parseInt(filtroTrim), dom.aula)
        return {
          aula: dom.aula,
          data: dom.data,
          escala: escala ?? null,
          professor: escala ? getProfNome(escala.professorId) : null,
          temaLicao,
          isProxima: dom.data === proximaData,
          is2nd: is2ndSunday(dom.data),
          destacado: filtroProf !== 'todos' && escala?.professorId === filtroProf,
        }
      }),
    }
  }, [filtroTurma, filtroTrim, filtroAno, turmasData, escalasPeriodo, filtroProf, professoresData, proximaData])

  // ── Visão Tabela (L# × Turma) ─────────────────────────────────────────────────
  const filhasDoReiId = useMemo(
    () => turmasData.find(t => t.nome.toLowerCase().includes('filha'))?.id ?? null,
    [turmasData]
  )

  const tabelaView = useMemo(() => {
    const domingos = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno))
    const turmasNaEscala = turmasOrdenadas.filter(t =>
      escalasPeriodo.some(e => e.turmaId === t.id)
    )
    const linhas = domingos.map(dom => {
      const escalasNoDia = escalasPeriodo.filter(e => e.data === dom.data)
      return {
        aula: dom.aula,
        data: dom.data,
        isProxima: dom.data === proximaData,
        is2nd: is2ndSunday(dom.data),
        temEscala: escalasNoDia.length > 0,
        celulas: turmasNaEscala.map(t => {
          const e = escalasNoDia.find(es => es.turmaId === t.id)
          const unidaId = unidaComIdEmData(t.id, dom.data)
          return {
            turmaId: t.id,
            escala: e ?? null,
            professor: e ? getProfNome(e.professorId) : null,
            destacado: filtroProf !== 'todos' && e?.professorId === filtroProf,
            isMerged: !!unidaId,
            unidaComNome: unidaId ? getTurmaNome(unidaId) : '',
          }
        }),
      }
    })
    return { turmas: turmasNaEscala, linhas }
  }, [filtroTrim, filtroAno, turmasOrdenadas, escalasPeriodo, filtroProf, professoresData, proximaData, salasUnidasConfig])

  // ── Visão Cards (agrupado por data) ───────────────────────────────────────────
  const cardsView = useMemo(() => {
    const map: Record<string, { aulaInfo: ReturnType<typeof getAulaInfo>; escalas: Escala[] }> = {}
    for (const e of escalasFiltradas) {
      if (!map[e.data]) map[e.data] = { aulaInfo: getAulaInfo(e.data), escalas: [] }
      map[e.data].escalas.push(e)
    }
    // Ordena escalas dentro de cada card pela ordem canônica das turmas
    for (const entry of Object.values(map)) {
      entry.escalas.sort((a, b) => ordemTurma(getTurmaNome(a.turmaId)) - ordemTurma(getTurmaNome(b.turmaId)))
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [escalasFiltradas, turmasData, professoresData])

  // ── Dialog handlers ───────────────────────────────────────────────────────────
  const fecharDialog = useCallback(() => {
    setDialogOpen(false); setEditMode(false); setSelectedEscala(null); setFormData(FORM_VAZIO)
  }, [])

  function abrirDialog(escala?: Escala) {
    if (escala) {
      const info = getAulaInfo(escala.data)
      setEditMode(true); setSelectedEscala(escala)
      setFormData({
        ano:         info ? String(info.ano)       : String(new Date().getFullYear()),
        trimestre:   info ? String(info.trimestre) : String(escala.trimestre),
        aulaIdx:     info ? String(info.aula)      : '1',
        turmaId:     escala.turmaId,
        professorId: escala.professorId ?? '',
        observacao:  escala.observacao,
        tituloAula:  escala.tituloAula,
      })
    } else {
      setEditMode(false); setSelectedEscala(null); setFormData(FORM_VAZIO)
    }
    setDialogOpen(true)
  }

  const salvarEscala = useCallback(async () => {
    if (!dataComputada || !formData.turmaId || !formData.professorId) {
      toast('Preencha todos os campos obrigatórios (turma e professor).', 'error'); return
    }
    if (isSaving) return
    setIsSaving(true)
    try {
      const resultado = await salvarEscalaAction({
        id: editMode && selectedEscala ? selectedEscala.id : undefined,
        data: dataComputada,
        turma_id: formData.turmaId,
        professor_id: formData.professorId,
        observacoes: formData.observacao || null,
        titulo_aula: formData.tituloAula || null,
      })
      if (!resultado.success) {
        toast('Erro ao salvar: ' + (resultado.error ?? 'erro'), 'error')
        return
      }
      toast(editMode ? 'Escala atualizada!' : 'Escala cadastrada!')
      fecharDialog()
      await carregarDados()
    } catch (e: any) {
      toast('Erro ao salvar: ' + (e?.message ?? 'erro'), 'error')
    } finally {
      setIsSaving(false)
    }
  }, [dataComputada, formData, isSaving, editMode, selectedEscala, fecharDialog, carregarDados])

  const excluirEscala = useCallback(async () => {
    if (!selectedEscala || isDeleting) return
    setIsDeleting(true)
    try {
      const resultado = await excluirEscalaAction(selectedEscala.id)
      if (!resultado.success) {
        toast('Erro ao excluir: ' + (resultado.error ?? 'erro desconhecido'), 'error')
        return
      }
      toast('Escala excluída.')
      setDeleteDialogOpen(false)
      setSelectedEscala(null)
      await carregarDados()
    } catch (e: any) {
      console.error('Exceção ao excluir escala:', e)
      toast('Erro ao excluir: ' + (e?.message ?? 'erro'), 'error')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedEscala, isDeleting, carregarDados])

  // ── Sugestão de escala ────────────────────────────────────────────────────────
  const abrirSugestao = useCallback(() => {
    const entradas = gerarEscalaSugerida(profTurmasMap, professoresData, turmasData, parseInt(filtroAno), parseInt(filtroTrim), configSugestao)
    // Adicionar entradas vazias para aulas marcadas como unidas per-aula
    const entradasComUnidas = [...entradas]
    for (const chave of Object.keys(salasUnidasConfig)) {
      const sep = chave.indexOf('::')
      if (sep < 0) continue
      const tid  = chave.slice(0, sep)
      const data = chave.slice(sep + 2)
      if (!entradasComUnidas.some(e => e.data === data && e.turmaId === tid)) {
        entradasComUnidas.push({ data, turmaId: tid, professorId: '' })
      }
    }
    setSugestaoEntradas(entradasComUnidas)
    setSugestaoOpen(true)
  }, [profTurmasMap, professoresData, turmasData, filtroAno, filtroTrim, salasUnidasConfig])

  const fecharSugestao = useCallback(() => {
    setSugestaoOpen(false)
  }, [])

  const updateSugestaoCell = useCallback((data: string, turmaId: string, professorId: string) => {
    setSugestaoEntradas(prev => {
      const filtered = prev.filter(e => !(e.data === data && e.turmaId === turmaId))
      return [...filtered, { data, turmaId, professorId }]
    })
  }, [])

  const salvarSugestao = useCallback(async () => {
    // Salva apenas entradas com professor definido (ignora '' = unidas sem professor)
    const paraInserir = sugestaoEntradas.filter(e => e.professorId !== '')
    if (isSalvandoSugestao || paraInserir.length === 0) return
    setIsSalvandoSugestao(true)
    try {
      const resultados = await Promise.all(
        paraInserir.map(e => salvarEscalaAction({
          data: e.data,
          turma_id: e.turmaId,
          professor_id: e.professorId,
          observacoes: '',
        }))
      )
      const erros = resultados.filter(r => !r.success)
      if (erros.length > 0) {
        toast(`Erro ao salvar ${erros.length} escala(s): ${erros[0].error ?? 'erro'}`, 'error')
        return
      }
      setSugestaoOpen(false)
      setSugestaoEntradas([])
      toast(`${paraInserir.length} escalas salvas com sucesso!`)
      await carregarDados()
    } catch (e: any) {
      toast('Erro ao salvar: ' + (e?.message ?? 'erro'), 'error')
    } finally {
      setIsSalvandoSugestao(false)
    }
  }, [sugestaoEntradas, isSalvandoSugestao, carregarDados])

  // ── Remover toda a escala de uma turma no período ────────────────────────────
  async function excluirEscalasTurma() {
    if (!excluirTurmaId || isDeletingTurma) return
    setIsDeletingTurma(true)
    try {
      const datas = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno)).map(d => d.data)
      const idsParaExcluir = escalasData
        .filter(e => e.turmaId === excluirTurmaId && datas.includes(e.data))
        .map(e => e.id)
      const resultados = await Promise.all(
        idsParaExcluir.map(id => excluirEscalaAction(id))
      )
      const erros = resultados.filter(r => !r.success)
      if (erros.length > 0) {
        toast('Erro ao remover escalas: ' + (erros[0].error ?? 'erro'), 'error')
        return
      }
      toast(`Escalas de "${getTurmaNome(excluirTurmaId)}" removidas.`)
      setExcluirTurmaDialogOpen(false)
      setExcluirTurmaId(null)
      await carregarDados()
    } catch (e: any) {
      toast('Erro: ' + (e?.message ?? 'erro'), 'error')
    } finally {
      setIsDeletingTurma(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (carregando) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-20 w-full bg-muted rounded-xl" />
      <div className="h-64 w-full bg-muted rounded-xl" />
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escala de Professores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {escalasFiltradas.length} escala(s) · {TRIMESTRES_SHORT[parseInt(filtroTrim) - 1]} {filtroAno}
            {filtroTurma !== 'todas' && (
              <span className="ml-1">· {getTurmaNome(filtroTurma)}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" title="Configurar restrições da sugestão" onClick={() => setConfigOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={abrirSugestao} className="flex-1 sm:flex-none" disabled={Object.keys(profTurmasMap).length === 0}>
            <Sparkles className="h-4 w-4 mr-2" />Gerar Sugestão
          </Button>
          <Button onClick={() => abrirDialog()} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />Nova Escala
          </Button>
        </div>
      </div>

      {/* ── Barra de Filtros ───────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-3 space-y-3">
        {/* Linha 1: Ano + Trimestre + toggle */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ano</Label>
            <Select value={filtroAno} onValueChange={v => { setFiltroAno(v); setFiltroTurma('todas') }}>
              <SelectTrigger className="h-8 w-[80px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANOS_DISPONIVEIS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Trimestre</Label>
            <Select value={filtroTrim} onValueChange={v => { setFiltroTrim(v); setFiltroTurma('todas') }}>
              <SelectTrigger className="h-8 w-[170px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIMESTRES_SHORT.map((t, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{TRIMESTRES_LABEL[i]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtroTurma === 'todas' && (
            <div className="ml-auto flex items-center gap-2 self-end">
              <div className="flex gap-1 border rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('tabela')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'tabela' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Table2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tabela</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Linha 2: Turma + Professor */}
        <div className="flex flex-wrap gap-2 items-end border-t pt-3">
          <ListFilter className="h-4 w-4 text-muted-foreground self-end mb-1.5 flex-shrink-0" />

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ver por turma</Label>
            <Select value={filtroTurma} onValueChange={setFiltroTurma}>
              <SelectTrigger className="h-8 w-[180px] text-sm"><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as turmas</SelectItem>
                {turmasOrdenadas.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${t.cor}`} />
                      {t.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Professor</Label>
            <Select value={filtroProf} onValueChange={setFiltroProf}>
              <SelectTrigger className="h-8 w-[160px] text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os professores</SelectItem>
                {professoresData.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── View por Turma ─────────────────────────────────────────────────── */}
      {turmaView && (
        <div className="rounded-xl border overflow-hidden shadow-sm">
          {/* Cabeçalho da turma */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-muted/50 border-b">
            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${turmaView.turma.cor}`} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{turmaView.turma.nome}</p>
              {turmaView.temaRevista && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <BookOpen className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{turmaView.temaRevista}</span>
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {turmaView.linhas.filter(l => l.professor).length} / {turmaView.linhas.length} aulas
            </Badge>
          </div>

          {/* Linhas por aula */}
          <div className="divide-y">
            {turmaView.linhas.map(linha => (
              <div
                key={linha.data}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  linha.isProxima
                    ? 'bg-primary/8 border-l-2 border-l-primary'
                    : linha.is2nd
                    ? 'bg-amber-50/50 dark:bg-amber-950/20'
                    : linha.destacado
                    ? 'bg-primary/5'
                    : 'hover:bg-muted/20'
                }`}
              >
                {/* Número da aula */}
                <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                  linha.isProxima
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {linha.aula}
                </div>

                {/* Data + Tema */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
                    <span className="text-xs font-semibold capitalize">{fmtDataLonga(linha.data)}</span>
                    {linha.isProxima && (
                      <span className="text-[10px] text-primary font-semibold">Próxima aula</span>
                    )}
                  </div>
                  {linha.temaLicao ? (
                    <p className="text-[11px] text-muted-foreground truncate">
                      Lição {linha.aula}: {linha.temaLicao}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/50">Lição {linha.aula}</p>
                  )}
                </div>

                {/* Professor + ações */}
                <div className={`flex items-center gap-1.5 flex-shrink-0 ${linha.destacado ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {linha.professor ? (
                    <>
                      <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs">{linha.professor}</span>
                      <div className="flex gap-0.5 ml-1">
                        <button
                          onClick={() => linha.escala && abrirDialog(linha.escala)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => { if (linha.escala) { setSelectedEscala(linha.escala); setDeleteDialogOpen(true) } }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        const info = getAulaInfo(linha.data)
                        setEditMode(false); setSelectedEscala(null)
                        setFormData({
                          ano: info ? String(info.ano) : filtroAno,
                          trimestre: info ? String(info.trimestre) : filtroTrim,
                          aulaIdx: info ? String(info.aula) : '1',
                          turmaId: turmaView?.turma.id ?? '', professorId: '', observacao: '', tituloAula: '',
                        })
                        setDialogOpen(true)
                      }}
                      className="flex items-center gap-1 text-[11px] italic text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      adicionar professor
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Visão Tabela ───────────────────────────────────────────────────── */}
      {!turmaView && viewMode === 'tabela' && (
        tabelaView.turmas.length === 0 ? (
          <EmptyEscala onNova={() => abrirDialog()} />
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th
                      className="sticky left-0 z-20 px-3 py-3 text-left font-semibold text-muted-foreground text-xs border-r whitespace-nowrap"
                      style={{ background: 'hsl(var(--card))', minWidth: '90px', width: '90px' }}
                    >
                      Aula
                    </th>
                    {tabelaView.turmas.map((t, colIdx) => {
                      const tema = getTemaRevista(t.nome, filtroAno, parseInt(filtroTrim))
                      return (
                        <th key={t.id} className="px-3 py-0 text-left font-semibold" style={{ minWidth: '160px', maxWidth: '220px', backgroundColor: turmaCorRgba(t.cor, colIdx, 0.12) }}>
                          <div className={`h-2.5 -mx-3 mb-2 ${t.cor}`} />
                          <div className="flex items-center gap-1 mb-0.5 group/col">
                            <span className="text-xs font-bold flex-1 truncate">{t.nome}</span>
                            <button
                              onClick={() => { setExcluirTurmaId(t.id); setExcluirTurmaDialogOpen(true) }}
                              className="opacity-0 group-hover/col:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                              title={`Remover todas as escalas de ${t.nome}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {tema && (
                            <p className="text-[10px] text-muted-foreground font-normal leading-snug pb-2">
                              {tema}
                            </p>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {tabelaView.linhas.map((linha) => {
                    const isSelected = selectedRow === linha.data
                    const rowBase = isSelected
                      ? 'ring-2 ring-inset ring-primary bg-primary/8'
                      : linha.isProxima
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : linha.is2nd
                      ? 'bg-amber-50/40 dark:bg-amber-950/10'
                      : 'hover:bg-muted/20'
                    return (
                      <tr
                        key={linha.data}
                        className={`border-b last:border-0 transition-all ${rowBase}`}
                      >
                        {/* Coluna unica sticky: numero + data */}
                        <td
                          className="sticky left-0 z-10 px-3 py-2.5 border-r cursor-pointer"
                          style={{ background: 'hsl(var(--card))', width: '90px', minWidth: '90px' }}
                          onClick={() => setSelectedRow(prev => prev === linha.data ? null : linha.data)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold flex-shrink-0 transition-colors ${
                              isSelected || linha.isProxima
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {linha.aula}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-medium leading-tight ${isSelected || linha.isProxima ? 'text-primary' : ''}`}>
                                {fmtDataCurta(linha.data)}
                              </span>
                              {linha.is2nd && (
                                <span className="text-[9px] text-amber-500 font-bold leading-none">★ 2º dom</span>
                              )}
                            </div>
                          </div>
                        </td>
                        {linha.celulas.map((c, colIdx) => {
                          const temaLicao = c.escala?.tituloAula || getLicaoTema(getTurmaNome(c.turmaId), filtroAno, parseInt(filtroTrim), linha.aula)
                          const turmaObj = tabelaView.turmas[colIdx]
                          return (
                          <td key={c.turmaId} className="px-3 py-2" style={{ backgroundColor: turmaCorRgba(turmaObj?.cor, colIdx, 0.05) }}>
                            {c.isMerged ? (
                              c.professor ? (
                                <div className="flex items-center justify-between gap-1 group">
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-xs ${c.destacado ? 'text-primary font-semibold' : ''}`}>
                                      {c.professor}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-500 italic">
                                      <Link2 className="h-2.5 w-2.5 flex-shrink-0" />{c.unidaComNome}
                                    </span>
                                    {temaLicao && (
                                      <span className="text-[10px] text-muted-foreground/60 leading-snug mt-0.5">
                                        {temaLicao}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                      onClick={() => c.escala && abrirDialog(c.escala)}
                                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => { if (c.escala) { setSelectedEscala(c.escala); setDeleteDialogOpen(true) } }}
                                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 group">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 italic">
                                    <Link2 className="h-3 w-3 flex-shrink-0" />
                                    {c.unidaComNome}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const info = getAulaInfo(linha.data)
                                      setEditMode(false); setSelectedEscala(null)
                                      setFormData({
                                        ano: info ? String(info.ano) : filtroAno,
                                        trimestre: info ? String(info.trimestre) : filtroTrim,
                                        aulaIdx: info ? String(info.aula) : '1',
                                        turmaId: c.turmaId, professorId: '', observacao: '', tituloAula: '',
                                      })
                                      setDialogOpen(true)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                    title="Adicionar professor"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              )
                            ) : c.professor ? (
                              <div className="flex items-center justify-between gap-1 group">
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-xs ${c.destacado ? 'text-primary font-semibold' : ''}`}>
                                    {c.professor}
                                  </span>
                                  {temaLicao && (
                                    <span className="text-[10px] text-muted-foreground/60 leading-snug mt-0.5">
                                      {temaLicao}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button
                                    onClick={() => c.escala && abrirDialog(c.escala)}
                                    className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => { if (c.escala) { setSelectedEscala(c.escala); setDeleteDialogOpen(true) } }}
                                    className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  const info = getAulaInfo(linha.data)
                                  setEditMode(false); setSelectedEscala(null)
                                  setFormData({
                                    ano: info ? String(info.ano) : filtroAno,
                                    trimestre: info ? String(info.trimestre) : filtroTrim,
                                    aulaIdx: info ? String(info.aula) : '1',
                                    turmaId: c.turmaId, professorId: '', observacao: '', tituloAula: '',
                                  })
                                  setDialogOpen(true)
                                }}
                                className="w-full flex items-center justify-center text-xs text-muted-foreground/30 hover:text-primary hover:bg-primary/5 rounded px-2 py-1 transition-colors group/empty"
                                title="Adicionar escala"
                              >
                                <span className="group-hover/empty:hidden">—</span>
                                <Plus className="h-3.5 w-3.5 hidden group-hover/empty:block" />
                              </button>
                            )}
                          </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Visão Cards ────────────────────────────────────────────────────── */}
      {!turmaView && viewMode === 'cards' && (
        cardsView.length === 0 ? (
          <EmptyEscala onNova={() => abrirDialog()} />
        ) : (
          <div className="space-y-2">
            {cardsView.map(([data, { aulaInfo, escalas }]) => {
              const isExpanded = expandedDatas.has(data)
              const isProxima  = data === proximaData
              const is2nd      = is2ndSunday(data)
              const dataFmt    = fmtDataLonga(data)

              return (
                <div
                  key={data}
                  className={`rounded-xl border bg-card overflow-hidden shadow-sm transition-shadow ${
                    isProxima ? 'ring-2 ring-primary ring-offset-1 shadow-md' : ''
                  }`}
                >
                  {/* Faixa de destaque para próxima aula */}
                  {isProxima && (
                    <div className="bg-primary text-primary-foreground text-[10px] font-semibold text-center py-0.5 tracking-wider uppercase">
                      Próxima aula
                    </div>
                  )}

                  {/* Header do card */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpandedDatas(prev => {
                      const next = new Set(prev)
                      next.has(data) ? next.delete(data) : next.add(data)
                      return next
                    })}
                  >
                    {/* Número da aula */}
                    <div className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 font-bold text-sm ${
                      isProxima
                        ? 'bg-primary text-primary-foreground'
                        : is2nd
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {aulaInfo?.aula ?? '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold capitalize text-sm">{dataFmt}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {escalas.length} turma{escalas.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Professores resumidos (quando recolhido) */}
                      {!isExpanded && (
                        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
                          {escalas.map(e => (
                            <span key={e.id} className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${getTurmaCor(e.turmaId)}`} />
                              {getProfNome(e.professorId)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {/* Turmas expandidas */}
                  {isExpanded && (
                    <div className="border-t divide-y">
                      {escalas.map(escala => {
                        const aulaNum       = aulaInfo?.aula ?? 0
                        const turmaNome     = getTurmaNome(escala.turmaId)
                        const turmaCor      = getTurmaCor(escala.turmaId)
                        const temaLicaoBase = getLicaoTema(turmaNome, filtroAno, parseInt(filtroTrim), aulaNum)
                        const temaLicao     = escala.tituloAula || temaLicaoBase
                        const temaRev       = getTemaRevista(turmaNome, filtroAno, parseInt(filtroTrim))
                        const isProfDestac  = filtroProf !== 'todos' && escala.professorId === filtroProf
                        return (
                          <div key={escala.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ${isProfDestac ? 'bg-primary/5' : ''}`}>
                            {/* Faixa da turma */}
                            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${turmaCor}`} />

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{turmaNome}</p>
                              {temaLicao ? (
                                <p className={`text-[11px] truncate ${escala.tituloAula ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>
                                  Lição {aulaNum}: {temaLicao}
                                </p>
                              ) : temaRev ? (
                                <p className="text-[11px] text-muted-foreground truncate">{temaRev}</p>
                              ) : null}
                            </div>

                            <div className={`flex items-center gap-1.5 flex-shrink-0 ${isProfDestac ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                              <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs">{getProfNome(escala.professorId)}</span>
                            </div>

                            <div className="flex gap-0.5 flex-shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirDialog(escala)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedEscala(escala); setDeleteDialogOpen(true) }}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Dialog Config Sugestão ────────────────────────────────────────── */}
      <ConfigSugestaoDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        config={configSugestao}
        onSave={setConfigSugestao}
      />

      {/* ── Dialog Sugestão de Escala ──────────────────────────────────────── */}
      <SugestaoDialog
        open={sugestaoOpen}
        onClose={fecharSugestao}
        sugestaoEntradas={sugestaoEntradas}
        onUpdateCell={updateSugestaoCell}
        isSalvando={isSalvandoSugestao}
        onSalvar={salvarSugestao}
        professores={professoresData}
        turmas={turmasData}
        filtroTrim={filtroTrim}
        filtroAno={filtroAno}
        proximaData={proximaData}
        salasUnidasConfig={salasUnidasConfig}
        profTurmasMap={profTurmasMap}
      />

      {/* ── Dialog Nova / Editar Escala ────────────────────────────────────── */}
      <NovaEscalaDialog
        open={dialogOpen}
        onClose={fecharDialog}
        formData={formData}
        onChange={setFormData}
        onSave={salvarEscala}
        professores={professoresData}
        turmas={turmasData}
        isSaving={isSaving}
        editMode={editMode}
        domingosTrimForm={domingosTrimForm}
        dataComputada={dataComputada}
        salasUnidasConfig={salasUnidasConfig}
        onSalvarSalasUnidas={salvarSalasUnidas}
        profTurmasMap={profTurmasMap}
      />

      {/* ── Dialog Confirmar Exclusão ──────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Escala</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. Confirma?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={excluirEscala} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Remover todas as escalas de uma turma ───────────────────── */}
      <Dialog open={excluirTurmaDialogOpen} onOpenChange={v => { setExcluirTurmaDialogOpen(v); if (!v) setExcluirTurmaId(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Escalas da Turma</DialogTitle>
            <DialogDescription>
              Isso removerá todas as escalas de{' '}
              <strong>{excluirTurmaId ? getTurmaNome(excluirTurmaId) : '—'}</strong> no{' '}
              {TRIMESTRES_SHORT[parseInt(filtroTrim) - 1]} {filtroAno}. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setExcluirTurmaDialogOpen(false); setExcluirTurmaId(null) }} disabled={isDeletingTurma}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={excluirEscalasTurma} disabled={isDeletingTurma}>
              {isDeletingTurma ? 'Removendo...' : 'Remover Todas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Componente auxiliar: estado vazio ─────────────────────────────────────────
function EmptyEscala({ onNova }: { onNova: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border bg-card">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Calendar className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-base mb-1">Nenhuma escala encontrada</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">
        Não há escalas para o período selecionado. Crie a primeira.
      </p>
      <Button onClick={onNova}>
        <Plus className="h-4 w-4 mr-2" />Nova Escala
      </Button>
    </div>
  )
}

"use client"

import { useState, useEffect, useMemo } from 'react'
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
  Settings2, Unlink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ANOS_DISPONIVEIS, getTemaRevista, getLicaoTema } from '@/lib/constants'
import { toast } from '@/lib/toast'

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface Escala {
  id: string
  data: string
  turmaId: string
  professorId: string
  trimestre: number
  observacao: string
}
interface Professor { id: string; nome: string }
interface Turma { id: string; nome: string; cor: string }

// ─── Ordenação canônica das turmas ─────────────────────────────────────────────
function ordemTurma(nome: string): number {
  const n = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (n.includes('cordeirinho')) return 0
  if (n.includes('guerreiro'))   return 1
  if (n.includes('dynamo'))      return 2
  if (n.includes('shekinah'))    return 3
  if (n.includes('filha'))       return 4
  if (n.includes('hero') || n.includes('heroi')) return 5
  return 99
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
): Array<{ data: string; turmaId: string; professorId: string }> {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const pNome = (id: string) =>
    norm(professoresData.find(p => p.id === id)?.nome ?? '')

  const isFilhas  = (id: string) => norm(turmasData.find(t => t.id === id)?.nome ?? '').includes('filha')
  const isDynamo  = (id: string) => norm(turmasData.find(t => t.id === id)?.nome ?? '').includes('dynamo')

  const domingos = getDomingosTrimestre(trimestre, ano)
  const resultado: Array<{ data: string; turmaId: string; professorId: string }> = []

  const aulasPorProf = new Map<string, Set<number>>()          // profId → aulas used
  const countPorTurma = new Map<string, Map<string, number>>() // turmaId → profId → count
  let leandroDynamo = 0

  const turmasGen = [...turmasData]
    .sort((a, b) => ordemTurma(a.nome) - ordemTurma(b.nome))
    .filter(t => !isFilhas(t.id))

  for (const { aula, data } of domingos) {
    const isEven = aula % 2 === 0
    const is2nd  = is2ndSunday(data)
    const aulaProfs = new Map<string, string>() // profId → turmaId neste domingo

    for (const turma of turmasGen) {
      const pool = profTurmasMap[turma.id] ?? []

      const getEligible = (relaxConseq: boolean) =>
        pool.filter(pid => {
          const n = pNome(pid)
          // Viviana / Livys: somente aulas pares
          if ((n.includes('viviana') || n.includes('livys')) && !isEven) return false
          // Eder / Heldem / Leandro: não no 2º domingo do mês
          if (is2nd && (n.includes('eder') || n.includes('heldem') || n.includes('leandro'))) return false
          // Leandro: máx 1 aula no Dynamo
          if (isDynamo(turma.id) && n.includes('leandro') && leandroDynamo >= 1) return false
          // Não pode ensinar duas turmas no mesmo domingo
          if (aulaProfs.has(pid)) return false
          // Sem domingos seguidos
          if (!relaxConseq && aulasPorProf.get(pid)?.has(aula - 1)) return false
          // Restrições de par
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
      if (elig.length === 0) elig = getEligible(true) // relaxa consecutivos se necessário
      if (elig.length === 0) continue

      // Prioriza quem tem menos aulas nesta turma
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
}

// ─── Componente ────────────────────────────────────────────────────────────────
export default function EscalaPage() {
  const db = supabase as any

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
  const [salasUnidasConfig, setSalasUnidasConfig]       = useState<Record<string, string>>({})
  const [salasUnidasDialogOpen, setSalasUnidasDialogOpen] = useState(false)

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

  // Helper: verifica se uma turma é "unida"
  const isUnida = (turmaId: string) => turmaId in salasUnidasConfig
  const unidaComNome = (turmaId: string) => getTurmaNome(salasUnidasConfig[turmaId] ?? '') || '—'

  // ── Carga inicial ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false

    // Safety timeout: garante que o loading não trava indefinidamente
    const safetyTimer = setTimeout(() => {
      if (!cancelado) setCarregando(false)
    }, 10000)

    async function load() {
      try {
        const results = await Promise.allSettled([
          db.from('escalas').select('id, data, turma_id, professor_id, trimestre, observacoes').order('data'),
          db.from('professores').select('id, nome').eq('ativo', true).order('nome'),
          db.from('turmas').select('id, nome, cor').eq('ativa', true).order('nome'),
          db.from('professor_turmas').select('professor_id, turma_id'),
        ])
        if (cancelado) return

        const escalas   = results[0].status === 'fulfilled' ? results[0].value.data : []
        const profs     = results[1].status === 'fulfilled' ? results[1].value.data : []
        const turmas    = results[2].status === 'fulfilled' ? results[2].value.data : []
        const profTurms = results[3].status === 'fulfilled' ? results[3].value.data : []

        setEscalasData((escalas ?? []).map((e: any) => ({
          id: e.id, data: e.data, turmaId: e.turma_id, professorId: e.professor_id,
          trimestre: e.trimestre ?? (Math.floor(new Date(e.data + 'T12:00:00').getMonth() / 3) + 1),
          observacao: e.observacoes ?? '',
        })))
        setProfessoresData(profs ?? [])
        setTurmasData(turmas ?? [])

        // Monta mapa turmaId → professorId[]
        const ptMap: Record<string, string[]> = {}
        for (const pt of (profTurms ?? [])) {
          if (!ptMap[pt.turma_id]) ptMap[pt.turma_id] = []
          ptMap[pt.turma_id].push(pt.professor_id)
        }
        setProfTurmasMap(ptMap)
      } catch (e: any) {
        if (!cancelado) toast('Erro ao carregar escala: ' + (e?.message ?? 'erro'), 'error')
      } finally {
        clearTimeout(safetyTimer)
        setCarregando(false)
      }
    }
    load()
    return () => { cancelado = true; clearTimeout(safetyTimer) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getProfNome  = (id: string) => professoresData.find(p => p.id === id)?.nome ?? '—'
  const getTurmaNome = (id: string) => turmasData.find(t => t.id === id)?.nome ?? '—'
  const getTurmaCor  = (id: string) => turmasData.find(t => t.id === id)?.cor ?? 'bg-gray-500'

  // ── Turmas ordenadas canonicamente ────────────────────────────────────────────
  const turmasOrdenadas = useMemo(
    () => [...turmasData].sort((a, b) => ordemTurma(a.nome) - ordemTurma(b.nome)),
    [turmasData]
  )

  // ── Filtros base ──────────────────────────────────────────────────────────────
  const escalasPeriodo = useMemo(() =>
    escalasData
      .filter(e => e.data.startsWith(filtroAno) && e.trimestre === parseInt(filtroTrim))
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
        const temaLicao = getLicaoTema(turma.nome, filtroAno, parseInt(filtroTrim), dom.aula)
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
  // IDs de todas as turmas configuradas como "unidas" (inclui Filhas do Rei por nome como fallback)
  const filhasDoReiId = useMemo(
    () => turmasData.find(t => ordemTurma(t.nome) === 4)?.id ?? null,
    [turmasData]
  )
  // turmasUnidasIds = todas turmas que estão no config de salas unidas
  const turmasUnidasIds = useMemo(
    () => new Set(Object.keys(salasUnidasConfig)),
    [salasUnidasConfig]
  )

  const tabelaView = useMemo(() => {
    const domingos = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno))
    // Sempre inclui turmas unidas (mesmo sem entradas)
    const turmasNaEscala = turmasOrdenadas.filter(t =>
      escalasPeriodo.some(e => e.turmaId === t.id) || turmasUnidasIds.has(t.id)
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
          if (turmasUnidasIds.has(t.id)) {
            // Turma unida: mostra indicador mas ainda permite ter entrada
            const e = escalasNoDia.find(es => es.turmaId === t.id)
            return {
              turmaId: t.id,
              escala: e ?? null,
              professor: e ? getProfNome(e.professorId) : null,
              destacado: filtroProf !== 'todos' && e?.professorId === filtroProf,
              isMerged: true,
              unidaComNome: getTurmaNome(salasUnidasConfig[t.id] ?? ''),
            }
          }
          const e = escalasNoDia.find(es => es.turmaId === t.id)
          return {
            turmaId: t.id,
            escala: e ?? null,
            professor: e ? getProfNome(e.professorId) : null,
            destacado: filtroProf !== 'todos' && e?.professorId === filtroProf,
            isMerged: false,
            unidaComNome: '',
          }
        }),
      }
    })
    return { turmas: turmasNaEscala, linhas }
  }, [filtroTrim, filtroAno, turmasOrdenadas, escalasPeriodo, filtroProf, professoresData, proximaData, turmasUnidasIds, salasUnidasConfig])

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
  function abrirDialog(escala?: Escala) {
    if (escala) {
      const info = getAulaInfo(escala.data)
      setEditMode(true); setSelectedEscala(escala)
      setFormData({
        ano:         info ? String(info.ano)       : String(new Date().getFullYear()),
        trimestre:   info ? String(info.trimestre) : String(escala.trimestre),
        aulaIdx:     info ? String(info.aula)      : '1',
        turmaId:     escala.turmaId,
        professorId: escala.professorId,
        observacao:  escala.observacao,
      })
    } else {
      setEditMode(false); setSelectedEscala(null); setFormData(FORM_VAZIO)
    }
    setDialogOpen(true)
  }

  function fecharDialog() {
    setDialogOpen(false); setEditMode(false); setSelectedEscala(null); setFormData(FORM_VAZIO)
  }

  async function salvarEscala() {
    if (!dataComputada || !formData.turmaId || !formData.professorId) {
      toast('Preencha todos os campos obrigatórios.', 'error'); return
    }
    if (isSaving) return
    setIsSaving(true)
    const trimestre = parseInt(formData.trimestre)
    try {
      if (editMode && selectedEscala) {
        // trimestre é coluna GENERATED — não incluir no update
        const { error } = await db.from('escalas').update({
          data: dataComputada,
          turma_id: formData.turmaId,
          professor_id: formData.professorId,
          observacoes: formData.observacao,
        }).eq('id', selectedEscala.id)
        if (error) { toast('Erro ao atualizar escala.', 'error'); return }
        setEscalasData(prev => prev.map(e =>
          e.id === selectedEscala.id
            ? { ...e, data: dataComputada, turmaId: formData.turmaId, professorId: formData.professorId, trimestre, observacao: formData.observacao }
            : e
        ))
        toast('Escala atualizada!')
      } else {
        // trimestre é coluna GENERATED — não incluir no insert
        const { data, error } = await db.from('escalas').insert({
          data: dataComputada,
          turma_id: formData.turmaId,
          professor_id: formData.professorId,
          observacoes: formData.observacao,
        }).select('id').single()
        if (error || !data) { toast('Erro ao cadastrar escala.', 'error'); return }
        setEscalasData(prev => [...prev, {
          id: data.id, data: dataComputada, turmaId: formData.turmaId,
          professorId: formData.professorId, trimestre, observacao: formData.observacao,
        }])
        toast('Escala cadastrada!')
      }
      fecharDialog()
    } catch (e: any) {
      toast('Erro ao salvar: ' + (e?.message ?? 'erro'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function excluirEscala() {
    if (!selectedEscala || isDeleting) return
    setIsDeleting(true)
    try {
      const { error } = await db.from('escalas').delete().eq('id', selectedEscala.id)
      if (error) {
        console.error('Erro ao excluir escala:', error)
        toast('Erro ao excluir: ' + (error.message ?? 'erro desconhecido'), 'error')
        return
      }
      setEscalasData(prev => prev.filter(e => e.id !== selectedEscala.id))
      toast('Escala excluída.')
      setDeleteDialogOpen(false)
      setSelectedEscala(null)
    } catch (e: any) {
      console.error('Exceção ao excluir escala:', e)
      toast('Erro ao excluir: ' + (e?.message ?? 'erro'), 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Sugestão de escala ────────────────────────────────────────────────────────
  function abrirSugestao() {
    const entradas = gerarEscalaSugerida(profTurmasMap, professoresData, turmasData, parseInt(filtroAno), parseInt(filtroTrim))
    // Adicionar entradas vazias para turmas unidas (professorId = '' significa "unida")
    const domingosTrim = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno))
    const entradasComUnidas = [...entradas]
    for (const tid of Object.keys(salasUnidasConfig)) {
      for (const dom of domingosTrim) {
        if (!entradasComUnidas.some(e => e.data === dom.data && e.turmaId === tid)) {
          entradasComUnidas.push({ data: dom.data, turmaId: tid, professorId: '' })
        }
      }
    }
    setSugestaoEntradas(entradasComUnidas)
    setSugestaoOpen(true)
  }

  function updateSugestaoCell(data: string, turmaId: string, professorId: string) {
    setSugestaoEntradas(prev => {
      const filtered = prev.filter(e => !(e.data === data && e.turmaId === turmaId))
      return [...filtered, { data, turmaId, professorId }]
    })
  }

  async function salvarSugestao() {
    // Salva apenas entradas com professor definido (ignora '' = unidas sem professor)
    const paraInserir = sugestaoEntradas.filter(e => e.professorId !== '')
    if (isSalvandoSugestao || paraInserir.length === 0) return
    setIsSalvandoSugestao(true)
    try {
      const payload = paraInserir.map(e => ({
        data: e.data,
        turma_id: e.turmaId,
        professor_id: e.professorId,
        observacoes: '',
      }))
      const { data: inserted, error } = await db
        .from('escalas')
        .insert(payload)
        .select('id, data, turma_id, professor_id, observacoes')
      if (error) { toast('Erro ao salvar sugestão: ' + error.message, 'error'); return }
      const novos = (inserted ?? []).map((e: any) => ({
        id: e.id, data: e.data, turmaId: e.turma_id, professorId: e.professor_id,
        trimestre: parseInt(filtroTrim), observacao: e.observacoes ?? '',
      }))
      setEscalasData(prev => [...prev, ...novos])
      setSugestaoOpen(false)
      setSugestaoEntradas([])
      toast(`${novos.length} escalas salvas com sucesso!`)
    } catch (e: any) {
      toast('Erro ao salvar: ' + (e?.message ?? 'erro'), 'error')
    } finally {
      setIsSalvandoSugestao(false)
    }
  }

  // ── Remover toda a escala de uma turma no período ────────────────────────────
  async function excluirEscalasTurma() {
    if (!excluirTurmaId || isDeletingTurma) return
    setIsDeletingTurma(true)
    try {
      const datas = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno)).map(d => d.data)
      const { error } = await db.from('escalas')
        .delete()
        .eq('turma_id', excluirTurmaId)
        .in('data', datas)
      if (error) { toast('Erro ao remover escalas: ' + error.message, 'error'); return }
      setEscalasData(prev => prev.filter(e => !(e.turmaId === excluirTurmaId && datas.includes(e.data))))
      toast(`Escalas de "${getTurmaNome(excluirTurmaId)}" removidas.`)
      setExcluirTurmaDialogOpen(false)
      setExcluirTurmaId(null)
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
              <button
                onClick={() => setSalasUnidasDialogOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Configurar salas unidas"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salas Unidas</span>
                {Object.keys(salasUnidasConfig).length > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                    {Object.keys(salasUnidasConfig).length}
                  </span>
                )}
              </button>
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
                } ${!linha.professor ? 'opacity-50' : ''}`}
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
                    {linha.is2nd && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">★ Turmas unidas</span>
                    )}
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
                    <span className="text-[11px] italic">sem professor</span>
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
                    <th className="sticky left-0 z-20 bg-card px-3 py-3 text-center font-semibold text-muted-foreground w-12 text-xs border-r">
                      L#
                    </th>
                    <th className="sticky left-12 z-20 bg-card px-3 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap text-xs w-16 border-r">
                      Data
                    </th>
                    {tabelaView.turmas.map(t => {
                      const tema = getTemaRevista(t.nome, filtroAno, parseInt(filtroTrim))
                      const isMergedCol = turmasUnidasIds.has(t.id)
                      const unidaNome   = isMergedCol ? getTurmaNome(salasUnidasConfig[t.id] ?? '') : ''
                      return (
                        <th key={t.id} className={`px-4 py-0 text-left font-semibold min-w-[150px] ${isMergedCol ? 'opacity-60' : ''}`}>
                          {/* Tira colorida */}
                          <div className={`h-1 -mx-4 mb-2 ${t.cor}`} />
                          <div className="flex items-center gap-1 mb-0.5 group/col">
                            <div className="flex items-center gap-1.5 flex-1 flex-wrap min-w-0">
                              <span className="text-xs font-bold">{t.nome}</span>
                              {isMergedCol && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                                  <Link2 className="h-2.5 w-2.5" />Unida c/ {unidaNome}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => { setExcluirTurmaId(t.id); setExcluirTurmaDialogOpen(true) }}
                              className="opacity-0 group-hover/col:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                              title={`Remover todas as escalas de ${t.nome}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {!isMergedCol && tema && (
                            <p className="text-[10px] text-muted-foreground font-normal leading-snug pb-2 truncate max-w-[160px]" title={tema}>
                              {tema}
                            </p>
                          )}
                          {isMergedCol && (
                            <p className="text-[10px] text-muted-foreground font-normal leading-snug pb-2">
                              Aulas ministradas juntas
                            </p>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {tabelaView.linhas.map((linha) => {
                    const rowBase = linha.isProxima
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : linha.is2nd
                      ? 'bg-amber-50/40 dark:bg-amber-950/10'
                      : 'hover:bg-muted/20'
                    return (
                      <tr
                        key={linha.data}
                        className={`border-b last:border-0 transition-colors ${rowBase} ${!linha.temEscala ? 'opacity-40' : ''}`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-3 py-2.5 text-center border-r">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              linha.isProxima ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {linha.aula}
                            </span>
                            {linha.is2nd && (
                              <span className="text-[9px] text-amber-500 font-bold leading-none">★</span>
                            )}
                          </div>
                        </td>
                        <td className="sticky left-12 z-10 bg-inherit px-3 py-2.5 whitespace-nowrap border-r">
                          <span className={`text-xs font-medium ${linha.isProxima ? 'text-primary' : ''}`}>
                            {fmtDataCurta(linha.data)}
                          </span>
                        </td>
                        {linha.celulas.map(c => (
                          <td key={c.turmaId} className="px-4 py-2.5">
                            {c.isMerged ? (
                              c.professor ? (
                                <div className="flex items-center justify-between gap-1 group">
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-xs truncate max-w-[110px] ${c.destacado ? 'text-primary font-semibold' : ''}`}>
                                      {c.professor}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-500 italic">
                                      <Link2 className="h-2.5 w-2.5 flex-shrink-0" />{c.unidaComNome}
                                    </span>
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
                                        turmaId: c.turmaId, professorId: '', observacao: '',
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
                                <span className={`text-xs truncate max-w-[120px] ${c.destacado ? 'text-primary font-semibold' : ''}`}>
                                  {c.professor}
                                </span>
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
                              <span className="text-xs text-muted-foreground/30">—</span>
                            )}
                          </td>
                        ))}
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
                        {is2nd && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-400 text-amber-600 dark:text-amber-400 gap-1">
                            <Users className="h-2.5 w-2.5" />
                            Turmas unidas
                          </Badge>
                        )}
                        {!is2nd && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {escalas.length} turma{escalas.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {/* Professores resumidos (quando recolhido) */}
                      {!isExpanded && (
                        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
                          {escalas.slice(0, 5).map(e => (
                            <span key={e.id} className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${getTurmaCor(e.turmaId)}`} />
                              {getProfNome(e.professorId)}
                            </span>
                          ))}
                          {escalas.length > 5 && (
                            <span className="text-[11px] text-muted-foreground">+{escalas.length - 5}</span>
                          )}
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
                        const temaLicao     = getLicaoTema(turmaNome, filtroAno, parseInt(filtroTrim), aulaNum)
                        const temaRev       = getTemaRevista(turmaNome, filtroAno, parseInt(filtroTrim))
                        const isProfDestac  = filtroProf !== 'todos' && escala.professorId === filtroProf
                        return (
                          <div key={escala.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ${isProfDestac ? 'bg-primary/5' : ''}`}>
                            {/* Faixa da turma */}
                            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${turmaCor}`} />

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{turmaNome}</p>
                              {temaLicao ? (
                                <p className="text-[11px] text-muted-foreground truncate">
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

      {/* ── Dialog Sugestão de Escala ──────────────────────────────────────── */}
      <Dialog open={sugestaoOpen} onOpenChange={setSugestaoOpen}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Sugestão de Escala — {TRIMESTRES_SHORT[parseInt(filtroTrim) - 1]} {filtroAno}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  {sugestaoEntradas.filter(e => e.professorId !== '').length} atribuições geradas · clique em qualquer célula para ajustar o professor.
                  {Object.keys(salasUnidasConfig).length > 0 && ` · ${Object.keys(salasUnidasConfig).length} sala(s) unida(s).`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Legenda das restrições */}
          <div className="px-5 py-2 bg-muted/30 border-b flex-shrink-0 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />Viviana / Livys: somente aulas pares</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Eder / Heldem / Leandro: sem 2º domingo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Leandro: 1 aula no Dynamo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Sem domingos consecutivos</span>
          </div>

          {/* Tabela da sugestão */}
          <div className="overflow-auto flex-1">
            {(() => {
              const domingos = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno))
              const turmasGen = [...turmasData]
                .sort((a, b) => ordemTurma(a.nome) - ordemTurma(b.nome))

              return (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card border-b">
                    <tr>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-10 border-r">L#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-14 border-r">Data</th>
                      {turmasGen.map(t => (
                        <th key={t.id} className={`px-3 py-0 text-left font-semibold min-w-[140px] ${turmasUnidasIds.has(t.id) ? 'opacity-60' : ''}`}>
                          <div className={`h-1 -mx-3 mb-1.5 ${t.cor}`} />
                          <div className="flex items-center gap-1 pb-1.5 flex-wrap">
                            <span className="text-[11px] font-bold">{t.nome}</span>
                            {turmasUnidasIds.has(t.id) && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1 rounded-full flex items-center gap-0.5">
                                <Link2 className="h-2 w-2" />Unida c/ {getTurmaNome(salasUnidasConfig[t.id] ?? '')}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {domingos.map(dom => {
                      const is2nd = is2ndSunday(dom.data)
                      const isProx = dom.data === proximaData
                      return (
                        <tr
                          key={dom.data}
                          className={`border-b last:border-0 ${
                            isProx ? 'bg-primary/5' : is2nd ? 'bg-amber-50/40 dark:bg-amber-950/10' : 'hover:bg-muted/20'
                          }`}
                        >
                          <td className="px-3 py-2 text-center border-r">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              isProx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>{dom.aula}</span>
                            {is2nd && <div className="text-[9px] text-amber-500 font-bold text-center leading-none mt-0.5">★</div>}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium border-r whitespace-nowrap">
                            {fmtDataCurta(dom.data)}
                          </td>
                          {turmasGen.map(t => {
                            if (turmasUnidasIds.has(t.id)) {
                              const unidaNome = getTurmaNome(salasUnidasConfig[t.id] ?? '')
                              return (
                                <td key={t.id} className="px-3 py-2">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 italic">
                                    <Link2 className="h-3 w-3 flex-shrink-0" />{unidaNome || 'Unida'}
                                  </span>
                                </td>
                              )
                            }
                            const entrada = sugestaoEntradas.find(e => e.data === dom.data && e.turmaId === t.id)
                            const pool = profTurmasMap[t.id] ?? []
                            return (
                              <td key={t.id} className="px-2 py-1.5">
                                <select
                                  value={entrada?.professorId ?? ''}
                                  onChange={e => updateSugestaoCell(dom.data, t.id, e.target.value)}
                                  className="text-xs w-full min-w-[110px] rounded border border-input bg-background px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                  <option value="">— sem professor</option>
                                  {pool.map(pid => (
                                    <option key={pid} value={pid}>{getProfNome(pid)}</option>
                                  ))}
                                </select>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}
          </div>

          <div className="px-5 py-3 border-t flex-shrink-0 flex justify-between items-center gap-3 bg-card">
            <p className="text-xs text-muted-foreground">
              ★ 2º domingo do mês · use os selects para ajustar professores antes de salvar
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSugestaoOpen(false)}>Fechar</Button>
              <Button onClick={salvarSugestao} disabled={isSalvandoSugestao || sugestaoEntradas.filter(e => e.professorId !== '').length === 0}>
                <Save className="h-4 w-4 mr-2" />
                {isSalvandoSugestao ? 'Salvando...' : `Salvar ${sugestaoEntradas.filter(e => e.professorId !== '').length} escalas`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Nova / Editar Escala ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Escala' : 'Nova Escala'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Atualize a escala selecionada.' : 'Defina o domingo, turma e professor.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Seletor de Aula */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />Domingo / Aula
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ano</Label>
                  <Select value={formData.ano} onValueChange={v => setFormData({ ...formData, ano: v, aulaIdx: '1' })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ANOS_DISPONIVEIS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Trimestre</Label>
                  <Select value={formData.trimestre} onValueChange={v => setFormData({ ...formData, trimestre: v, aulaIdx: '1' })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIMESTRES_LABEL.map((t, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{TRIMESTRES_SHORT[i]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Aula</Label>
                <Select value={formData.aulaIdx} onValueChange={v => setFormData({ ...formData, aulaIdx: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {domingosTrimForm.map(d => (
                      <SelectItem key={d.aula} value={String(d.aula)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dataComputada && (
                <p className="text-xs text-muted-foreground capitalize">
                  {fmtDataLonga(dataComputada)} de {new Date(dataComputada + 'T12:00:00').getFullYear()}
                </p>
              )}
            </div>

            {/* Turma */}
            <div className="space-y-1.5">
              <Label className="text-sm">Turma *</Label>
              <Select value={formData.turmaId} onValueChange={v => setFormData({ ...formData, turmaId: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>
                  {turmasOrdenadas.map(t => {
                    const tema = getTemaRevista(t.nome, formData.ano, parseInt(formData.trimestre))
                    return (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.cor}`} />
                          <span>{t.nome}</span>
                          {tema && <span className="text-muted-foreground text-xs truncate max-w-[120px]">— {tema}</span>}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {formData.turmaId && (() => {
                const nome = getTurmaNome(formData.turmaId)
                const aulaNum   = parseInt(formData.aulaIdx)
                const temaLicao = getLicaoTema(nome, formData.ano, parseInt(formData.trimestre), aulaNum)
                const temaRev   = getTemaRevista(nome, formData.ano, parseInt(formData.trimestre))
                return (temaLicao || temaRev) ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                    {temaLicao ? `Lição ${aulaNum}: ${temaLicao}` : temaRev}
                  </p>
                ) : null
              })()}
            </div>

            {/* Professor */}
            <div className="space-y-1.5">
              <Label className="text-sm">Professor *</Label>
              <Select value={formData.professorId} onValueChange={v => setFormData({ ...formData, professorId: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o professor" /></SelectTrigger>
                <SelectContent>
                  {professoresData.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-sm">Observações</Label>
              <Input
                value={formData.observacao}
                onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Alguma observação sobre esta aula..."
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={fecharDialog} disabled={isSaving}>Cancelar</Button>
            <Button onClick={salvarEscala} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editMode ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* ── Dialog Configurar Salas Unidas ─────────────────────────────────── */}
      <Dialog open={salasUnidasDialogOpen} onOpenChange={setSalasUnidasDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Configurar Salas Unidas
            </DialogTitle>
            <DialogDescription>
              Turmas marcadas como unidas aparecem na tabela mas não recebem professor próprio — são ministradas junto com outra sala.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-[400px] overflow-y-auto">
            {turmasOrdenadas.map(t => {
              const valorAtual = salasUnidasConfig[t.id] ?? ''
              return (
                <div key={t.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/30">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${t.cor}`} />
                  <span className="text-sm flex-1 font-medium">{t.nome}</span>
                  <Select
                    value={valorAtual}
                    onValueChange={v => {
                      const nova = { ...salasUnidasConfig }
                      if (v === '') { delete nova[t.id] } else { nova[t.id] = v }
                      salvarSalasUnidas(nova)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[170px] text-xs">
                      <SelectValue placeholder="Não unida" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não unida</SelectItem>
                      {turmasOrdenadas.filter(ot => ot.id !== t.id).map(ot => (
                        <SelectItem key={ot.id} value={ot.id}>
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full inline-block ${ot.cor}`} />
                            {ot.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setSalasUnidasDialogOpen(false)}>Fechar</Button>
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

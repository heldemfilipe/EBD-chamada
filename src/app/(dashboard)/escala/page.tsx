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
  // Salas unidas per-aula: chave = "${turmaId}::${data}", valor = turmaId com quem está unida
  const [salasUnidasConfig, setSalasUnidasConfig] = useState<Record<string, string>>({})

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
  const filhasDoReiId = useMemo(
    () => turmasData.find(t => ordemTurma(t.nome) === 4)?.id ?? null,
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
                      return (
                        <th key={t.id} className="px-4 py-0 text-left font-semibold min-w-[150px]">
                          <div className={`h-1 -mx-4 mb-2 ${t.cor}`} />
                          <div className="flex items-center gap-1 mb-0.5 group/col">
                            <span className="text-xs font-bold flex-1">{t.nome}</span>
                            <button
                              onClick={() => { setExcluirTurmaId(t.id); setExcluirTurmaDialogOpen(true) }}
                              className="opacity-0 group-hover/col:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                              title={`Remover todas as escalas de ${t.nome}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {tema && (
                            <p className="text-[10px] text-muted-foreground font-normal leading-snug pb-2 truncate max-w-[160px]" title={tema}>
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
                    const rowBase = linha.isProxima
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : linha.is2nd
                      ? 'bg-amber-50/40 dark:bg-amber-950/10'
                      : 'hover:bg-muted/20'
                    // Sticky cells precisam de background sólido para não "vazar" conteúdo
                    const stickyBg = linha.isProxima
                      ? 'bg-primary/5'
                      : linha.is2nd
                      ? 'bg-amber-50/40 dark:bg-amber-950/10'
                      : 'bg-card'
                    return (
                      <tr
                        key={linha.data}
                        className={`border-b last:border-0 transition-colors ${rowBase} ${!linha.temEscala ? 'opacity-40' : ''}`}
                      >
                        <td
                          className="sticky left-0 z-10 w-12 px-3 py-2.5 text-center border-r"
                          style={{ background: 'hsl(var(--card))' }}
                        >
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
                        <td
                          className="sticky left-12 z-10 px-3 py-2.5 whitespace-nowrap border-r"
                          style={{ background: 'hsl(var(--card))' }}
                        >
                          <span className={`text-xs font-medium ${linha.isProxima ? 'text-primary' : ''}`}>
                            {fmtDataCurta(linha.data)}
                          </span>
                        </td>
                        {linha.celulas.map(c => {
                          const temaLicao = c.professor
                            ? getLicaoTema(getTurmaNome(c.turmaId), filtroAno, parseInt(filtroTrim), linha.aula)
                            : null
                          return (
                          <td key={c.turmaId} className="px-4 py-2">
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
                                    {temaLicao && (
                                      <span className="text-[10px] text-muted-foreground/60 truncate max-w-[110px]" title={temaLicao}>
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
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-xs truncate max-w-[120px] ${c.destacado ? 'text-primary font-semibold' : ''}`}>
                                    {c.professor}
                                  </span>
                                  {temaLicao && (
                                    <span className="text-[10px] text-muted-foreground/60 truncate max-w-[130px]" title={temaLicao}>
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
                              <span className="text-xs text-muted-foreground/30">—</span>
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
                        <th key={t.id} className="px-3 py-0 text-left font-semibold min-w-[140px]">
                          <div className={`h-1 -mx-3 mb-1.5 ${t.cor}`} />
                          <div className="flex items-center gap-1 pb-1.5 flex-wrap">
                            <span className="text-[11px] font-bold">{t.nome}</span>
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
                            const unidaNomeSug = unidaComNomeEmData(t.id, dom.data)
                            if (unidaNomeSug) {
                              return (
                                <td key={t.id} className="px-3 py-2">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 italic">
                                    <Link2 className="h-3 w-3 flex-shrink-0" />{unidaNomeSug}
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
                const nome      = getTurmaNome(formData.turmaId)
                const aulaNum   = parseInt(formData.aulaIdx)
                const temaLicao = getLicaoTema(nome, formData.ano, parseInt(formData.trimestre), aulaNum)
                const temaRev   = getTemaRevista(nome, formData.ano, parseInt(formData.trimestre))
                return (temaLicao || temaRev) ? (
                  <div className="rounded-md bg-muted/40 border px-3 py-2 mt-1.5 flex items-start gap-2">
                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0">
                      {temaLicao && (
                        <p className="text-xs font-medium leading-snug">{temaLicao}</p>
                      )}
                      {temaRev && (
                        <p className="text-[11px] text-muted-foreground leading-snug">{temaRev}</p>
                      )}
                    </div>
                  </div>
                ) : null
              })()}
            </div>

            {/* Sala Unida — configurado por aula específica */}
            {formData.turmaId && dataComputada && (() => {
              const chave        = unidaChave(formData.turmaId, dataComputada)
              const isUnidaAtual = chave in salasUnidasConfig
              const unidaComId   = salasUnidasConfig[chave] ?? ''
              const outrasTurmas = turmasOrdenadas.filter(t => t.id !== formData.turmaId)
              return (
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />Sala unida nesta aula
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...salasUnidasConfig }
                        if (isUnidaAtual) {
                          delete next[chave]
                        } else {
                          next[chave] = outrasTurmas[0]?.id ?? ''
                        }
                        salvarSalasUnidas(next)
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        isUnidaAtual ? 'bg-amber-500' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${
                        isUnidaAtual ? 'translate-x-4' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  {isUnidaAtual && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Unida com:</p>
                      <Select
                        value={unidaComId}
                        onValueChange={v => salvarSalasUnidas({ ...salasUnidasConfig, [chave]: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecione a turma" />
                        </SelectTrigger>
                        <SelectContent>
                          {outrasTurmas.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${t.cor}`} />
                                {t.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )
            })()}

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

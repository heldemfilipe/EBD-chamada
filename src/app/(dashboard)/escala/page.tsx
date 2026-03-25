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
  ChevronDown, ChevronUp, User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ANOS_DISPONIVEIS, getTemaRevista } from '@/lib/constants'
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

const TRIMESTRES_LABEL = [
  '1º Trimestre (Jan–Mar)',
  '2º Trimestre (Abr–Jun)',
  '3º Trimestre (Jul–Set)',
  '4º Trimestre (Out–Dez)',
]

const TRIMESTRES_SHORT = ['1º Trim', '2º Trim', '3º Trim', '4º Trim']

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
  const [filtroAno,  setFiltroAno]  = useState(String(new Date().getFullYear()))
  const [filtroTrim, setFiltroTrim] = useState(String(Math.floor(new Date().getMonth() / 3) + 1))
  const [filtroProf, setFiltroProf] = useState('todos')
  const [viewMode,   setViewMode]   = useState<'tabela' | 'cards'>('tabela')

  // Dialog
  const [dialogOpen,       setDialogOpen]       = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode,         setEditMode]         = useState(false)
  const [selectedEscala,   setSelectedEscala]   = useState<Escala | null>(null)
  const [formData,         setFormData]         = useState(FORM_VAZIO)
  const [isSaving,         setIsSaving]         = useState(false)

  // Expanded rows no modo cards (mobile)
  const [expandedDatas, setExpandedDatas] = useState<Set<string>>(new Set())

  const domingosTrimForm = useMemo(
    () => getDomingosTrimestre(parseInt(formData.trimestre), parseInt(formData.ano)),
    [formData.trimestre, formData.ano]
  )
  const dataComputada = domingosTrimForm.find(d => d.aula === parseInt(formData.aulaIdx))?.data ?? ''

  // ── Carga inicial ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false
    async function load() {
      try {
        const [{ data: escalas }, { data: profs }, { data: turmas }] = await Promise.all([
          db.from('escalas').select('id, data, turma_id, professor_id, trimestre, observacoes').order('data'),
          db.from('professores').select('id, nome').eq('ativo', true).order('nome'),
          db.from('turmas').select('id, nome, cor').eq('ativa', true).order('nome'),
        ])
        if (cancelado) return
        setEscalasData((escalas ?? []).map((e: any) => ({
          id: e.id, data: e.data, turmaId: e.turma_id, professorId: e.professor_id,
          trimestre: e.trimestre ?? (Math.floor(new Date(e.data + 'T12:00:00').getMonth() / 3) + 1),
          observacao: e.observacoes ?? '',
        })))
        setProfessoresData(profs ?? [])
        setTurmasData(turmas ?? [])
      } catch (e: any) {
        if (!cancelado) toast('Erro ao carregar escala: ' + (e?.message ?? 'erro'), 'error')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    load()
    return () => { cancelado = true }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getProfNome  = (id: string) => professoresData.find(p => p.id === id)?.nome ?? '—'
  const getTurmaNome = (id: string) => turmasData.find(t => t.id === id)?.nome ?? '—'
  const getTurmaCor  = (id: string) => turmasData.find(t => t.id === id)?.cor ?? 'bg-gray-500'

  // ── Filtros ───────────────────────────────────────────────────────────────────
  const escalasFiltradas = useMemo(() => {
    let list = escalasData.filter(e =>
      e.data.startsWith(filtroAno) && e.trimestre === parseInt(filtroTrim)
    )
    if (filtroProf !== 'todos') list = list.filter(e => e.professorId === filtroProf)
    return list.sort((a, b) => a.data.localeCompare(b.data))
  }, [escalasData, filtroAno, filtroTrim, filtroProf])

  // ── Visão Tabela (L# × Turma) ─────────────────────────────────────────────────
  const tabelaView = useMemo(() => {
    const domingos = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno))
    const turmasNaEscala = turmasData.filter(t =>
      escalasData.some(e => e.turmaId === t.id && e.data.startsWith(filtroAno) && e.trimestre === parseInt(filtroTrim))
    )
    const linhas = domingos.map(dom => {
      const escalasNoDia = escalasData.filter(
        e => e.data === dom.data && e.data.startsWith(filtroAno) && e.trimestre === parseInt(filtroTrim)
      )
      return {
        aula: dom.aula,
        data: dom.data,
        temEscala: escalasNoDia.length > 0,
        celulas: turmasNaEscala.map(t => {
          const e = escalasNoDia.find(es => es.turmaId === t.id)
          return {
            turmaId: t.id,
            escala: e ?? null,
            professor: e ? getProfNome(e.professorId) : null,
            destacado: filtroProf !== 'todos' && e?.professorId === filtroProf,
          }
        }),
      }
    })
    return { turmas: turmasNaEscala, linhas }
  }, [filtroTrim, filtroAno, turmasData, escalasData, filtroProf, professoresData])

  // ── Visão Cards (agrupado por data) ───────────────────────────────────────────
  const cardsView = useMemo(() => {
    const map: Record<string, { aulaInfo: ReturnType<typeof getAulaInfo>; escalas: Escala[] }> = {}
    for (const e of escalasFiltradas) {
      if (!map[e.data]) map[e.data] = { aulaInfo: getAulaInfo(e.data), escalas: [] }
      map[e.data].escalas.push(e)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [escalasFiltradas])

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
    try {
      const trimestre = parseInt(formData.trimestre)
      if (editMode && selectedEscala) {
        const { error } = await db.from('escalas').update({
          data: dataComputada, turma_id: formData.turmaId,
          professor_id: formData.professorId, trimestre, observacoes: formData.observacao,
        }).eq('id', selectedEscala.id)
        if (error) { toast('Erro ao atualizar escala.', 'error'); return }
        setEscalasData(prev => prev.map(e =>
          e.id === selectedEscala.id
            ? { ...e, data: dataComputada, turmaId: formData.turmaId, professorId: formData.professorId, trimestre, observacao: formData.observacao }
            : e
        ))
        toast('Escala atualizada!')
      } else {
        const { data, error } = await db.from('escalas').insert({
          data: dataComputada, turma_id: formData.turmaId,
          professor_id: formData.professorId, trimestre, observacoes: formData.observacao,
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
    if (!selectedEscala) return
    const { error } = await db.from('escalas').delete().eq('id', selectedEscala.id)
    if (error) { toast('Erro ao excluir.', 'error'); return }
    setEscalasData(prev => prev.filter(e => e.id !== selectedEscala.id))
    toast('Escala excluída.')
    setDeleteDialogOpen(false); setSelectedEscala(null)
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (carregando) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-12 w-full bg-muted rounded-xl" />
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
          </p>
        </div>
        <Button onClick={() => abrirDialog()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />Nova Escala
        </Button>
      </div>

      {/* ── Barra de Filtros ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-end p-3 rounded-xl border bg-card">
        {/* Ano */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="h-8 w-[80px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANOS_DISPONIVEIS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Trimestre */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Trimestre</Label>
          <Select value={filtroTrim} onValueChange={setFiltroTrim}>
            <SelectTrigger className="h-8 w-[170px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIMESTRES_SHORT.map((t, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{TRIMESTRES_LABEL[i]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Professor */}
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

        {/* Toggle de visualização */}
        <div className="ml-auto flex gap-1 border rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('tabela')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'tabela' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
            title="Visualização em tabela"
          >
            <Table2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tabela</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
            title="Visualização em cards"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </button>
        </div>
      </div>

      {/* ── Visão Tabela ───────────────────────────────────────────────────── */}
      {viewMode === 'tabela' && (
        tabelaView.turmas.length === 0 ? (
          <EmptyEscala onNova={() => abrirDialog()} />
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="sticky left-0 z-20 bg-muted/80 px-3 py-3 text-center font-semibold text-muted-foreground w-10 text-xs">
                      L#
                    </th>
                    <th className="sticky left-10 z-20 bg-muted/80 px-3 py-3 text-left font-semibold whitespace-nowrap text-xs w-16">
                      Data
                    </th>
                    {tabelaView.turmas.map(t => {
                      const tema = getTemaRevista(t.nome, filtroAno, parseInt(filtroTrim))
                      return (
                        <th key={t.id} className="px-4 py-2 text-left font-semibold min-w-[140px]">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.cor}`} />
                            <span className="text-xs font-semibold">{t.nome}</span>
                          </div>
                          {tema && (
                            <p className="text-[10px] text-muted-foreground font-normal leading-tight truncate max-w-[160px]" title={tema}>
                              {tema}
                            </p>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {tabelaView.linhas.map((linha, idx) => (
                    <tr
                      key={linha.data}
                      className={`border-b last:border-0 transition-colors ${
                        linha.temEscala
                          ? idx % 2 === 0 ? 'bg-background hover:bg-muted/30' : 'bg-muted/10 hover:bg-muted/30'
                          : 'bg-muted/5 opacity-50'
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {linha.aula}
                        </span>
                      </td>
                      <td className="sticky left-10 z-10 bg-inherit px-3 py-2.5 whitespace-nowrap">
                        <span className="text-xs font-medium">
                          {new Date(linha.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </td>
                      {linha.celulas.map(c => (
                        <td key={c.turmaId} className="px-4 py-2.5">
                          {c.professor ? (
                            <div className="flex items-center justify-between gap-1 group">
                              <div className={`flex items-center gap-1.5 ${c.destacado ? 'text-primary font-semibold' : ''}`}>
                                <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs truncate max-w-[120px]">{c.professor}</span>
                              </div>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => c.escala && abrirDialog(c.escala)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => { if (c.escala) { setSelectedEscala(c.escala); setDeleteDialogOpen(true) } }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Visão Cards ────────────────────────────────────────────────────── */}
      {viewMode === 'cards' && (
        cardsView.length === 0 ? (
          <EmptyEscala onNova={() => abrirDialog()} />
        ) : (
          <div className="space-y-3">
            {cardsView.map(([data, { aulaInfo, escalas }]) => {
              const isExpanded = expandedDatas.has(data)
              const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'short', day: '2-digit', month: 'short',
              })
              return (
                <div key={data} className="rounded-xl border bg-card overflow-hidden">
                  {/* Header do dia */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpandedDatas(prev => {
                      const next = new Set(prev)
                      next.has(data) ? next.delete(data) : next.add(data)
                      return next
                    })}
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary flex-shrink-0">
                      <span className="text-sm font-bold">{aulaInfo?.aula ?? '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold capitalize text-sm">{dataFormatada}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {escalas.length} turma{escalas.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {/* Temas resumidos */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {turmasData
                          .filter(t => escalas.some(e => e.turmaId === t.id))
                          .slice(0, 3)
                          .map(t => {
                            const tema = getTemaRevista(t.nome, filtroAno, parseInt(filtroTrim))
                            return tema ? (
                              <span key={t.id} className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${t.cor} mr-1 align-middle`} />
                                {tema}
                              </span>
                            ) : null
                          })
                        }
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {/* Turmas expandidas */}
                  {isExpanded && (
                    <div className="border-t divide-y">
                      {escalas.map(escala => {
                        const tema = getTemaRevista(getTurmaNome(escala.turmaId), filtroAno, parseInt(filtroTrim))
                        const isProfDestacado = filtroProf !== 'todos' && escala.professorId === filtroProf
                        return (
                          <div key={escala.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getTurmaCor(escala.turmaId)}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{getTurmaNome(escala.turmaId)}</p>
                              {tema && <p className="text-[11px] text-muted-foreground truncate">{tema}</p>}
                              <div className={`flex items-center gap-1 mt-0.5 ${isProfDestacado ? 'text-primary' : 'text-muted-foreground'}`}>
                                <GraduationCap className="h-3 w-3 flex-shrink-0" />
                                <span className="text-xs">{getProfNome(escala.professorId)}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
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
                <p className="text-xs text-muted-foreground">
                  {new Date(dataComputada + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Turma */}
            <div className="space-y-1.5">
              <Label className="text-sm">Turma *</Label>
              <Select value={formData.turmaId} onValueChange={v => setFormData({ ...formData, turmaId: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>
                  {turmasData.map(t => {
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
              {/* Mostrar tema da turma selecionada */}
              {formData.turmaId && (() => {
                const nome = getTurmaNome(formData.turmaId)
                const tema = getTemaRevista(nome, formData.ano, parseInt(formData.trimestre))
                return tema ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                    {tema}
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
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={excluirEscala}>Excluir</Button>
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

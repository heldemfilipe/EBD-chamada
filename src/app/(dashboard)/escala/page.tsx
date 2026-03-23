"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar, Filter, Plus, Edit, Trash2, GraduationCap, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ANOS_DISPONIVEIS } from '@/lib/constants'
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
/** Retorna todos os domingos de um trimestre: [{ aula, data (ISO), label }] */
function getDomingosTrimestre(trimestre: number, ano: number) {
  const [mesInicio, mesFim] = [[0, 2], [3, 5], [6, 8], [9, 11]][trimestre - 1]
  const fim = new Date(ano, mesFim + 1, 0)      // último dia do último mês
  const cursor = new Date(ano, mesInicio, 1)
  while (cursor.getDay() !== 0) cursor.setDate(cursor.getDate() + 1) // primeiro domingo
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

/** Dado um ISO date, retorna { ano, trimestre, aula } ou null */
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

const FORM_VAZIO = {
  ano:       String(new Date().getFullYear()),
  trimestre: String(Math.floor(new Date().getMonth() / 3) + 1),
  aulaIdx:   '1',
  turmaId:   '',
  professorId: '',
  observacao: '',
}

type FiltroTipo = 'trimestre' | 'professor'

// ─── Componente ────────────────────────────────────────────────────────────────
export default function EscalaPage() {
  const db = supabase as any

  const [escalasData, setEscalasData]       = useState<Escala[]>([])
  const [professoresData, setProfessoresData] = useState<Professor[]>([])
  const [turmasData, setTurmasData]           = useState<Turma[]>([])

  // Filtros da lista
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('trimestre')
  const [filtroAno, setFiltroAno]   = useState(String(new Date().getFullYear()))
  const [filtroTrim, setFiltroTrim] = useState(String(Math.floor(new Date().getMonth() / 3) + 1))
  const [filtroProf, setFiltroProf] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen]           = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode, setEditMode]               = useState(false)
  const [selectedEscala, setSelectedEscala]   = useState<Escala | null>(null)
  const [formData, setFormData]               = useState(FORM_VAZIO)

  // Domingos disponíveis para o trimestre/ano do formulário
  const domingosTrimForm = useMemo(
    () => getDomingosTrimestre(parseInt(formData.trimestre), parseInt(formData.ano)),
    [formData.trimestre, formData.ano]
  )
  const dataComputada = domingosTrimForm.find(d => d.aula === parseInt(formData.aulaIdx))?.data ?? ''

  const [isSaving, setIsSaving] = useState(false)
  const [carregando, setCarregando] = useState(true)

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
        if (!cancelado) toast('Erro ao carregar escala: ' + (e?.message ?? 'erro inesperado'), 'error')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    load()
    return () => { cancelado = true }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getProfessorNome = (id: string) => professoresData.find(p => p.id === id)?.nome ?? 'Não definido'
  const getTurmaNome    = (id: string) => turmasData.find(t => t.id === id)?.nome ?? 'Não definida'
  const getTurmaCor     = (id: string) => turmasData.find(t => t.id === id)?.cor ?? 'bg-gray-500'

  // ── Filtros da lista ──────────────────────────────────────────────────────────
  const escalasFiltradas = useMemo(() => {
    let list = [...escalasData]
    if (filtroTipo === 'trimestre') {
      list = list.filter(e => e.data.startsWith(filtroAno) && e.trimestre === parseInt(filtroTrim))
    } else if (filtroTipo === 'professor' && filtroProf) {
      list = list.filter(e => e.professorId === filtroProf)
    }
    return list.sort((a, b) => a.data.localeCompare(b.data))
  }, [escalasData, filtroTipo, filtroAno, filtroTrim, filtroProf])

  const escalasAgrupadas = useMemo(() => {
    const map: Record<string, Escala[]> = {}
    for (const e of escalasFiltradas) {
      if (!map[e.data]) map[e.data] = []
      map[e.data].push(e)
    }
    return map
  }, [escalasFiltradas])

  // ── Dialog handlers ───────────────────────────────────────────────────────────
  function handleOpenDialog(escala?: Escala) {
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

  function handleCloseDialog() {
    setDialogOpen(false); setEditMode(false); setSelectedEscala(null); setFormData(FORM_VAZIO)
  }

  async function handleSaveEscala() {
    if (!dataComputada || !formData.turmaId || !formData.professorId) {
      toast('Preencha todos os campos obrigatórios (Aula, Turma e Professor).', 'error'); return
    }
    if (isSaving) return
    setIsSaving(true)
    try {
      const trimestre = parseInt(formData.trimestre)
      if (editMode && selectedEscala) {
        const { error } = await db.from('escalas').update({
          data: dataComputada, turma_id: formData.turmaId, professor_id: formData.professorId,
          trimestre, observacoes: formData.observacao,
        }).eq('id', selectedEscala.id)
        if (error) { toast('Erro ao atualizar escala.', 'error'); return }
        setEscalasData(escalasData.map(e =>
          e.id === selectedEscala.id
            ? { ...e, data: dataComputada, turmaId: formData.turmaId, professorId: formData.professorId, trimestre, observacao: formData.observacao }
            : e
        ))
        toast('Escala atualizada com sucesso!')
      } else {
        const { data, error } = await db.from('escalas').insert({
          data: dataComputada, turma_id: formData.turmaId, professor_id: formData.professorId,
          trimestre, observacoes: formData.observacao,
        }).select('id').single()
        if (error || !data) { toast('Erro ao cadastrar escala.', 'error'); return }
        setEscalasData([...escalasData, {
          id: data.id, data: dataComputada, turmaId: formData.turmaId,
          professorId: formData.professorId, trimestre, observacao: formData.observacao,
        }])
        toast('Escala cadastrada com sucesso!')
      }
      handleCloseDialog()
    } catch (e: any) {
      toast('Erro ao salvar escala: ' + (e?.message ?? 'erro inesperado'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteEscala() {
    if (!selectedEscala) return
    const { error } = await db.from('escalas').delete().eq('id', selectedEscala.id)
    if (error) { toast('Erro ao excluir escala.', 'error'); return }
    setEscalasData(escalasData.filter(e => e.id !== selectedEscala.id))
    toast('Escala excluída com sucesso!')
    setDeleteDialogOpen(false); setSelectedEscala(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (carregando) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-28 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-9 w-28 bg-muted animate-pulse rounded" />
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Escala de Professores</h1>
          <p className="text-muted-foreground mt-2">Gerencie a escala de professores por turma</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />Nova Escala
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Filter className="h-5 w-5" /><CardTitle>Filtros</CardTitle></div>
          <CardDescription>Selecione como deseja visualizar as escalas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['trimestre', 'professor'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroTipo(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filtroTipo === f
                    ? 'bg-primary text-primary-foreground'
                    : 'border text-muted-foreground hover:bg-muted'
                }`}
              >
                {f === 'trimestre' ? 'Por Trimestre' : 'Por Professor'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {filtroTipo === 'trimestre' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ano</Label>
                  <Select value={filtroAno} onValueChange={setFiltroAno}>
                    <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ANOS_DISPONIVEIS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trimestre</Label>
                  <Select value={filtroTrim} onValueChange={setFiltroTrim}>
                    <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIMESTRES_LABEL.map((t, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {filtroTipo === 'professor' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Professor</Label>
                <Select value={filtroProf} onValueChange={setFiltroProf}>
                  <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {professoresData.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Escalas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{escalasFiltradas.length}</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professores Escalados</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(escalasFiltradas.map(e => e.professorId)).size}</div>
            <p className="text-xs text-muted-foreground">Diferentes professores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas Atendidas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(escalasFiltradas.map(e => e.turmaId)).size}</div>
            <p className="text-xs text-muted-foreground">Turmas diferentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista agrupada por data */}
      <Card>
        <CardHeader>
          <CardTitle>Escalas Programadas</CardTitle>
          <CardDescription>{escalasFiltradas.length} escala(s) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {escalasFiltradas.length > 0 ? (
            <div className="space-y-6">
              {Object.keys(escalasAgrupadas).map(data => {
                const aulaInfo = getAulaInfo(data)
                return (
                  <div key={data} className="space-y-3">
                    {/* Cabeçalho do domingo */}
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">
                        {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </h3>
                      {aulaInfo && (
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {TRIMESTRES_LABEL[aulaInfo.trimestre - 1].split(' ').slice(0, 2).join(' ')} — Aula {aulaInfo.aula}
                        </Badge>
                      )}
                      <Badge variant="outline">{escalasAgrupadas[data].length} turma(s)</Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {escalasAgrupadas[data].map(escala => (
                        <div key={escala.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getTurmaCor(escala.turmaId)}`} />
                              <div>
                                <p className="font-semibold">{getTurmaNome(escala.turmaId)}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <GraduationCap className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">{getProfessorNome(escala.professorId)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(escala)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedEscala(escala); setDeleteDialogOpen(true) }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          {escala.observacao && (
                            <div className="p-2 bg-muted/50 rounded text-sm">
                              <p className="text-muted-foreground">{escala.observacao}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma escala encontrada</h3>
              <p className="text-muted-foreground mb-4">Não há escalas para os filtros selecionados</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />Criar Nova Escala
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nova/Editar Escala */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Escala' : 'Nova Escala'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Atualize as informações da escala.' : 'Selecione a aula, turma e professor.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Seletor de Aula */}
            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />Aula / Domingo
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ano</Label>
                  <Select value={formData.ano} onValueChange={v => setFormData({ ...formData, ano: v, aulaIdx: '1' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ANOS_DISPONIVEIS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trimestre</Label>
                  <Select value={formData.trimestre} onValueChange={v => setFormData({ ...formData, trimestre: v, aulaIdx: '1' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIMESTRES_LABEL.map((t, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Aula</Label>
                <Select value={formData.aulaIdx} onValueChange={v => setFormData({ ...formData, aulaIdx: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {domingosTrimForm.map(d => (
                      <SelectItem key={d.aula} value={String(d.aula)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dataComputada && (
                <p className="text-xs text-muted-foreground">
                  Domingo selecionado: {new Date(dataComputada + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="turma">Turma *</Label>
              <Select value={formData.turmaId} onValueChange={v => setFormData({ ...formData, turmaId: v })}>
                <SelectTrigger id="turma"><SelectValue placeholder="Selecione uma turma" /></SelectTrigger>
                <SelectContent>
                  {turmasData.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${t.cor}`} />{t.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="professor">Professor *</Label>
              <Select value={formData.professorId} onValueChange={v => setFormData({ ...formData, professorId: v })}>
                <SelectTrigger id="professor"><SelectValue placeholder="Selecione um professor" /></SelectTrigger>
                <SelectContent>
                  {professoresData.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observacao">Observações</Label>
              <Input
                id="observacao"
                value={formData.observacao}
                onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Ex: Lição 7 — Fé e Obras"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSaveEscala} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editMode ? 'Salvar Alterações' : 'Cadastrar Escala'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta escala? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteEscala}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

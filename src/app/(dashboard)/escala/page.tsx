"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Filter, Plus, Edit, Trash2, GraduationCap, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast';

interface Escala {
  id: string
  data: string
  turmaId: string
  professorId: string
  trimestre: number
  observacao: string
}

interface Professor {
  id: string
  nome: string
}

interface Turma {
  id: string
  nome: string
  cor: string
}

type FiltroTipo = 'ano' | 'trimestre' | 'data' | 'professor'

export default function EscalaPage() {
  const [escalasData, setEscalasData] = useState<Escala[]>([])
  const [professoresData, setProfessoresData] = useState<Professor[]>([])
  const [turmasData, setTurmasData] = useState<Turma[]>([])
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('trimestre')
  const [anoSelecionado, setAnoSelecionado] = useState('2026')
  const [trimestreSelecionado, setTrimestreSelecionado] = useState('1')
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [professorSelecionado, setProfessorSelecionado] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null)
  const [formData, setFormData] = useState({
    data: '',
    turmaId: '',
    professorId: '',
    observacao: ''
  })

  useEffect(() => {
    async function fetchEscalas() {
      const db = supabase as any
      const { data } = await db
        .from('escalas')
        .select('id, data, turma_id, professor_id, trimestre, observacoes')
        .order('data') as { data: { id: string; data: string; turma_id: string; professor_id: string; trimestre: number | null; observacoes: string | null }[] | null }
      if (data) {
        setEscalasData(data.map(e => ({
          id: e.id,
          data: e.data,
          turmaId: e.turma_id,
          professorId: e.professor_id,
          trimestre: e.trimestre ?? calcularTrimestre(e.data),
          observacao: e.observacoes ?? '',
        })))
      }
    }
    fetchEscalas()
  }, [])

  useEffect(() => {
    async function fetchProfessores() {
      const db = supabase as any
      const { data } = await db.from('professores').select('id, nome').eq('ativo', true).order('nome') as { data: { id: string; nome: string }[] | null }
      setProfessoresData(data ?? [])
    }
    fetchProfessores()
  }, [])

  useEffect(() => {
    async function fetchTurmas() {
      const db = supabase as any
      const { data } = await db.from('turmas').select('id, nome, cor').eq('ativa', true).order('nome') as { data: { id: string; nome: string; cor: string }[] | null }
      setTurmasData(data ?? [])
    }
    fetchTurmas()
  }, [])

  const getProfessorNome = (id: string) => {
    return professoresData.find(p => p.id === id)?.nome || 'Não definido'
  }

  const getTurmaNome = (id: string) => {
    return turmasData.find(t => t.id === id)?.nome || 'Não definida'
  }

  const getTurmaCor = (id: string) => {
    return turmasData.find(t => t.id === id)?.cor || 'bg-gray-500'
  }

  const calcularTrimestre = (data: string) => {
    const mes = new Date(data).getMonth() + 1
    if (mes <= 3) return 1
    if (mes <= 6) return 2
    if (mes <= 9) return 3
    return 4
  }

  const filtrarEscalas = () => {
    let escalas = [...escalasData]
    switch (filtroTipo) {
      case 'ano':
        escalas = escalas.filter(e => e.data.startsWith(anoSelecionado))
        break
      case 'trimestre':
        escalas = escalas.filter(e => e.data.startsWith(anoSelecionado) && e.trimestre === parseInt(trimestreSelecionado))
        break
      case 'data':
        if (dataSelecionada) escalas = escalas.filter(e => e.data === dataSelecionada)
        break
      case 'professor':
        if (professorSelecionado) escalas = escalas.filter(e => e.professorId === professorSelecionado)
        break
    }
    return escalas.sort((a, b) => a.data.localeCompare(b.data))
  }

  const escalasFiltradas = filtrarEscalas()

  // Agrupar escalas por data
  const escalasAgrupadas = escalasFiltradas.reduce((acc, escala) => {
    const data = escala.data
    if (!acc[data]) {
      acc[data] = []
    }
    acc[data].push(escala)
    return acc
  }, {} as Record<string, typeof escalasData>)

  const handleOpenDialog = (escala?: Escala) => {
    if (escala) {
      setEditMode(true)
      setSelectedEscala(escala)
      setFormData({
        data: escala.data,
        turmaId: escala.turmaId.toString(),
        professorId: escala.professorId.toString(),
        observacao: escala.observacao
      })
    } else {
      setEditMode(false)
      setSelectedEscala(null)
      setFormData({
        data: '',
        turmaId: '',
        professorId: '',
        observacao: ''
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setSelectedEscala(null)
    setFormData({
      data: '',
      turmaId: '',
      professorId: '',
      observacao: ''
    })
  }

  const handleSaveEscala = async () => {
    if (!formData.data || !formData.turmaId || !formData.professorId) {
      toast('Preencha todos os campos obrigatórios (Data, Turma e Professor).', 'error')
      return
    }
    const trimestre = calcularTrimestre(formData.data)

    const db = supabase as any
    if (editMode && selectedEscala) {
      const { error } = await db.from('escalas').update({
        data: formData.data,
        turma_id: formData.turmaId,
        professor_id: formData.professorId,
        observacoes: formData.observacao,
      }).eq('id', selectedEscala.id)
      if (error) { toast('Erro ao atualizar escala.', 'error'); return }
      setEscalasData(escalasData.map(e =>
        e.id === selectedEscala.id
          ? { ...e, data: formData.data, turmaId: formData.turmaId, professorId: formData.professorId, trimestre, observacao: formData.observacao }
          : e
      ))
      toast('Escala atualizada com sucesso!')
    } else {
      const { data, error } = await db.from('escalas').insert({
        data: formData.data,
        turma_id: formData.turmaId,
        professor_id: formData.professorId,
        observacoes: formData.observacao,
      }).select('id').single()
      if (error || !data) { toast('Erro ao cadastrar escala.', 'error'); return }
      setEscalasData([...escalasData, { id: data.id, data: formData.data, turmaId: formData.turmaId, professorId: formData.professorId, trimestre, observacao: formData.observacao }])
      toast('Escala cadastrada com sucesso!')
    }
    handleCloseDialog()
  }

  const handleOpenDeleteDialog = (escala: Escala) => {
    setSelectedEscala(escala)
    setDeleteDialogOpen(true)
  }

  const handleDeleteEscala = async () => {
    if (selectedEscala) {
      const db = supabase as any
      const { error } = await db.from('escalas').delete().eq('id', selectedEscala.id)
      if (error) { toast('Erro ao excluir escala.', 'error'); return }
      setEscalasData(escalasData.filter(e => e.id !== selectedEscala.id))
      toast('Escala excluída com sucesso!')
      setDeleteDialogOpen(false)
      setSelectedEscala(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Escala de Professores</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie a escala de professores por turma
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Escala
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filtros</CardTitle>
          </div>
          <CardDescription>
            Selecione como deseja visualizar as escalas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de Filtro */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant={filtroTipo === 'ano' ? 'default' : 'outline'}
              onClick={() => setFiltroTipo('ano')}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Por Ano
            </Button>
            <Button
              variant={filtroTipo === 'trimestre' ? 'default' : 'outline'}
              onClick={() => setFiltroTipo('trimestre')}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Por Trimestre
            </Button>
            <Button
              variant={filtroTipo === 'data' ? 'default' : 'outline'}
              onClick={() => setFiltroTipo('data')}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Data Específica
            </Button>
            <Button
              variant={filtroTipo === 'professor' ? 'default' : 'outline'}
              onClick={() => setFiltroTipo('professor')}
              className="w-full"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Por Professor
            </Button>
          </div>

          {/* Opções de Filtro */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtroTipo === 'ano' && (
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {filtroTipo === 'trimestre' && (
              <>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trimestre</Label>
                  <Select value={trimestreSelecionado} onValueChange={setTrimestreSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1º Trimestre (Jan-Mar)</SelectItem>
                      <SelectItem value="2">2º Trimestre (Abr-Jun)</SelectItem>
                      <SelectItem value="3">3º Trimestre (Jul-Set)</SelectItem>
                      <SelectItem value="4">4º Trimestre (Out-Dez)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {filtroTipo === 'data' && (
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                />
              </div>
            )}

            {filtroTipo === 'professor' && (
              <div className="space-y-2">
                <Label>Professor</Label>
                <Select value={professorSelecionado} onValueChange={setProfessorSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {professoresData.map(professor => (
                      <SelectItem key={professor.id} value={professor.id}>
                        {professor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
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
            <div className="text-2xl font-bold">
              {new Set(escalasFiltradas.map(e => e.professorId)).size}
            </div>
            <p className="text-xs text-muted-foreground">Diferentes professores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas Atendidas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(escalasFiltradas.map(e => e.turmaId)).size}
            </div>
            <p className="text-xs text-muted-foreground">Turmas diferentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Escalas */}
      <Card>
        <CardHeader>
          <CardTitle>Escalas Programadas</CardTitle>
          <CardDescription>
            {escalasFiltradas.length} escala(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {escalasFiltradas.length > 0 ? (
            <div className="space-y-6">
              {Object.keys(escalasAgrupadas).map(data => (
                <div key={data} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">
                      {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <Badge variant="outline">
                      {escalasAgrupadas[data].length} turma(s)
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {escalasAgrupadas[data].map(escala => (
                      <div
                        key={escala.id}
                        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getTurmaCor(escala.turmaId)}`} />
                            <div>
                              <p className="font-semibold">{getTurmaNome(escala.turmaId)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <GraduationCap className="h-3 w-3 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  {getProfessorNome(escala.professorId)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(escala)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(escala)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {escala.observacao && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                            <p className="text-muted-foreground">{escala.observacao}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma escala encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Não há escalas programadas para os filtros selecionados
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Nova Escala
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Adicionar/Editar Escala */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Escala' : 'Nova Escala'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Atualize as informações da escala abaixo.' : 'Preencha os dados da nova escala.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="turma">Turma *</Label>
              <Select value={formData.turmaId} onValueChange={(value) => setFormData({ ...formData, turmaId: value })}>
                <SelectTrigger id="turma">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmasData.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${turma.cor}`} />
                        {turma.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="professor">Professor *</Label>
              <Select value={formData.professorId} onValueChange={(value) => setFormData({ ...formData, professorId: value })}>
                <SelectTrigger id="professor">
                  <SelectValue placeholder="Selecione um professor" />
                </SelectTrigger>
                <SelectContent>
                  {professoresData.map((professor) => (
                    <SelectItem key={professor.id} value={professor.id}>
                      {professor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observacao">Observações</Label>
              <Input
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Ex: Lição 7 - Fé e Obras"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEscala}>
              {editMode ? 'Salvar Alterações' : 'Cadastrar Escala'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta escala?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteEscala}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

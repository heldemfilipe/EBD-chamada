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
import { Plus, Users, GraduationCap, Edit, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Turma {
  id: string
  nome: string
  faixaEtaria: string
  totalAlunos: number
  sala: string
  cor: string
  descricao: string
}

interface Professor {
  id: string
  nome: string
  professor_turmas: { turma_id: string }[]
}

// Constantes estáticas — cores disponíveis para identificação visual
const coresDisponiveis = [
  { value: 'bg-yellow-500', label: 'Amarelo' },
  { value: 'bg-orange-500', label: 'Laranja' },
  { value: 'bg-blue-500', label: 'Azul' },
  { value: 'bg-purple-500', label: 'Roxo' },
  { value: 'bg-green-500', label: 'Verde' },
  { value: 'bg-teal-500', label: 'Verde-azulado' },
  { value: 'bg-red-500', label: 'Vermelho' },
  { value: 'bg-pink-500', label: 'Rosa' },
]

// Faixas etárias pré-definidas da EBD
const faixasEtarias = [
  { value: 'Até 5 anos',       label: 'Cordeirinhos de Cristo — Até 5 anos' },
  { value: '6 a 11 anos',      label: 'Guerreiros de Cristo — 6 a 11 anos' },
  { value: '11 a 15 anos',     label: 'Adolescentes — 11 a 15 anos' },
  { value: 'A partir de 16 anos', label: 'Jovens — A partir de 16 anos' },
  { value: 'A partir de 18 anos', label: 'Adultos — A partir de 18 anos' },
]

export default function TurmasPage() {
  const [turmasData, setTurmasData] = useState<Turma[]>([])
  const [professoresMock, setProfessoresMock] = useState<Professor[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    faixaEtaria: '',
    sala: '',
    cor: 'bg-blue-500'
  })

  useEffect(() => {
    async function fetchTurmas() {
      const db = supabase as any
      const { data } = await db
        .from('turmas')
        .select('id, nome, descricao, faixa_etaria, sala, cor')
        .eq('ativa', true)
        .order('nome') as { data: { id: string; nome: string; descricao: string | null; faixa_etaria: string | null; sala: string | null; cor: string }[] | null }
      if (data) {
        const turmasComContagem = await Promise.all(
          data.map(async (t) => {
            const { count } = await db
              .from('alunos')
              .select('id', { count: 'exact', head: true })
              .eq('turma_id', t.id)
              .eq('ativo', true)
            return {
              id: t.id,
              nome: t.nome,
              descricao: t.descricao ?? '',
              faixaEtaria: t.faixa_etaria ?? '',
              sala: t.sala ?? '',
              cor: t.cor ?? 'bg-blue-500',
              totalAlunos: count ?? 0,
            }
          })
        )
        setTurmasData(turmasComContagem)
      }
    }
    fetchTurmas()
  }, [])

  useEffect(() => {
    async function fetchProfessores() {
      const db = supabase as any
      const { data } = await db
        .from('professores')
        .select('id, nome, professor_turmas(turma_id)')
        .eq('ativo', true) as { data: { id: string; nome: string; professor_turmas: { turma_id: string }[] }[] | null }
      setProfessoresMock(data ?? [])
    }
    fetchProfessores()
  }, [])

  const getProfessoresDaTurma = (turmaId: string): string[] => {
    return professoresMock
      .filter(prof => prof.professor_turmas.some(pt => pt.turma_id === turmaId))
      .map(prof => prof.nome)
  }

  const totalAlunos = turmasData.reduce((acc, turma) => acc + turma.totalAlunos, 0)
  const mediaAlunos = turmasData.length > 0 ? Math.round(totalAlunos / turmasData.length) : 0

  const handleOpenDialog = (turma?: Turma) => {
    if (turma) {
      setEditMode(true)
      setSelectedTurma(turma)
      setFormData({
        nome: turma.nome,
        descricao: turma.descricao,
        faixaEtaria: turma.faixaEtaria,
        sala: turma.sala,
        cor: turma.cor
      })
    } else {
      setEditMode(false)
      setSelectedTurma(null)
      setFormData({
        nome: '',
        descricao: '',
        faixaEtaria: '',
        sala: '',
        cor: 'bg-blue-500'
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setSelectedTurma(null)
    setFormData({
      nome: '',
      descricao: '',
      faixaEtaria: '',
      sala: '',
      cor: 'bg-blue-500'
    })
  }

  const handleSaveTurma = async () => {
    if (!formData.nome) {
      alert('Por favor, preencha o nome da turma.')
      return
    }

    const db = supabase as any
    if (editMode && selectedTurma) {
      const { error } = await db
        .from('turmas')
        .update({
          nome: formData.nome,
          descricao: formData.descricao,
          faixa_etaria: formData.faixaEtaria,
          sala: formData.sala,
          cor: formData.cor,
        })
        .eq('id', selectedTurma.id)
      if (error) { alert('Erro ao atualizar turma.'); return }
      setTurmasData(turmasData.map(t =>
        t.id === selectedTurma.id
          ? { ...t, nome: formData.nome, descricao: formData.descricao, faixaEtaria: formData.faixaEtaria, sala: formData.sala, cor: formData.cor }
          : t
      ))
      alert('Turma atualizada com sucesso!')
    } else {
      const { data, error } = await db
        .from('turmas')
        .insert({
          nome: formData.nome,
          descricao: formData.descricao,
          faixa_etaria: formData.faixaEtaria,
          sala: formData.sala,
          cor: formData.cor,
        })
        .select('id')
        .single()
      if (error || !data) { alert('Erro ao cadastrar turma.'); return }
      setTurmasData([...turmasData, { id: data.id, nome: formData.nome, descricao: formData.descricao, faixaEtaria: formData.faixaEtaria, sala: formData.sala, cor: formData.cor, totalAlunos: 0 }])
      alert('Turma cadastrada com sucesso!')
    }

    handleCloseDialog()
  }

  const handleOpenDeleteDialog = (turma: Turma) => {
    setSelectedTurma(turma)
    setDeleteDialogOpen(true)
  }

  const handleDeleteTurma = async () => {
    if (selectedTurma) {
      const db = supabase as any
      const { error } = await db.from('turmas').delete().eq('id', selectedTurma.id)
      if (error) { alert('Erro ao excluir turma.'); return }
      setTurmasData(turmasData.filter(t => t.id !== selectedTurma.id))
      alert('Turma excluída com sucesso!')
      setDeleteDialogOpen(false)
      setSelectedTurma(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Turmas</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as turmas da Escola Bíblica Dominical
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Turmas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{turmasData.length}</div>
            <p className="text-xs text-muted-foreground">Em funcionamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlunos}</div>
            <p className="text-xs text-muted-foreground">Em todas as turmas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaAlunos}</div>
            <p className="text-xs text-muted-foreground">Alunos/turma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faixas Etárias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(turmasData.map(t => t.faixaEtaria)).size}</div>
            <p className="text-xs text-muted-foreground">Diferentes grupos</p>
          </CardContent>
        </Card>
      </div>

      {/* Turmas Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {turmasData.map((turma) => (
          <Card key={turma.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className={`h-2 ${turma.cor}`} />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{turma.nome}</CardTitle>
                  <CardDescription>{turma.descricao}</CardDescription>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {turma.faixaEtaria}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Professores */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Professor(es)</p>
                  {getProfessoresDaTurma(turma.id).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {getProfessoresDaTurma(turma.id).map((prof, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {prof}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem professor</p>
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{turma.totalAlunos} alunos</p>
                    <p className="text-xs text-muted-foreground">Matriculados</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{turma.sala}</p>
                    <p className="text-xs text-muted-foreground">Local</p>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenDialog(turma)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleOpenDeleteDialog(turma)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para Adicionar/Editar Turma */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Atualize as informações da turma abaixo.' : 'Preencha os dados da nova turma.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome da Turma *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Crianças - Pequeninos"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição breve da turma"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faixaEtaria">Faixa Etária</Label>
              <Select
                value={formData.faixaEtaria}
                onValueChange={(value) => setFormData({ ...formData, faixaEtaria: value })}
              >
                <SelectTrigger id="faixaEtaria">
                  <SelectValue placeholder="Selecione a faixa etária" />
                </SelectTrigger>
                <SelectContent>
                  {faixasEtarias.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sala">Sala</Label>
              <Input
                id="sala"
                value={formData.sala}
                onChange={(e) => setFormData({ ...formData, sala: e.target.value })}
                placeholder="Ex: Sala 1, Auditório"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cor">Cor Identificadora</Label>
              <Select value={formData.cor} onValueChange={(value) => setFormData({ ...formData, cor: value })}>
                <SelectTrigger id="cor">
                  <SelectValue placeholder="Selecione uma cor" />
                </SelectTrigger>
                <SelectContent>
                  {coresDisponiveis.map((cor) => (
                    <SelectItem key={cor.value} value={cor.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${cor.value}`} />
                        {cor.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTurma}>
              {editMode ? 'Salvar Alterações' : 'Cadastrar Turma'}
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
              Tem certeza que deseja excluir a turma <strong>{selectedTurma?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteTurma}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

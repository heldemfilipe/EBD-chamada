"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit, Trash2, Phone, Mail, Calendar, GraduationCap, BookOpen } from 'lucide-react'

// Interface para Professor
interface Professor {
  id: number
  nome: string
  especialidade: string
  turmas: number[]      // Turmas que leciona (pode ser várias)
  turmaAluno: number | null  // Turma em que é aluno (apenas uma)
  telefone: string
  email: string
  dataIngresso: string
}

// Interface para Turma
interface Turma {
  id: number
  nome: string
}

export default function ProfessoresPage() {
  const [professoresData, setProfessoresData] = useState<Professor[]>([])
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<Turma[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    especialidade: '',
    turmas: [] as number[],
    turmaAluno: null as number | null,
  })

  useEffect(() => {
    // TODO: buscar do Supabase
    // const { data } = await supabase.from('professores').select('*')
    // setProfessoresData(data ?? [])
  }, [])

  useEffect(() => {
    // TODO: buscar do Supabase
    // const { data } = await supabase.from('turmas').select('id, nome')
    // setTurmasDisponiveis(data ?? [])
  }, [])

  // Obter nomes das turmas por IDs
  const getTurmasNomes = (turmaIds: number[]): string[] => {
    return turmasDisponiveis
      .filter(turma => turmaIds.includes(turma.id))
      .map(turma => turma.nome)
  }

  // Obter nome de uma turma por ID
  const getTurmaNome = (turmaId: number | null): string => {
    if (!turmaId) return '—'
    return turmasDisponiveis.find(t => t.id === turmaId)?.nome ?? '—'
  }

  // Alternar seleção de turma que leciona
  const toggleTurmaLeciona = (turmaId: number) => {
    setFormData(prev => ({
      ...prev,
      turmas: prev.turmas.includes(turmaId)
        ? prev.turmas.filter(id => id !== turmaId)
        : [...prev.turmas, turmaId]
    }))
  }

  const filteredProfessores = professoresData.filter(professor =>
    professor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professor.especialidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professor.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenDialog = (professor?: Professor) => {
    if (professor) {
      setEditMode(true)
      setSelectedProfessor(professor)
      setFormData({
        nome: professor.nome,
        telefone: professor.telefone,
        email: professor.email,
        especialidade: professor.especialidade,
        turmas: professor.turmas,
        turmaAluno: professor.turmaAluno,
      })
    } else {
      setEditMode(false)
      setSelectedProfessor(null)
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        especialidade: '',
        turmas: [],
        turmaAluno: null,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setSelectedProfessor(null)
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      especialidade: '',
      turmas: [],
      turmaAluno: null,
    })
  }

  const handleSaveProfessor = () => {
    if (!formData.nome) {
      alert('Por favor, preencha o nome do professor.')
      return
    }

    if (editMode && selectedProfessor) {
      setProfessoresData(professoresData.map(professor =>
        professor.id === selectedProfessor.id
          ? {
              ...professor,
              nome: formData.nome,
              telefone: formData.telefone,
              email: formData.email,
              especialidade: formData.especialidade,
              turmas: formData.turmas,
              turmaAluno: formData.turmaAluno,
            }
          : professor
      ))
      alert('Professor atualizado com sucesso!')
    } else {
      const novoProfessor: Professor = {
        id: professoresData.length > 0 ? Math.max(...professoresData.map(p => p.id)) + 1 : 1,
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email,
        especialidade: formData.especialidade,
        turmas: formData.turmas,
        turmaAluno: formData.turmaAluno,
        dataIngresso: new Date().toISOString().split('T')[0]
      }
      setProfessoresData([...professoresData, novoProfessor])
      alert('Professor cadastrado com sucesso!')
    }

    handleCloseDialog()
  }

  const handleOpenDeleteDialog = (professor: Professor) => {
    setSelectedProfessor(professor)
    setDeleteDialogOpen(true)
  }

  const handleDeleteProfessor = () => {
    if (selectedProfessor) {
      setProfessoresData(professoresData.filter(professor => professor.id !== selectedProfessor.id))
      alert('Professor excluído com sucesso!')
      setDeleteDialogOpen(false)
      setSelectedProfessor(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Professores</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os professores da Escola Bíblica Dominical
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Professor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Professores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{professoresData.length}</div>
            <p className="text-xs text-muted-foreground">Ativos no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atribuições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {professoresData.reduce((acc, p) => acc + p.turmas.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Turmas lecionadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Também Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {professoresData.filter(p => p.turmaAluno !== null).length}
            </div>
            <p className="text-xs text-muted-foreground">Matriculados em turma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Especialidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(professoresData.map(p => p.especialidade).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Diferentes áreas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Professores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Professores</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os professores cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, especialidade ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      Leciona em
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Aluno em
                    </div>
                  </TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfessores.length > 0 ? (
                  filteredProfessores.map((professor) => (
                    <TableRow key={professor.id}>
                      <TableCell>
                        <div className="font-medium">{professor.nome}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          Desde {new Date(professor.dataIngresso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {professor.especialidade
                          ? <Badge variant="outline">{professor.especialidade}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {professor.turmas.length > 0 ? (
                            getTurmasNomes(professor.turmas).map((turma, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {turma}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Nenhuma</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {professor.turmaAluno ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                            {getTurmaNome(professor.turmaAluno)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{professor.telefone || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{professor.email || '—'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(professor)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(professor)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum professor encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Adicionar/Editar Professor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Professor' : 'Novo Professor'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Atualize as informações do professor abaixo.' : 'Preencha os dados do novo professor.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Digite o nome completo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="especialidade">Especialidade</Label>
              <Input
                id="especialidade"
                value={formData.especialidade}
                onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                placeholder="Ex: Estudos Bíblicos, Teologia, etc."
              />
            </div>

            {/* Turmas que leciona */}
            <div className="grid gap-3">
              <Label className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Turmas que leciona
              </Label>
              <div className="border rounded-lg p-4 space-y-3 max-h-[180px] overflow-y-auto">
                {turmasDisponiveis.length > 0 ? (
                  turmasDisponiveis.map((turma) => (
                    <div key={turma.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`leciona-${turma.id}`}
                        checked={formData.turmas.includes(turma.id)}
                        onCheckedChange={() => toggleTurmaLeciona(turma.id)}
                      />
                      <Label
                        htmlFor={`leciona-${turma.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {turma.nome}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma turma disponível</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione as turmas em que este professor irá lecionar
              </p>
            </div>

            {/* Turma em que é aluno */}
            <div className="grid gap-2">
              <Label htmlFor="turmaAluno" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Turma em que é aluno
              </Label>
              <Select
                value={formData.turmaAluno !== null ? String(formData.turmaAluno) : 'nenhuma'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    turmaAluno: value === 'nenhuma' ? null : Number(value),
                  })
                }
              >
                <SelectTrigger id="turmaAluno">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Não é aluno</SelectItem>
                  {turmasDisponiveis.map((turma) => (
                    <SelectItem key={turma.id} value={String(turma.id)}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecione a turma em que este professor também participa como aluno
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfessor}>
              {editMode ? 'Salvar Alterações' : 'Cadastrar Professor'}
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
              Tem certeza que deseja excluir o professor <strong>{selectedProfessor?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteProfessor}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

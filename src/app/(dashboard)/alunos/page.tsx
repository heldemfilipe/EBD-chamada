"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Search, Edit, Trash2, Phone, Mail } from 'lucide-react'

// Interface para Aluno
interface Aluno {
  id: number
  nome: string
  idade: number
  turma: string
  telefone: string
  email: string
  dataNascimento: string
  responsavel: string
  presenca: number
  status: string
}

// Constantes estáticas — categorias de turma para filtro e seleção
const turmas = ['Crianças', 'Adolescentes', 'Jovens', 'Adultos']

export default function AlunosPage() {
  const [alunosData, setAlunosData] = useState<Aluno[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    dataNascimento: '',
    telefone: '',
    email: '',
    responsavel: '',
    turma: ''
  })

  useEffect(() => {
    // TODO: buscar do Supabase
    // const { data } = await supabase.from('alunos').select('*')
    // setAlunosData(data ?? [])
  }, [])

  const filteredAlunos = alunosData.filter(aluno => {
    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTurma = turmaFilter === 'all' || aluno.turma === turmaFilter

    return matchesSearch && matchesTurma
  })

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return idade
  }

  const handleOpenDialog = (aluno?: Aluno) => {
    if (aluno) {
      setEditMode(true)
      setSelectedAluno(aluno)
      setFormData({
        nome: aluno.nome,
        dataNascimento: aluno.dataNascimento,
        telefone: aluno.telefone,
        email: aluno.email,
        responsavel: aluno.responsavel,
        turma: aluno.turma
      })
    } else {
      setEditMode(false)
      setSelectedAluno(null)
      setFormData({
        nome: '',
        dataNascimento: '',
        telefone: '',
        email: '',
        responsavel: '',
        turma: ''
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setSelectedAluno(null)
    setFormData({
      nome: '',
      dataNascimento: '',
      telefone: '',
      email: '',
      responsavel: '',
      turma: ''
    })
  }

  const handleSaveAluno = () => {
    // Validação - apenas nome é obrigatório
    if (!formData.nome) {
      alert('Por favor, preencha o nome do aluno.')
      return
    }

    const idade = formData.dataNascimento ? calcularIdade(formData.dataNascimento) : 0

    if (editMode && selectedAluno) {
      // Editar aluno existente
      setAlunosData(alunosData.map(aluno =>
        aluno.id === selectedAluno.id
          ? {
              ...aluno,
              nome: formData.nome,
              dataNascimento: formData.dataNascimento,
              telefone: formData.telefone,
              email: formData.email,
              responsavel: formData.responsavel,
              turma: formData.turma,
              idade: idade
            }
          : aluno
      ))
      alert('Aluno atualizado com sucesso!')
    } else {
      // Adicionar novo aluno
      const novoAluno: Aluno = {
        id: alunosData.length > 0 ? Math.max(...alunosData.map(a => a.id)) + 1 : 1,
        nome: formData.nome,
        idade: idade,
        turma: formData.turma,
        telefone: formData.telefone,
        email: formData.email,
        dataNascimento: formData.dataNascimento,
        responsavel: formData.responsavel,
        presenca: 0,
        status: 'ativo'
      }
      setAlunosData([...alunosData, novoAluno])
      alert('Aluno cadastrado com sucesso!')
    }

    handleCloseDialog()
  }

  const handleOpenDeleteDialog = (aluno: Aluno) => {
    setSelectedAluno(aluno)
    setDeleteDialogOpen(true)
  }

  const handleDeleteAluno = () => {
    if (selectedAluno) {
      setAlunosData(alunosData.filter(aluno => aluno.id !== selectedAluno.id))
      alert('Aluno excluído com sucesso!')
      setDeleteDialogOpen(false)
      setSelectedAluno(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os alunos da Escola Bíblica Dominical
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Aluno
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alunosData.length}</div>
            <p className="text-xs text-muted-foreground">Ativos no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crianças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alunosData.filter(a => a.turma === 'Crianças').length}
            </div>
            <p className="text-xs text-muted-foreground">Até 12 anos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adolescentes/Jovens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alunosData.filter(a => a.turma === 'Adolescentes' || a.turma === 'Jovens').length}
            </div>
            <p className="text-xs text-muted-foreground">13 a 18 anos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adultos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alunosData.filter(a => a.turma === 'Adultos').length}
            </div>
            <p className="text-xs text-muted-foreground">Acima de 18 anos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os alunos cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmas.map((turma) => (
                  <SelectItem key={turma} value={turma}>
                    {turma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Presença</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlunos.length > 0 ? (
                  filteredAlunos.map((aluno) => (
                    <TableRow key={aluno.id}>
                      <TableCell>
                        <div className="font-medium">{aluno.nome}</div>
                      </TableCell>
                      <TableCell>{aluno.idade} anos</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{aluno.turma}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{aluno.telefone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{aluno.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-full max-w-[100px] bg-secondary rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                aluno.presenca >= 90
                                  ? 'bg-green-500'
                                  : aluno.presenca >= 75
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${aluno.presenca}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{aluno.presenca}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(aluno)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(aluno)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Adicionar/Editar Aluno */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Atualize as informações do aluno abaixo.' : 'Preencha os dados do novo aluno.'}
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
              <Label htmlFor="dataNascimento">Data de Nascimento</Label>
              <Input
                id="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
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
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="turma">Turma</Label>
              <Select value={formData.turma} onValueChange={(value) => setFormData({ ...formData, turma: value })}>
                <SelectTrigger id="turma">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {turma}
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
            <Button onClick={handleSaveAluno}>
              {editMode ? 'Salvar Alterações' : 'Cadastrar Aluno'}
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
              Tem certeza que deseja excluir o aluno <strong>{selectedAluno?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAluno}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

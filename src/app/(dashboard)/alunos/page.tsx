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
import { supabase } from '@/lib/supabase'

interface Aluno {
  id: string
  nome: string
  idade: number
  turma: string
  turmaId: string | null
  telefone: string
  email: string
  dataNascimento: string
  responsavel: string
  presenca: number
  status: string
  isProfessor: boolean
}

interface Turma {
  id: string
  nome: string
  faixaEtaria: string
}

export default function AlunosPage() {
  const [alunosData, setAlunosData] = useState<Aluno[]>([])
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<Turma[]>([])
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
    turmaId: '',
  })

  useEffect(() => {
    async function fetchTurmas() {
      const { data } = await (supabase as any).from('turmas').select('id, nome, faixa_etaria').eq('ativa', true).order('nome') as { data: { id: string; nome: string; faixa_etaria: string | null }[] | null }
      setTurmasDisponiveis((data ?? []).map(t => ({ id: t.id, nome: t.nome, faixaEtaria: t.faixa_etaria ?? '' })))
    }
    async function fetchAlunos() {
      const { data } = await supabase
        .from('alunos')
        .select('id, nome, data_nascimento, telefone, email, responsavel, turma_id')
        .order('nome') as { data: { id: string; nome: string; data_nascimento: string | null; telefone: string | null; email: string | null; responsavel: string | null; turma_id: string | null }[] | null; error: any }
      if (data) {
        setAlunosData(data.map(a => ({
          id: a.id,
          nome: a.nome,
          turmaId: a.turma_id ?? null,
          turma: '', // será resolvido a partir de turmasDisponiveis no render
          telefone: a.telefone ?? '',
          email: a.email ?? '',
          dataNascimento: a.data_nascimento ?? '',
          responsavel: a.responsavel ?? '',
          presenca: 0,
          status: 'ativo',
          idade: a.data_nascimento ? calcularIdade(a.data_nascimento) : 0,
          isProfessor: (a.responsavel ?? '').startsWith('professor:'),
        })))
      }
    }
    fetchTurmas()
    fetchAlunos()
  }, [])

  const filteredAlunos = alunosData.filter(aluno => {
    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTurma = turmaFilter === 'all' || aluno.turmaId === turmaFilter
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
        turmaId: aluno.turmaId ?? '',
      })
    } else {
      setEditMode(false)
      setSelectedAluno(null)
      setFormData({ nome: '', dataNascimento: '', telefone: '', email: '', responsavel: '', turmaId: '' })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setSelectedAluno(null)
    setFormData({ nome: '', dataNascimento: '', telefone: '', email: '', responsavel: '', turmaId: '' })
  }

  const handleSaveAluno = async () => {
    if (!formData.nome) {
      alert('Por favor, preencha o nome do aluno.')
      return
    }
    const idade = formData.dataNascimento ? calcularIdade(formData.dataNascimento) : 0
    const turmaNome = turmasDisponiveis.find(t => t.id === formData.turmaId)?.nome ?? ''

    if (editMode && selectedAluno) {
      const { error } = await (supabase.from('alunos') as any).update({
        nome: formData.nome,
        data_nascimento: formData.dataNascimento || null,
        telefone: formData.telefone,
        email: formData.email,
        responsavel: formData.responsavel,
        turma_id: formData.turmaId || null,
      }).eq('id', selectedAluno.id)
      if (error) { alert('Erro ao atualizar aluno.'); return }
      setAlunosData(alunosData.map(a =>
        a.id === selectedAluno.id
          ? { ...a, nome: formData.nome, dataNascimento: formData.dataNascimento, telefone: formData.telefone, email: formData.email, responsavel: formData.responsavel, turmaId: formData.turmaId || null, turma: turmaNome, idade, isProfessor: false }
          : a
      ))
      alert('Aluno atualizado com sucesso!')
    } else {
      const { data, error } = await (supabase.from('alunos') as any).insert({
        nome: formData.nome,
        data_nascimento: formData.dataNascimento || null,
        telefone: formData.telefone,
        email: formData.email,
        responsavel: formData.responsavel,
        turma_id: formData.turmaId || null,
      }).select('id').single()
      if (error || !data) { alert('Erro ao cadastrar aluno.'); return }
      setAlunosData([...alunosData, { id: data.id, nome: formData.nome, idade, turma: turmaNome, turmaId: formData.turmaId || null, telefone: formData.telefone, email: formData.email, dataNascimento: formData.dataNascimento, responsavel: formData.responsavel, presenca: 0, status: 'ativo', isProfessor: false }])
      alert('Aluno cadastrado com sucesso!')
    }
    handleCloseDialog()
  }

  const handleOpenDeleteDialog = (aluno: Aluno) => {
    setSelectedAluno(aluno)
    setDeleteDialogOpen(true)
  }

  const handleDeleteAluno = async () => {
    if (selectedAluno) {
      const { error } = await (supabase.from('alunos') as any).delete().eq('id', selectedAluno.id)
      if (error) { alert('Erro ao excluir aluno.'); return }
      setAlunosData(alunosData.filter(a => a.id !== selectedAluno.id))
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

      {/* Stats Cards — contagem por faixa etária da turma */}
      {(() => {
        // Mapear turmaId → faixaEtaria
        const faixaPorTurma: Record<string, string> = {}
        for (const t of turmasDisponiveis) faixaPorTurma[t.id] = t.faixaEtaria

        const totalCordeirinhos   = alunosData.filter(a => a.turmaId && faixaPorTurma[a.turmaId] === 'Até 5 anos').length
        const totalGuerreiros     = alunosData.filter(a => a.turmaId && faixaPorTurma[a.turmaId] === '6 a 11 anos').length
        const totalAdolescentes   = alunosData.filter(a => a.turmaId && faixaPorTurma[a.turmaId] === '11 a 15 anos').length
        const totalJovens         = alunosData.filter(a => a.turmaId && faixaPorTurma[a.turmaId] === 'A partir de 16 anos').length
        const totalAdultos        = alunosData.filter(a => a.turmaId && faixaPorTurma[a.turmaId] === 'A partir de 18 anos').length

        return (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{alunosData.length}</div>
                <p className="text-xs text-muted-foreground">Ativos no sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cordeirinhos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">{totalCordeirinhos}</div>
                <p className="text-xs text-muted-foreground">Até 5 anos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Guerreiros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{totalGuerreiros}</div>
                <p className="text-xs text-muted-foreground">6 a 11 anos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Adolescentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{totalAdolescentes}</div>
                <p className="text-xs text-muted-foreground">11 a 15 anos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Jovens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{totalJovens}</div>
                <p className="text-xs text-muted-foreground">A partir de 16 anos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Adultos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{totalAdultos}</div>
                <p className="text-xs text-muted-foreground">A partir de 18 anos</p>
              </CardContent>
            </Card>
          </div>
        )
      })()}

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
                {turmasDisponiveis.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
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
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{aluno.nome}</div>
                          {aluno.isProfessor && (
                            <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">
                              Professor
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{aluno.idade > 0 ? `${aluno.idade} anos` : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {turmasDisponiveis.find(t => t.id === aluno.turmaId)?.nome ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{aluno.telefone || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{aluno.email || '—'}</span>
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
                          {aluno.isProfessor ? (
                            <span className="text-xs text-muted-foreground italic">Gerenciar em Professores</span>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(aluno)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(aluno)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
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
              <Select value={formData.turmaId} onValueChange={(value) => setFormData({ ...formData, turmaId: value })}>
                <SelectTrigger id="turma">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmasDisponiveis.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
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

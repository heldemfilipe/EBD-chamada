"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  UserPlus,
  Book,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  PartyPopper,
  Trash2,
} from 'lucide-react'
import { formatarDomingo, getUltimosDomingos, converterParaISO, calcularPresencasSeguidas } from '@/lib/chamada-utils'
import { supabase } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'

// Interfaces
interface AlunoPresenca {
  aluno_id: string
  nome: string
  presente: 'presente' | 'ausente' | 'pendente'
  trouxe_biblia: boolean
  trouxe_revista: boolean
  justificativa: string
}

interface Visitante {
  id: string
  nome: string
  telefone: string
  observacao: string
  historico: Array<{ data: string; presente: boolean | null }>
  presencas_seguidas: number
  trouxe_biblia: boolean
  trouxe_revista: boolean
}

interface TurmaInfo {
  id: string
  nome: string
  sala: string
  professor: string
}

export default function ChamadaTurmaPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const turmaId = params.turmaId as string
  const dataSelecionada = searchParams.get('data') || converterParaISO(new Date())

  const [turma, setTurma] = useState<TurmaInfo>({ id: turmaId, nome: '', sala: '', professor: '' })
  const [alunos, setAlunos] = useState<AlunoPresenca[]>([])
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [oferta, setOferta] = useState<string>('')
  const [anotacoes, setAnotacoes] = useState<string>('')
  const [dialogVisitanteOpen, setDialogVisitanteOpen] = useState(false)
  const [novoVisitante, setNovoVisitante] = useState({
    nome: '',
    telefone: '',
    observacao: '',
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function fetchTurmaEAlunos() {
      // Buscar dados da turma
      const { data: turmaData } = await (supabase.from('turmas') as any)
        .select('id, nome, sala')
        .eq('id', turmaId)
        .single() as { data: { id: string; nome: string; sala: string | null } | null }
      if (turmaData) setTurma({ id: turmaData.id, nome: turmaData.nome, sala: turmaData.sala ?? '', professor: '' })

      // Buscar alunos da turma
      const { data: alunosData } = await (supabase.from('alunos') as any)
        .select('id, nome')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome') as { data: { id: string; nome: string }[] | null }

      // Verificar se já existe chamada para esta data
      const { data: chamadaExistente } = await (supabase.from('chamadas') as any)
        .select('id, oferta, anotacoes, presencas(aluno_id, presente, trouxe_biblia, trouxe_revista, justificativa)')
        .eq('turma_id', turmaId)
        .eq('data', dataSelecionada)
        .single() as { data: { id: string; oferta: number; anotacoes: string | null; presencas: any[] } | null }

      if (chamadaExistente) {
        setOferta(String(chamadaExistente.oferta || ''))
        setAnotacoes(chamadaExistente.anotacoes ?? '')
        const presencasMap = new Map(
          (chamadaExistente.presencas as any[]).map(p => [p.aluno_id, p])
        )
        setAlunos(
          (alunosData ?? []).map(a => {
            const p = presencasMap.get(a.id)
            return {
              aluno_id: a.id,
              nome: a.nome,
              presente: p ? (p.presente ? 'presente' : 'ausente') : 'pendente',
              trouxe_biblia: p?.trouxe_biblia ?? false,
              trouxe_revista: p?.trouxe_revista ?? false,
              justificativa: p?.justificativa ?? '',
            }
          })
        )
      } else {
        setAlunos(
          (alunosData ?? []).map(a => ({
            aluno_id: a.id,
            nome: a.nome,
            presente: 'pendente' as const,
            trouxe_biblia: false,
            trouxe_revista: false,
            justificativa: '',
          }))
        )
      }

      // Carregar visitantes do dia
      const { data: histData } = await (supabase.from('historico_visitantes') as any)
        .select('id, visitante_id, visitantes(id, nome, telefone, observacao)')
        .eq('turma_id', turmaId)
        .eq('data', dataSelecionada)
        .eq('presente', true) as { data: { id: string; visitante_id: string; visitantes: any }[] | null }
      if (histData) {
        setVisitantes(histData.map(h => {
          const v = h.visitantes as { id: string; nome: string; telefone: string | null; observacao: string | null } | null
          return {
            id: h.visitante_id,
            nome: v?.nome ?? '',
            telefone: v?.telefone ?? '',
            observacao: v?.observacao ?? '',
            historico: [{ data: dataSelecionada, presente: true }],
            presencas_seguidas: 1,
            trouxe_biblia: false,
            trouxe_revista: false,
          }
        }))
      } else {
        setVisitantes([])
      }
    }
    fetchTurmaEAlunos()
  }, [turmaId, dataSelecionada])

  // Handlers
  const handleMarcarPresenca = (alunoId: string, status: 'presente' | 'ausente') => {
    setAlunos(
      alunos.map((aluno) =>
        aluno.aluno_id === alunoId
          ? {
              ...aluno,
              presente: status,
              trouxe_biblia: status === 'ausente' ? false : aluno.trouxe_biblia,
              trouxe_revista: status === 'ausente' ? false : aluno.trouxe_revista,
            }
          : aluno
      )
    )
  }

  const handleToggleBiblia = (alunoId: string) => {
    setAlunos(
      alunos.map((aluno) =>
        aluno.aluno_id === alunoId ? { ...aluno, trouxe_biblia: !aluno.trouxe_biblia } : aluno
      )
    )
  }

  const handleToggleRevista = (alunoId: string) => {
    setAlunos(
      alunos.map((aluno) =>
        aluno.aluno_id === alunoId ? { ...aluno, trouxe_revista: !aluno.trouxe_revista } : aluno
      )
    )
  }

  const handleJustificativaChange = (alunoId: string, justificativa: string) => {
    setAlunos(
      alunos.map((aluno) =>
        aluno.aluno_id === alunoId ? { ...aluno, justificativa } : aluno
      )
    )
  }

  const handleAdicionarVisitante = () => {
    if (!novoVisitante.nome) {
      alert('Por favor, preencha o nome do visitante.')
      return
    }

    const visitante: Visitante = {
      id: `v${Date.now()}`,
      nome: novoVisitante.nome,
      telefone: novoVisitante.telefone,
      observacao: novoVisitante.observacao,
      historico: [{ data: dataSelecionada, presente: true }],
      presencas_seguidas: 1,
      trouxe_biblia: false,
      trouxe_revista: false,
    }

    setVisitantes([...visitantes, visitante])
    setNovoVisitante({ nome: '', telefone: '', observacao: '' })
    setDialogVisitanteOpen(false)
  }

  const handleRemoverVisitante = (visitanteId: string) => {
    setVisitantes(visitantes.filter((v) => v.id !== visitanteId))
  }

  const handleToggleVisitanteBiblia = (visitanteId: string) => {
    setVisitantes(
      visitantes.map((v) =>
        v.id === visitanteId ? { ...v, trouxe_biblia: !v.trouxe_biblia } : v
      )
    )
  }

  const handleToggleVisitanteRevista = (visitanteId: string) => {
    setVisitantes(
      visitantes.map((v) =>
        v.id === visitanteId ? { ...v, trouxe_revista: !v.trouxe_revista } : v
      )
    )
  }

  const handleConverterEmAluno = (visitanteId: string) => {
    const visitante = visitantes.find((v) => v.id === visitanteId)
    if (!visitante) return

    if (
      confirm(
        `Converter ${visitante.nome} em aluno da turma?\n\nIsso criará uma matrícula e removerá da lista de visitantes.`
      )
    ) {
      // Aqui você faria a conversão no banco de dados
      alert(`${visitante.nome} foi convertido em aluno com sucesso!`)
      handleRemoverVisitante(visitanteId)
    }
  }

  const handleSalvarChamada = async () => {
    setSalvando(true)
    try {
      const db = supabase as any

      // Upsert da chamada (cria ou atualiza)
      const { data: chamada, error: errChamada } = await db
        .from('chamadas')
        .upsert({ turma_id: turmaId, data: dataSelecionada, oferta: parseFloat(oferta) || 0, anotacoes }, { onConflict: 'turma_id,data' })
        .select('id')
        .single()

      if (errChamada || !chamada) {
        alert('Erro ao salvar chamada.')
        setSalvando(false)
        return
      }

      // Upsert de presenças
      const presencasPayload = alunos
        .filter(a => a.presente !== 'pendente')
        .map(a => ({
          chamada_id: chamada.id,
          aluno_id: a.aluno_id,
          presente: a.presente === 'presente',
          trouxe_biblia: a.trouxe_biblia,
          trouxe_revista: a.trouxe_revista,
          justificativa: a.justificativa || null,
        }))

      if (presencasPayload.length > 0) {
        await db.from('presencas').upsert(presencasPayload, { onConflict: 'chamada_id,aluno_id' })
      }

      // Salvar visitantes novos
      for (const v of visitantes) {
        const { data: visitante } = await db
          .from('visitantes')
          .upsert({ ...(v.id.startsWith('v') ? {} : { id: v.id }), nome: v.nome, telefone: v.telefone || null, observacao: v.observacao || null })
          .select('id')
          .single()
        if (visitante) {
          await db.from('historico_visitantes').upsert({
            visitante_id: visitante.id,
            turma_id: turmaId,
            chamada_id: chamada.id,
            data: dataSelecionada,
            presente: true,
            trouxe_biblia: v.trouxe_biblia,
            trouxe_revista: v.trouxe_revista,
          }, { onConflict: 'visitante_id,data,turma_id' })
        }
      }

      alert('Chamada salva com sucesso!')
      router.push('/chamada')
    } catch {
      alert('Erro inesperado ao salvar chamada.')
    } finally {
      setSalvando(false)
    }
  }

  // Calcular resumo
  const resumo = {
    matriculados: alunos.length,
    presentes: alunos.filter((a) => a.presente === 'presente').length,
    faltas: alunos.filter((a) => a.presente === 'ausente').length,
    visitantes: visitantes.length,
    biblias: alunos.filter((a) => a.trouxe_biblia).length + visitantes.filter((v) => v.trouxe_biblia).length,
    revistas: alunos.filter((a) => a.trouxe_revista).length + visitantes.filter((v) => v.trouxe_revista).length,
    percentual_presenca:
      alunos.length > 0 ? Math.round((alunos.filter((a) => a.presente === 'presente').length / alunos.length) * 100) : 0,
  }

  const renderIndicadorPresencas = (visitante: Visitante) => {
    const ultimosDomingos = getUltimosDomingos(3)
    const icones = ultimosDomingos.map((domingo, index) => {
      const dataISO = converterParaISO(domingo)
      const registro = visitante.historico.find((h) => h.data === dataISO)

      if (registro?.presente === true) {
        return (
          <div key={index} className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
              {index + 1}
            </div>
          </div>
        )
      } else if (registro?.presente === false) {
        return (
          <div key={index} className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        )
      } else {
        return (
          <div key={index} className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gray-300" />
            </div>
          </div>
        )
      }
    })

    return <div className="flex gap-2">{icones}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/chamada')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{turma.nome || 'Turma'}</h1>
            <p className="text-muted-foreground mt-1">
              {formatarDomingo(dataSelecionada)}{turma.professor ? ` • Professor: ${turma.professor}` : ''}{turma.sala ? ` • ${turma.sala}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lista de Alunos */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Presença</CardTitle>
              <CardDescription>Marque a presença de cada aluno</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alunos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum aluno cadastrado nesta turma
                </p>
              ) : (
                alunos.map((aluno, index) => (
                  <div key={aluno.aluno_id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{aluno.nome}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={aluno.presente === 'presente' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleMarcarPresenca(aluno.aluno_id, 'presente')}
                          className={
                            aluno.presente === 'presente' ? 'bg-green-500 hover:bg-green-600' : ''
                          }
                        >
                          Presente
                        </Button>
                        <Button
                          variant={aluno.presente === 'ausente' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleMarcarPresenca(aluno.aluno_id, 'ausente')}
                          className={
                            aluno.presente === 'ausente' ? 'bg-red-500 hover:bg-red-600' : ''
                          }
                        >
                          Ausente
                        </Button>
                        {aluno.presente === 'pendente' && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Checkboxes Bíblia/Revista se Presente */}
                    {aluno.presente === 'presente' && (
                      <div className="flex gap-6 ml-11">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`biblia-${aluno.aluno_id}`}
                            checked={aluno.trouxe_biblia}
                            onCheckedChange={() => handleToggleBiblia(aluno.aluno_id)}
                          />
                          <label
                            htmlFor={`biblia-${aluno.aluno_id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                          >
                            <Book className="h-4 w-4" />
                            Trouxe Bíblia
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`revista-${aluno.aluno_id}`}
                            checked={aluno.trouxe_revista}
                            onCheckedChange={() => handleToggleRevista(aluno.aluno_id)}
                          />
                          <label
                            htmlFor={`revista-${aluno.aluno_id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                          >
                            <BookOpen className="h-4 w-4" />
                            Trouxe Revista
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Justificativa se Ausente */}
                    {aluno.presente === 'ausente' && (
                      <div className="ml-11 space-y-2">
                        <Label htmlFor={`justificativa-${aluno.aluno_id}`} className="text-xs text-muted-foreground">
                          Justificativa (opcional)
                        </Label>
                        <Input
                          id={`justificativa-${aluno.aluno_id}`}
                          placeholder="Ex: Viagem, doente..."
                          value={aluno.justificativa}
                          onChange={(e) => handleJustificativaChange(aluno.aluno_id, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Visitantes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Visitantes</CardTitle>
                  <CardDescription>Registre os visitantes da turma</CardDescription>
                </div>
                <Button onClick={() => setDialogVisitanteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Visitante
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visitantes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum visitante registrado para este dia
                </p>
              ) : (
                visitantes.map((visitante) => (
                  <div key={visitante.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{visitante.nome}</h4>
                          {visitante.presencas_seguidas >= 3 && (
                            <Badge className="bg-green-500">
                              <PartyPopper className="h-3 w-3 mr-1" />
                              Novo Membro!
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{visitante.telefone}</p>
                        {visitante.observacao && (
                          <p className="text-xs text-muted-foreground mt-1">{visitante.observacao}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverVisitante(visitante.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Indicador de presenças */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Histórico de Presenças</Label>
                      {renderIndicadorPresencas(visitante)}
                      <Progress value={(visitante.presencas_seguidas / 3) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {visitante.presencas_seguidas}/3 presenças consecutivas
                      </p>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex gap-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`visitante-biblia-${visitante.id}`}
                          checked={visitante.trouxe_biblia}
                          onCheckedChange={() => handleToggleVisitanteBiblia(visitante.id)}
                        />
                        <label
                          htmlFor={`visitante-biblia-${visitante.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                        >
                          <Book className="h-4 w-4" />
                          Trouxe Bíblia
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`visitante-revista-${visitante.id}`}
                          checked={visitante.trouxe_revista}
                          onCheckedChange={() => handleToggleVisitanteRevista(visitante.id)}
                        />
                        <label
                          htmlFor={`visitante-revista-${visitante.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                        >
                          <BookOpen className="h-4 w-4" />
                          Trouxe Revista
                        </label>
                      </div>
                    </div>

                    {/* Botão Converter */}
                    {visitante.presencas_seguidas >= 3 && (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleConverterEmAluno(visitante.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Converter em Aluno
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral - Resumo */}
        <div className="space-y-6">
          {/* Resumo da Sala */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Sala</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Matriculados:</span>
                  <span className="font-semibold">{resumo.matriculados}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Presentes:</span>
                  <span className="font-semibold text-green-600">
                    {resumo.presentes} ({resumo.percentual_presenca}%)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Faltas:</span>
                  <span className="font-semibold text-red-600">{resumo.faltas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Visitantes:</span>
                  <span className="font-semibold text-blue-600">{resumo.visitantes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bíblias:</span>
                  <span className="font-semibold">{resumo.biblias}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revistas:</span>
                  <span className="font-semibold">{resumo.revistas}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="oferta">Oferta (R$)</Label>
                <Input
                  id="oferta"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={oferta}
                  onChange={(e) => setOferta(e.target.value)}
                />
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="anotacoes">Anotações</Label>
                <Textarea
                  id="anotacoes"
                  placeholder="Observações sobre a aula..."
                  rows={4}
                  value={anotacoes}
                  onChange={(e) => setAnotacoes(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSalvarChamada}
                disabled={salvando}
              >
                <Save className="h-4 w-4 mr-2" />
                {salvando ? 'Salvando...' : 'Salvar Chamada'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Adicionar Visitante */}
      <Dialog open={dialogVisitanteOpen} onOpenChange={setDialogVisitanteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Visitante</DialogTitle>
            <DialogDescription>Preencha os dados do visitante</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome-visitante">Nome *</Label>
              <Input
                id="nome-visitante"
                placeholder="Nome completo"
                value={novoVisitante.nome}
                onChange={(e) => setNovoVisitante({ ...novoVisitante, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone-visitante">Telefone</Label>
              <Input
                id="telefone-visitante"
                placeholder="(00) 00000-0000"
                value={novoVisitante.telefone}
                onChange={(e) => setNovoVisitante({ ...novoVisitante, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacao-visitante">Observação</Label>
              <Textarea
                id="observacao-visitante"
                placeholder="Ex: Convidado por..."
                rows={3}
                value={novoVisitante.observacao}
                onChange={(e) => setNovoVisitante({ ...novoVisitante, observacao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogVisitanteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarVisitante}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

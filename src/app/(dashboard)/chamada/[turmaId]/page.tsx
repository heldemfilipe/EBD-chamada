"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft,
  Save,
  UserPlus,
  Book,
  BookOpen,
  CheckCircle2,
  XCircle,
  PartyPopper,
  Trash2,
  GraduationCap,
  Users,
  DollarSign,
} from 'lucide-react'
import { formatarDomingo, converterParaISO, getTrimestreRange } from '@/lib/chamada-utils'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/lib/toast'
import { corPresenca } from '@/lib/presence'
import { buscarDadosChamadaTurma, salvarChamada, converterVisitanteEmAluno } from '@/actions/chamada'
import { AlunoRow } from './_AlunoRow'
import { AdicionarVisitanteDialog } from './_AdicionarVisitanteDialog'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface AlunoPresenca {
  aluno_id: string
  nome: string
  presente: 'presente' | 'ausente' | 'pendente'
  trouxe_biblia: boolean
  trouxe_revista: boolean
  justificativa: string
  isProfessor: boolean
  professorId: string | null
  cargo: string
  dadoAula: boolean
  turmaDaAulaId: string | null
  turmaDaAulaNome: string | null
}

interface HistoricoItem {
  data: string
  presente: boolean | null
}

interface Visitante {
  id: string
  isNovo: boolean
  nome: string
  telefone: string
  observacao: string
  presenteHoje: 'presente' | 'ausente' | 'pendente'
  trouxe_biblia: boolean
  trouxe_revista: boolean
  historico: HistoricoItem[]
  totalVisitas: number
}

interface TurmaInfo {
  id: string
  nome: string
  sala: string
  professor: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUltimosDomingosAntesde(dataISO: string, n: number): string[] {
  const base = new Date(dataISO + 'T12:00:00')
  const domingos: string[] = []
  let cursor = new Date(base)
  cursor.setDate(cursor.getDate() - 7)
  while (domingos.length < n) {
    const dow = cursor.getDay()
    if (dow !== 0) cursor.setDate(cursor.getDate() - dow)
    domingos.push(converterParaISO(cursor))
    cursor.setDate(cursor.getDate() - 7)
  }
  return domingos
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ChamadaTurmaPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const turmaId = params.turmaId as string
  const dataSelecionada = searchParams.get('data') || converterParaISO(new Date())

  const [turma, setTurma] = useState<TurmaInfo>({ id: turmaId, nome: '', sala: '', professor: '' })
  const [alunos, setAlunos] = useState<AlunoPresenca[]>([])
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [ofertaCents, setOfertaCents] = useState<number>(0)
  const [anotacoes, setAnotacoes] = useState<string>('')
  const [dialogVisitanteOpen, setDialogVisitanteOpen] = useState(false)
  const [novoVisitante, setNovoVisitante] = useState({ nome: '', telefone: '', observacao: '' })
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [qtdBiblias, setQtdBiblias] = useState<string>('')
  const [qtdRevistas, setQtdRevistas] = useState<string>('')

  // ── Busca inicial via server action (SQL direto) ────────────────────────────
  useEffect(() => {
    let cancelado = false

    async function fetchDados() {
      setCarregando(true)
      try {
        const trimRange = getTrimestreRange(dataSelecionada)
        const dados = await buscarDadosChamadaTurma(turmaId, dataSelecionada, trimRange.inicio, trimRange.fim)

        if (cancelado) return

        // Turma
        if (dados.turma) setTurma({ id: dados.turma.id, nome: dados.turma.nome, sala: dados.turma.sala, professor: '' })

        // Escala
        const professorEscalaMap = new Map<string, { turmaId: string; turmaNome: string }>()
        for (const e of dados.escala) {
          if (e.professor_id) {
            professorEscalaMap.set(e.professor_id, { turmaId: e.turma_id, turmaNome: e.turma_nome })
          }
        }

        // Alunos + presenças
        const mapAluno = (a: { id: string; nome: string; responsavel: string | null; cargo: string | null }) => {
          const profId = (a.responsavel ?? '').startsWith('professor:')
            ? a.responsavel!.replace('professor:', '') : null
          return {
            aluno_id: a.id, nome: a.nome,
            trouxe_biblia: false, trouxe_revista: false, justificativa: '',
            isProfessor: profId !== null, professorId: profId, cargo: a.cargo ?? '',
            dadoAula: profId !== null && professorEscalaMap.has(profId),
            turmaDaAulaId: profId ? (professorEscalaMap.get(profId)?.turmaId ?? null) : null,
            turmaDaAulaNome: profId ? (professorEscalaMap.get(profId)?.turmaNome ?? null) : null,
          }
        }

        if (dados.chamada) {
          setOfertaCents(Math.round((dados.chamada.oferta || 0) * 100))
          setAnotacoes(dados.chamada.anotacoes ?? '')
          const presencasMap = new Map(dados.chamada.presencas.map(p => [p.aluno_id, p]))
          setAlunos(
            dados.alunos.map(a => {
              const p = presencasMap.get(a.id)
              return {
                ...mapAluno(a),
                presente: p ? (p.presente ? 'presente' : 'ausente') : 'pendente',
                trouxe_biblia: p?.trouxe_biblia ?? false,
                trouxe_revista: p?.trouxe_revista ?? false,
                justificativa: p?.justificativa ?? '',
              } as AlunoPresenca
            })
          )
        } else {
          setOfertaCents(0)
          setAnotacoes('')
          setAlunos(dados.alunos.map(a => ({ ...mapAluno(a), presente: 'pendente' as const })))
        }

        // Visitantes
        if (dados.visitanteHist.length > 0) {
          const porVisitante = new Map<string, typeof dados.visitanteHist>()
          for (const h of dados.visitanteHist) {
            if (!porVisitante.has(h.visitante_id)) porVisitante.set(h.visitante_id, [])
            porVisitante.get(h.visitante_id)!.push(h)
          }
          const visitantesCarregados: Visitante[] = []
          for (const [visitanteId, registros] of porVisitante.entries()) {
            const primeiro = registros[0]
            const registroDia = registros.find(r => r.data === dataSelecionada)
            const historicoAnterior = registros
              .filter(r => r.data !== dataSelecionada)
              .slice(0, 3)
              .map(r => ({ data: r.data, presente: r.presente }))
            visitantesCarregados.push({
              id: visitanteId, isNovo: false,
              nome: primeiro.visitante_nome, telefone: primeiro.visitante_telefone ?? '',
              observacao: primeiro.visitante_observacao ?? '',
              presenteHoje: registroDia ? (registroDia.presente ? 'presente' : 'ausente') : 'pendente',
              trouxe_biblia: registroDia?.trouxe_biblia ?? false,
              trouxe_revista: registroDia?.trouxe_revista ?? false,
              historico: historicoAnterior,
              totalVisitas: registros.filter(r => r.presente).length,
            })
          }
          setVisitantes(visitantesCarregados)
        } else {
          setVisitantes([])
        }
      } catch (e: any) {
        if (!cancelado) toast('Erro ao carregar dados: ' + (e?.message ?? 'erro inesperado'), 'error')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    fetchDados()
    return () => { cancelado = true }
  }, [turmaId, dataSelecionada])

  // ── Handlers Alunos ──────────────────────────────────────────────────────────

  const handleMarcarPresenca = useCallback((alunoId: string, status: 'presente' | 'ausente') => {
    setAlunos(prev => prev.map(a =>
      a.aluno_id === alunoId
        ? { ...a, presente: status, trouxe_biblia: status === 'ausente' ? false : a.trouxe_biblia, trouxe_revista: status === 'ausente' ? false : a.trouxe_revista }
        : a
    ))
  }, [])

  const handleToggleBiblia = useCallback((alunoId: string) =>
    setAlunos(prev => prev.map(a => a.aluno_id === alunoId ? { ...a, trouxe_biblia: !a.trouxe_biblia } : a)),
  [])

  const handleToggleRevista = useCallback((alunoId: string) =>
    setAlunos(prev => prev.map(a => a.aluno_id === alunoId ? { ...a, trouxe_revista: !a.trouxe_revista } : a)),
  [])

  const handleJustificativaChange = useCallback((alunoId: string, justificativa: string) =>
    setAlunos(prev => prev.map(a => a.aluno_id === alunoId ? { ...a, justificativa } : a)),
  [])

  const handleMarcarTodosBiblia = useCallback(() => {
    setAlunos(prev => prev.map(a => a.presente === 'presente' ? { ...a, trouxe_biblia: true } : a))
    setVisitantes(prev => prev.map(v => v.presenteHoje === 'presente' ? { ...v, trouxe_biblia: true } : v))
  }, [])

  const handleMarcarTodosRevista = useCallback(() => {
    setAlunos(prev => prev.map(a => a.presente === 'presente' ? { ...a, trouxe_revista: true } : a))
    setVisitantes(prev => prev.map(v => v.presenteHoje === 'presente' ? { ...v, trouxe_revista: true } : v))
  }, [])

  const handleAplicarQuantidades = useCallback(() => {
    const nBiblia = qtdBiblias !== '' ? Math.max(0, parseInt(qtdBiblias) || 0) : null
    const nRevista = qtdRevistas !== '' ? Math.max(0, parseInt(qtdRevistas) || 0) : null
    if (nBiblia === null && nRevista === null) return
    setAlunos(prev => {
      const presentes = prev.filter(a => a.presente === 'presente')
      return prev.map(a => {
        if (a.presente !== 'presente') return a
        const idx = presentes.findIndex(p => p.aluno_id === a.aluno_id)
        return {
          ...a,
          trouxe_biblia: nBiblia !== null ? idx < nBiblia : a.trouxe_biblia,
          trouxe_revista: nRevista !== null ? idx < nRevista : a.trouxe_revista,
        }
      })
    })
    setQtdBiblias('')
    setQtdRevistas('')
  }, [qtdBiblias, qtdRevistas])

  // ── Handlers Visitantes ──────────────────────────────────────────────────────

  const handleMarcarPresencaVisitante = useCallback((visitanteId: string, status: 'presente' | 'ausente') => {
    setVisitantes(prev => prev.map(v =>
      v.id === visitanteId
        ? { ...v, presenteHoje: status, trouxe_biblia: status === 'ausente' ? false : v.trouxe_biblia, trouxe_revista: status === 'ausente' ? false : v.trouxe_revista }
        : v
    ))
  }, [])

  const handleToggleVisitanteBiblia = useCallback((visitanteId: string) =>
    setVisitantes(prev => prev.map(v => v.id === visitanteId ? { ...v, trouxe_biblia: !v.trouxe_biblia } : v)),
  [])

  const handleToggleVisitanteRevista = useCallback((visitanteId: string) =>
    setVisitantes(prev => prev.map(v => v.id === visitanteId ? { ...v, trouxe_revista: !v.trouxe_revista } : v)),
  [])

  const handleRemoverVisitante = useCallback((visitanteId: string) => {
    setVisitantes(prev => prev.filter(v => v.id !== visitanteId))
  }, [])

  const handleAdicionarVisitante = useCallback(() => {
    if (!novoVisitante.nome.trim()) {
      toast('Por favor, preencha o nome do visitante.', 'error')
      return
    }
    const visitante: Visitante = {
      id: `new_${Date.now()}`,
      isNovo: true,
      nome: novoVisitante.nome.trim(),
      telefone: novoVisitante.telefone,
      observacao: novoVisitante.observacao,
      presenteHoje: 'presente',
      trouxe_biblia: false,
      trouxe_revista: false,
      historico: [],
      totalVisitas: 0,
    }
    setVisitantes(prev => [...prev, visitante])
    setNovoVisitante({ nome: '', telefone: '', observacao: '' })
    setDialogVisitanteOpen(false)
  }, [novoVisitante])

  const handleConverterEmAluno = async (visitanteId: string) => {
    const visitante = visitantes.find(v => v.id === visitanteId)
    if (!visitante) return
    if (!confirm(`Converter ${visitante.nome} em aluno da turma "${turma.nome}"?\n\nUm registro de aluno será criado automaticamente.`)) return

    const result = await converterVisitanteEmAluno(
      visitante.isNovo ? null : visitante.id,
      visitante.nome,
      visitante.telefone || null,
      turmaId,
    )
    if (!result.success || !result.alunoId) { toast('Erro ao converter visitante em aluno.', 'error'); return }

    toast(`${visitante.nome} convertido em aluno com sucesso!`)
    setVisitantes(prev => prev.filter(v => v.id !== visitanteId))
    setAlunos(prev => [...prev, {
      aluno_id: result.alunoId!,
      nome: visitante.nome,
      presente: 'presente',
      trouxe_biblia: visitante.trouxe_biblia,
      trouxe_revista: visitante.trouxe_revista,
      justificativa: '',
      isProfessor: false,
      professorId: null,
      cargo: '',
      dadoAula: false,
      turmaDaAulaId: null,
      turmaDaAulaNome: null,
    }])
  }

  // ── Salvar Chamada ───────────────────────────────────────────────────────────

  const handleSalvarChamada = async () => {
    setSalvando(true)
    try {
      const result = await salvarChamada({
        turmaId,
        data: dataSelecionada,
        oferta: ofertaCents / 100,
        anotacoes,
        presencas: alunos.map(a => ({
          aluno_id: a.aluno_id,
          presente: a.presente === 'presente',
          trouxe_biblia: a.presente === 'presente' ? a.trouxe_biblia : false,
          trouxe_revista: a.presente === 'presente' ? a.trouxe_revista : false,
          justificativa: a.justificativa || null,
        })),
        visitantes: visitantes.map(v => ({
          id: v.isNovo ? null : v.id,
          nome: v.nome,
          telefone: v.telefone || null,
          observacao: v.observacao || null,
          presente: v.presenteHoje === 'presente',
          trouxe_biblia: v.trouxe_biblia,
          trouxe_revista: v.trouxe_revista,
        })),
      })

      if (!result.success) {
        toast('Erro ao salvar chamada: ' + (result.error ?? 'erro desconhecido'), 'error')
        return
      }

      toast('Chamada salva com sucesso!')
      router.push('/chamada')
    } catch (e: any) {
      toast('Erro ao salvar chamada: ' + (e?.message ?? 'erro inesperado'), 'error')
    } finally {
      setSalvando(false)
    }
  }

  // ── Resumo ───────────────────────────────────────────────────────────────────

  const totalPresentes = useMemo(() => alunos.filter(a => a.presente === 'presente').length, [alunos])
  const totalAusentes  = useMemo(() => alunos.filter(a => a.presente === 'ausente').length, [alunos])
  const totalPendentes = useMemo(() => alunos.filter(a => a.presente === 'pendente').length, [alunos])

  const visitantesPresentes = useMemo(() => visitantes.filter(v => v.presenteHoje === 'presente'), [visitantes])

  const resumo = useMemo(() => ({
    matriculados: alunos.length,
    presentes: totalPresentes,
    faltas: totalAusentes,
    pendentes: totalPendentes,
    visitantes: visitantesPresentes.length,
    total: totalPresentes + visitantesPresentes.length,
    biblias: alunos.filter(a => a.trouxe_biblia).length + visitantesPresentes.filter(v => v.trouxe_biblia).length,
    revistas: alunos.filter(a => a.trouxe_revista).length + visitantesPresentes.filter(v => v.trouxe_revista).length,
    percentual_presenca: alunos.length > 0
      ? Math.round((totalPresentes / alunos.length) * 100)
      : 0,
  }), [alunos, totalPresentes, totalAusentes, totalPendentes, visitantesPresentes])

  // ── Histórico de presença de visitante ────────────────────────────────────

  const renderIndicadorPresencas = (visitante: Visitante) => {
    const domingosPrev = getUltimosDomingosAntesde(dataSelecionada, 3).reverse()

    return (
      <div className="flex gap-1.5 items-center">
        {domingosPrev.map((data, index) => {
          const reg = visitante.historico.find(h => h.data === data)
          return (
            <div key={index} className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                !reg ? 'border-2 border-muted-foreground/30' :
                reg.presente ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {!reg ? <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" /> :
                 reg.presente ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> :
                 <XCircle className="h-3.5 w-3.5 text-white" />}
              </div>
              <span className="text-[9px] text-muted-foreground">
                {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div className="flex flex-col items-center gap-0.5">
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold
            ${visitante.presenteHoje === 'presente' ? 'bg-green-500 border-green-500 text-white' :
              visitante.presenteHoje === 'ausente' ? 'bg-red-500 border-red-500 text-white' :
              'border-yellow-400 text-yellow-500'}`}>
            {visitante.presenteHoje === 'presente' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
             visitante.presenteHoje === 'ausente' ? <XCircle className="h-3.5 w-3.5" /> : '?'}
          </div>
          <span className="text-[9px] text-yellow-500 font-medium">Hoje</span>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/chamada')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-2">
            <div className="h-6 w-40 bg-muted animate-pulse rounded" />
            <div className="h-4 w-56 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-3 space-y-1.5">
              <div className="h-3 w-12 bg-muted animate-pulse rounded" />
              <div className="h-6 w-8 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
              <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header compacto */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="flex-shrink-0 h-9 w-9" onClick={() => router.push('/chamada')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{turma.nome || 'Turma'}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {formatarDomingo(dataSelecionada)}
            {turma.sala ? ` · ${turma.sala}` : ''}
          </p>
        </div>
        {/* Botao salvar no header — desktop */}
        <Button className="hidden lg:flex" onClick={handleSalvarChamada} disabled={salvando}>
          <Save className="h-4 w-4 mr-2" />
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Mini resumo sticky no mobile */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-4 gap-0">
          <div className="flex flex-col items-center py-2 px-1 border-r">
            <span className="text-lg font-bold" style={{ color: corPresenca(resumo.percentual_presenca) }}>{resumo.percentual_presenca}%</span>
            <span className="text-[9px] text-muted-foreground">Presença</span>
          </div>
          <div className="flex flex-col items-center py-2 px-1 border-r">
            <span className="text-lg font-bold text-green-600">{resumo.presentes}</span>
            <span className="text-[9px] text-muted-foreground">Pres.</span>
          </div>
          <div className="flex flex-col items-center py-2 px-1 border-r">
            <span className="text-lg font-bold text-red-600">{resumo.faltas}</span>
            <span className="text-[9px] text-muted-foreground">Faltas</span>
          </div>
          <div className="flex flex-col items-center py-2 px-1">
            <span className="text-lg font-bold text-yellow-600">{resumo.pendentes}</span>
            <span className="text-[9px] text-muted-foreground">Pend.</span>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-muted/30 border-t">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${resumo.percentual_presenca}%`, backgroundColor: corPresenca(resumo.percentual_presenca) }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-4">

          {/* Lista de Alunos */}
          <Card>
            <CardHeader className="pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Lista de Presença</CardTitle>
                <Badge variant="secondary" className="text-[10px]">{alunos.length} alunos</Badge>
              </div>
              {alunos.some(a => a.presente === 'presente') && (
                <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-muted/50 rounded-lg text-sm">
                  <span className="text-[10px] font-medium text-muted-foreground shrink-0">Rápido:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      <Book className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="number"
                        className="h-6 w-12 text-center text-xs px-1"
                        placeholder="Qtd"
                        min={0}
                        max={resumo.presentes}
                        value={qtdBiblias}
                        onChange={e => setQtdBiblias(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="number"
                        className="h-6 w-12 text-center text-xs px-1"
                        placeholder="Qtd"
                        min={0}
                        max={resumo.presentes}
                        value={qtdRevistas}
                        onChange={e => setQtdRevistas(e.target.value)}
                      />
                    </div>
                    <Button size="sm" className="h-6 px-2 text-[10px]" onClick={handleAplicarQuantidades}>
                      Aplicar
                    </Button>
                    <div className="hidden sm:flex items-center gap-1">
                      <span className="text-muted-foreground text-[10px]">todos:</span>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={handleMarcarTodosBiblia}>
                        <Book className="h-2.5 w-2.5 mr-0.5" /> Bíblia
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={handleMarcarTodosRevista}>
                        <BookOpen className="h-2.5 w-2.5 mr-0.5" /> Revista
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {alunos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhum aluno cadastrado nesta turma</p>
              ) : (
                alunos.map((aluno, index) => (
                  <AlunoRow
                    key={aluno.aluno_id}
                    aluno={aluno}
                    index={index}
                    turmaId={turmaId}
                    onPresenca={handleMarcarPresenca}
                    onBiblia={handleToggleBiblia}
                    onRevista={handleToggleRevista}
                    onJustificativa={handleJustificativaChange}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Visitantes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Visitantes</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Visitantes do trimestre aparecem automaticamente</p>
                </div>
                <Button size="sm" onClick={() => setDialogVisitanteOpen(true)} className="h-8">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Novo Visitante</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {visitantes.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  Nenhum visitante registrado
                </p>
              ) : (
                visitantes.map((visitante) => {
                  const visitasConfirmadas = visitante.historico.filter(h => h.presente).length +
                    (visitante.presenteHoje === 'presente' ? 1 : 0)
                  const podeConverter = visitasConfirmadas >= 3

                  return (
                    <div key={visitante.id} className={`p-3 border rounded-lg space-y-2.5 ${podeConverter ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                      {/* Cabeçalho */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-medium text-sm">{visitante.nome}</h4>
                            {visitante.isNovo && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-400 text-blue-400">Novo</Badge>
                            )}
                            {podeConverter && (
                              <Badge className="bg-green-500 text-[10px] px-1.5 py-0">
                                <PartyPopper className="h-2.5 w-2.5 mr-0.5" />
                                {visitasConfirmadas} visitas
                              </Badge>
                            )}
                          </div>
                          {visitante.telefone && (
                            <p className="text-xs text-muted-foreground">{visitante.telefone}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => handleRemoverVisitante(visitante.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>

                      {/* Histórico */}
                      <div className="space-y-1.5">
                        {renderIndicadorPresencas(visitante)}
                        <Progress value={(Math.min(visitasConfirmadas, 3) / 3) * 100} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">{visitasConfirmadas}/3 visitas</p>
                      </div>

                      {/* Botões Presente / Ausente */}
                      <div className="flex gap-1.5">
                        <Button
                          variant={visitante.presenteHoje === 'presente' ? 'default' : 'outline'}
                          size="sm"
                          className={`h-7 text-xs ${visitante.presenteHoje === 'presente' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                          onClick={() => handleMarcarPresencaVisitante(visitante.id, 'presente')}
                        >
                          Presente
                        </Button>
                        <Button
                          variant={visitante.presenteHoje === 'ausente' ? 'default' : 'outline'}
                          size="sm"
                          className={`h-7 text-xs ${visitante.presenteHoje === 'ausente' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                          onClick={() => handleMarcarPresencaVisitante(visitante.id, 'ausente')}
                        >
                          Ausente
                        </Button>
                        {visitante.presenteHoje === 'pendente' && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px]">
                            Pendente
                          </Badge>
                        )}
                      </div>

                      {/* Bíblia / Revista */}
                      {visitante.presenteHoje === 'presente' && (
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center space-x-1.5">
                            <Checkbox
                              id={`vbiblia-${visitante.id}`}
                              checked={visitante.trouxe_biblia}
                              onCheckedChange={() => handleToggleVisitanteBiblia(visitante.id)}
                            />
                            <label htmlFor={`vbiblia-${visitante.id}`} className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                              <Book className="h-3.5 w-3.5" /> Bíblia
                            </label>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Checkbox
                              id={`vrevista-${visitante.id}`}
                              checked={visitante.trouxe_revista}
                              onCheckedChange={() => handleToggleVisitanteRevista(visitante.id)}
                            />
                            <label htmlFor={`vrevista-${visitante.id}`} className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                              <BookOpen className="h-3.5 w-3.5" /> Revista
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Botão converter */}
                      {podeConverter && (
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => handleConverterEmAluno(visitante.id)}>
                          <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                          Converter em Aluno
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral - Resumo */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Presença destaque */}
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <span className="text-3xl font-bold" style={{ color: corPresenca(resumo.percentual_presenca) }}>{resumo.percentual_presenca}%</span>
                <p className="text-xs text-muted-foreground mt-0.5">de presença</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${resumo.percentual_presenca}%`, backgroundColor: corPresenca(resumo.percentual_presenca) }} />
                </div>
              </div>

              {/* Grid de stats — ordem: Matriculados, Ausentes, Presentes, Visitantes, Total, Bíblias, Revistas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg border">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-bold">{resumo.matriculados}</div>
                    <div className="text-[10px] text-muted-foreground">Matriculados</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg border">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-sm font-bold text-red-600">{resumo.faltas}</div>
                    <div className="text-[10px] text-muted-foreground">Ausentes</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg border">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-sm font-bold text-green-600">{resumo.presentes}</div>
                    <div className="text-[10px] text-muted-foreground">Presentes</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg border">
                  <UserPlus className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-bold text-blue-600">{resumo.visitantes}</div>
                    <div className="text-[10px] text-muted-foreground">Visitantes</div>
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-muted/40 border">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-bold">{resumo.total}</div>
                    <div className="text-[10px] text-muted-foreground">Total (presentes + visitantes)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <Book className="h-4 w-4 text-purple-500" />
                  <div>
                    <div className="text-sm font-bold text-purple-600">{resumo.biblias}</div>
                    <div className="text-[10px] text-muted-foreground">Bíblias</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <BookOpen className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="text-sm font-bold text-orange-600">{resumo.revistas}</div>
                    <div className="text-[10px] text-muted-foreground">Revistas</div>
                  </div>
                </div>
              </div>

              {/* Oferta */}
              <div className="border-t pt-3 space-y-1.5">
                <Label htmlFor="oferta" className="text-xs flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-green-500" />
                  Oferta (R$)
                </Label>
                <Input
                  id="oferta"
                  type="text"
                  inputMode="numeric"
                  value={(ofertaCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setOfertaCents(digits ? Math.min(parseInt(digits, 10), 9999999) : 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key >= '0' && e.key <= '9') {
                      e.preventDefault()
                      setOfertaCents(prev => Math.min(prev * 10 + parseInt(e.key), 9999999))
                    } else if (e.key === 'Backspace') {
                      e.preventDefault()
                      setOfertaCents(prev => Math.floor(prev / 10))
                    } else if (e.key === 'Delete') {
                      e.preventDefault()
                      setOfertaCents(0)
                    }
                  }}
                  className="text-right font-mono tabular-nums h-9"
                />
              </div>

              {/* Anotações */}
              <div className="border-t pt-3 space-y-1.5">
                <Label htmlFor="anotacoes" className="text-xs">Anotações</Label>
                <Textarea
                  id="anotacoes"
                  placeholder="Observações..."
                  rows={3}
                  value={anotacoes}
                  onChange={(e) => setAnotacoes(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Salvar — desktop */}
              <Button className="w-full hidden lg:flex" onClick={handleSalvarChamada} disabled={salvando}>
                <Save className="h-4 w-4 mr-2" />
                {salvando ? 'Salvando...' : 'Salvar Chamada'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Adicionar Visitante */}
      <AdicionarVisitanteDialog
        open={dialogVisitanteOpen}
        onClose={() => setDialogVisitanteOpen(false)}
        novoVisitante={novoVisitante}
        onChange={setNovoVisitante}
        onAdicionar={handleAdicionarVisitante}
      />

      {/* Botão salvar sticky mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-3 z-20">
        <Button className="w-full h-11" onClick={handleSalvarChamada} disabled={salvando}>
          <Save className="h-4 w-4 mr-2" />
          {salvando ? 'Salvando...' : 'Salvar Chamada'}
        </Button>
      </div>
    </div>
  )
}

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
} from 'lucide-react'
import { formatarDomingo, converterParaISO } from '@/lib/chamada-utils'
import { supabase } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'
import { calcularPct } from '@/lib/presence'
import { toast } from '@/lib/toast'
import { getCargo } from '@/lib/constants'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface AlunoPresenca {
  aluno_id: string
  nome: string
  presente: 'presente' | 'ausente' | 'pendente'
  trouxe_biblia: boolean
  trouxe_revista: boolean
  justificativa: string
  // Informações extras para identificação na lista
  isProfessor: boolean
  professorId: string | null   // ID do professor (extraído de responsavel)
  cargo: string                // Cargo eclesiástico
  dadoAula: boolean            // Está na escala hoje (qualquer turma)
  turmaDaAulaId: string | null    // ID da turma onde está lecionando hoje
  turmaDaAulaNome: string | null  // Nome da turma onde está lecionando hoje
}

interface HistoricoItem {
  data: string         // ISO 'YYYY-MM-DD'
  presente: boolean | null  // null = sem registro
}

interface Visitante {
  // id real do banco (UUID) ou id temporário 'new_<timestamp>' para novos
  id: string
  isNovo: boolean       // true = ainda não salvo no banco
  nome: string
  telefone: string
  observacao: string
  // presença no dia atual (o que o usuário marcou na tela)
  presenteHoje: 'presente' | 'ausente' | 'pendente'
  trouxe_biblia: boolean
  trouxe_revista: boolean
  // histórico das últimas visitas (sem o dia atual)
  historico: HistoricoItem[]
  totalVisitas: number  // contagem total de visitas confirmadas
}

interface TurmaInfo {
  id: string
  nome: string
  sala: string
  professor: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Últimos N domingos a partir de uma data base (sem incluir ela) */
function getUltimosDomingosAntesde(dataISO: string, n: number): string[] {
  const base = new Date(dataISO + 'T12:00:00')
  const domingos: string[] = []
  let cursor = new Date(base)
  cursor.setDate(cursor.getDate() - 7) // começa no domingo anterior
  while (domingos.length < n) {
    // garante que é domingo (0)
    const dow = cursor.getDay()
    if (dow !== 0) {
      // ajusta para o domingo mais próximo anterior
      cursor.setDate(cursor.getDate() - dow)
    }
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

  // ── Busca inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchDados() {
      const db = supabase as any

      // 1. Dados da turma
      const { data: turmaData } = await db
        .from('turmas')
        .select('id, nome, sala')
        .eq('id', turmaId)
        .single() as { data: { id: string; nome: string; sala: string | null } | null }
      if (turmaData) setTurma({ id: turmaData.id, nome: turmaData.nome, sala: turmaData.sala ?? '', professor: '' })

      // 2. Alunos da turma (com responsavel e cargo para identificar professores)
      const { data: alunosData } = await db
        .from('alunos')
        .select('id, nome, responsavel, cargo')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome') as { data: { id: string; nome: string; responsavel: string | null; cargo: string | null }[] | null }

      // 2b. Escala do dia: todos os professores escalados hoje (qualquer turma)
      const { data: escalaDia } = await db
        .from('escalas')
        .select('professor_id, turma_id')
        .eq('data', dataSelecionada) as { data: { professor_id: string; turma_id: string }[] | null }

      // Buscar nomes das turmas da escala
      const turmaIdsEscala = [...new Set((escalaDia ?? []).map(e => e.turma_id))]
      const turmaNomesEscala: Record<string, string> = {}
      if (turmaIdsEscala.length > 0) {
        const { data: turmasEscala } = await db.from('turmas').select('id, nome').in('id', turmaIdsEscala)
        for (const t of turmasEscala ?? []) turmaNomesEscala[t.id] = t.nome
      }
      // Map: professorId → { turmaId, turmaNome }
      const professorEscalaMap = new Map<string, { turmaId: string; turmaNome: string }>()
      for (const e of escalaDia ?? []) {
        professorEscalaMap.set(e.professor_id, { turmaId: e.turma_id, turmaNome: turmaNomesEscala[e.turma_id] ?? '' })
      }

      // 3. Chamada existente para o dia
      const { data: chamadaExistente } = await db
        .from('chamadas')
        .select('id, oferta, anotacoes, presencas(aluno_id, presente, trouxe_biblia, trouxe_revista, justificativa)')
        .eq('turma_id', turmaId)
        .eq('data', dataSelecionada)
        .single() as { data: { id: string; oferta: number; anotacoes: string | null; presencas: any[] } | null }

      if (chamadaExistente) {
        setOfertaCents(Math.round((chamadaExistente.oferta || 0) * 100))
        setAnotacoes(chamadaExistente.anotacoes ?? '')
        const presencasMap = new Map((chamadaExistente.presencas as any[]).map(p => [p.aluno_id, p]))
        setAlunos(
          (alunosData ?? []).map(a => {
            const p = presencasMap.get(a.id)
            const profId = (a.responsavel ?? '').startsWith('professor:')
              ? (a.responsavel as string).replace('professor:', '')
              : null
            return {
              aluno_id: a.id,
              nome: a.nome,
              presente: p ? (p.presente ? 'presente' : 'ausente') : 'pendente',
              trouxe_biblia: p?.trouxe_biblia ?? false,
              trouxe_revista: p?.trouxe_revista ?? false,
              justificativa: p?.justificativa ?? '',
              isProfessor: profId !== null,
              professorId: profId,
              cargo: a.cargo ?? '',
              dadoAula: profId !== null && professorEscalaMap.has(profId),
              turmaDaAulaId: profId ? (professorEscalaMap.get(profId)?.turmaId ?? null) : null,
              turmaDaAulaNome: profId ? (professorEscalaMap.get(profId)?.turmaNome ?? null) : null,
            }
          })
        )
      } else {
        setOfertaCents(0)
        setAnotacoes('')
        setAlunos(
          (alunosData ?? []).map(a => {
            const profId = (a.responsavel ?? '').startsWith('professor:')
              ? (a.responsavel as string).replace('professor:', '')
              : null
            return {
              aluno_id: a.id,
              nome: a.nome,
              presente: 'pendente' as const,
              trouxe_biblia: false,
              trouxe_revista: false,
              justificativa: '',
              isProfessor: profId !== null,
              professorId: profId,
              cargo: a.cargo ?? '',
              dadoAula: profId !== null && professorEscalaMap.has(profId),
              turmaDaAulaId: profId ? (professorEscalaMap.get(profId)?.turmaId ?? null) : null,
              turmaDaAulaNome: profId ? (professorEscalaMap.get(profId)?.turmaNome ?? null) : null,
            }
          })
        )
      }

      // 4. Visitantes: buscar TODOS que já visitaram esta turma antes + os do dia atual
      //    Busca todos os historico_visitantes desta turma (sem filtro de data)
      const { data: todoHistorico } = await db
        .from('historico_visitantes')
        .select('visitante_id, data, presente, trouxe_biblia, trouxe_revista, visitantes(id, nome, telefone, observacao)')
        .eq('turma_id', turmaId)
        .order('data', { ascending: false }) as {
          data: {
            visitante_id: string
            data: string
            presente: boolean
            trouxe_biblia: boolean
            trouxe_revista: boolean
            visitantes: { id: string; nome: string; telefone: string | null; observacao: string | null } | null
          }[] | null
        }

      if (todoHistorico && todoHistorico.length > 0) {
        // Agrupar por visitante_id
        const porVisitante = new Map<string, typeof todoHistorico>()
        for (const h of todoHistorico) {
          if (!porVisitante.has(h.visitante_id)) porVisitante.set(h.visitante_id, [])
          porVisitante.get(h.visitante_id)!.push(h)
        }

        const visitantesCarregados: Visitante[] = []
        for (const [visitanteId, registros] of porVisitante.entries()) {
          const dadosVisitante = registros[0].visitantes
          if (!dadosVisitante) continue

          // Registro do dia atual (se existir)
          const registroDia = registros.find(r => r.data === dataSelecionada)
          // Histórico sem o dia atual (para mostrar visitas anteriores)
          const historicoAnterior = registros
            .filter(r => r.data !== dataSelecionada)
            .slice(0, 3) // últimas 3 visitas anteriores
            .map(r => ({ data: r.data, presente: r.presente }))

          const totalVisitas = registros.filter(r => r.presente).length

          visitantesCarregados.push({
            id: visitanteId,
            isNovo: false,
            nome: dadosVisitante.nome,
            telefone: dadosVisitante.telefone ?? '',
            observacao: dadosVisitante.observacao ?? '',
            presenteHoje: registroDia
              ? (registroDia.presente ? 'presente' : 'ausente')
              : 'pendente',
            trouxe_biblia: registroDia?.trouxe_biblia ?? false,
            trouxe_revista: registroDia?.trouxe_revista ?? false,
            historico: historicoAnterior,
            totalVisitas,
          })
        }

        setVisitantes(visitantesCarregados)
      } else {
        setVisitantes([])
      }
    }

    fetchDados()
  }, [turmaId, dataSelecionada])

  // ── Handlers Alunos ──────────────────────────────────────────────────────────

  const handleMarcarPresenca = (alunoId: string, status: 'presente' | 'ausente') => {
    setAlunos(alunos.map(a =>
      a.aluno_id === alunoId
        ? { ...a, presente: status, trouxe_biblia: status === 'ausente' ? false : a.trouxe_biblia, trouxe_revista: status === 'ausente' ? false : a.trouxe_revista }
        : a
    ))
  }

  const handleToggleBiblia = (alunoId: string) =>
    setAlunos(alunos.map(a => a.aluno_id === alunoId ? { ...a, trouxe_biblia: !a.trouxe_biblia } : a))

  const handleToggleRevista = (alunoId: string) =>
    setAlunos(alunos.map(a => a.aluno_id === alunoId ? { ...a, trouxe_revista: !a.trouxe_revista } : a))

  const handleJustificativaChange = (alunoId: string, justificativa: string) =>
    setAlunos(alunos.map(a => a.aluno_id === alunoId ? { ...a, justificativa } : a))

  // ── Handlers Visitantes ──────────────────────────────────────────────────────

  const handleMarcarPresencaVisitante = (visitanteId: string, status: 'presente' | 'ausente') => {
    setVisitantes(visitantes.map(v =>
      v.id === visitanteId
        ? { ...v, presenteHoje: status, trouxe_biblia: status === 'ausente' ? false : v.trouxe_biblia, trouxe_revista: status === 'ausente' ? false : v.trouxe_revista }
        : v
    ))
  }

  const handleToggleVisitanteBiblia = (visitanteId: string) =>
    setVisitantes(visitantes.map(v => v.id === visitanteId ? { ...v, trouxe_biblia: !v.trouxe_biblia } : v))

  const handleToggleVisitanteRevista = (visitanteId: string) =>
    setVisitantes(visitantes.map(v => v.id === visitanteId ? { ...v, trouxe_revista: !v.trouxe_revista } : v))

  const handleRemoverVisitante = (visitanteId: string) => {
    setVisitantes(visitantes.filter(v => v.id !== visitanteId))
  }

  const handleAdicionarVisitante = () => {
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
      presenteHoje: 'presente', // novo visitante já é presente por padrão
      trouxe_biblia: false,
      trouxe_revista: false,
      historico: [],
      totalVisitas: 0,
    }
    setVisitantes([...visitantes, visitante])
    setNovoVisitante({ nome: '', telefone: '', observacao: '' })
    setDialogVisitanteOpen(false)
  }

  const handleConverterEmAluno = async (visitanteId: string) => {
    const visitante = visitantes.find(v => v.id === visitanteId)
    if (!visitante) return
    if (!confirm(`Converter ${visitante.nome} em aluno da turma "${turma.nome}"?\n\nUm registro de aluno será criado automaticamente.`)) return

    const db = supabase as any
    const { data: novoAluno, error } = await db
      .from('alunos')
      .insert({ nome: visitante.nome, telefone: visitante.telefone || null, turma_id: turmaId, ativo: true })
      .select('id')
      .single()
    if (error || !novoAluno) { toast('Erro ao converter visitante em aluno.', 'error'); return }

    // Marcar visitante como convertido
    if (!visitante.isNovo) {
      await db.from('visitantes').update({ convertido_em_aluno: true, aluno_id: novoAluno.id }).eq('id', visitanteId)
    }

    toast(`${visitante.nome} convertido em aluno com sucesso!`)
    // Remover da lista de visitantes (vai aparecer como aluno)
    setVisitantes(visitantes.filter(v => v.id !== visitanteId))
    // Adicionar na lista de alunos imediatamente
    setAlunos([...alunos, {
      aluno_id: novoAluno.id,
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
      const db = supabase as any

      // 1. Upsert da chamada
      const { data: chamada, error: errChamada } = await db
        .from('chamadas')
        .upsert(
          { turma_id: turmaId, data: dataSelecionada, ano: parseInt(dataSelecionada.split('-')[0]), oferta: ofertaCents / 100, anotacoes },
          { onConflict: 'turma_id,data' }
        )
        .select('id')
        .single()

      if (errChamada || !chamada) {
        toast('Erro ao salvar chamada: ' + (errChamada?.message ?? 'desconhecido'), 'error')
        setSalvando(false)
        return
      }

      // 2. Upsert de presenças dos alunos (pendente → ausente)
      const presencasPayload = alunos.map(a => ({
        chamada_id: chamada.id,
        aluno_id: a.aluno_id,
        presente: a.presente === 'presente',
        trouxe_biblia: a.presente === 'presente' ? a.trouxe_biblia : false,
        trouxe_revista: a.presente === 'presente' ? a.trouxe_revista : false,
        justificativa: a.justificativa || null,
      }))

      if (presencasPayload.length > 0) {
        await db.from('presencas').upsert(presencasPayload, { onConflict: 'chamada_id,aluno_id' })
      }

      // 3. Salvar visitantes (todos, inclusive pendentes são ignorados)
      for (const v of visitantes) {
        // Pendente = não marcar nada, mas se for novo e ainda pendente, também ignora
        if (v.presenteHoje === 'pendente' && !v.isNovo) continue
        if (v.presenteHoje === 'pendente') continue

        let visitanteId: string | null = v.isNovo ? null : v.id

        if (v.isNovo) {
          // Criar visitante novo no banco
          const { data: visitanteSalvo, error: errV } = await db
            .from('visitantes')
            .insert({ nome: v.nome, telefone: v.telefone || null, observacao: v.observacao || null })
            .select('id')
            .single()
          if (errV || !visitanteSalvo) {
            console.error('Erro ao salvar visitante:', errV)
            continue
          }
          visitanteId = visitanteSalvo.id
        } else {
          // Atualizar dados do visitante existente
          await db.from('visitantes')
            .update({ nome: v.nome, telefone: v.telefone || null, observacao: v.observacao || null })
            .eq('id', v.id)
        }

        if (!visitanteId) continue

        // Verificar se já existe registro no histórico para esse visitante/data/turma
        const { data: histExistente } = await db
          .from('historico_visitantes')
          .select('id')
          .eq('visitante_id', visitanteId)
          .eq('data', dataSelecionada)
          .eq('turma_id', turmaId)
          .maybeSingle()

        const histPayload = {
          visitante_id: visitanteId,
          turma_id: turmaId,
          chamada_id: chamada.id,
          data: dataSelecionada,
          presente: v.presenteHoje === 'presente',
          trouxe_biblia: v.trouxe_biblia,
          trouxe_revista: v.trouxe_revista,
        }

        if (histExistente) {
          // Atualizar registro existente
          await db.from('historico_visitantes').update(histPayload).eq('id', histExistente.id)
        } else {
          // Inserir novo registro
          const { error: errHist } = await db.from('historico_visitantes').insert(histPayload)
          if (errHist) console.error('Erro ao salvar histórico visitante:', errHist)
        }
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

  const visitantesPresentes = visitantes.filter(v => v.presenteHoje === 'presente')

  const resumo = {
    matriculados: alunos.length,
    presentes: alunos.filter(a => a.presente === 'presente').length,
    faltas: alunos.filter(a => a.presente === 'ausente').length,
    visitantes: visitantesPresentes.length,
    biblias: alunos.filter(a => a.trouxe_biblia).length + visitantesPresentes.filter(v => v.trouxe_biblia).length,
    revistas: alunos.filter(a => a.trouxe_revista).length + visitantesPresentes.filter(v => v.trouxe_revista).length,
    percentual_presenca: alunos.length > 0
      ? Math.round((alunos.filter(a => a.presente === 'presente').length / alunos.length) * 100)
      : 0,
  }

  // ── Renderizar indicador de histórico de presença ────────────────────────────

  const renderIndicadorPresencas = (visitante: Visitante) => {
    // Pega os 3 últimos domingos ANTES da data atual
    const domingosPrev = getUltimosDomingosAntesde(dataSelecionada, 3).reverse()

    return (
      <div className="flex gap-2 items-center">
        {domingosPrev.map((data, index) => {
          const reg = visitante.historico.find(h => h.data === data)
          if (!reg) {
            // Sem registro nesse domingo
            return (
              <div key={index} className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            )
          }
          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${reg.presente ? 'bg-green-500' : 'bg-red-500'}`}>
                {reg.presente
                  ? <CheckCircle2 className="h-4 w-4 text-white" />
                  : <XCircle className="h-4 w-4 text-white" />
                }
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          )
        })}
        {/* Hoje */}
        <div className="flex flex-col items-center gap-1">
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm
            ${visitante.presenteHoje === 'presente' ? 'bg-green-500 border-green-500 text-white' :
              visitante.presenteHoje === 'ausente' ? 'bg-red-500 border-red-500 text-white' :
              'border-yellow-400 text-yellow-400'}`}>
            {visitante.presenteHoje === 'presente' ? <CheckCircle2 className="h-4 w-4" /> :
             visitante.presenteHoje === 'ausente' ? <XCircle className="h-4 w-4" /> : '?'}
          </div>
          <span className="text-[10px] text-yellow-400 font-medium">Hoje</span>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="flex-shrink-0" onClick={() => router.push('/chamada')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">{turma.nome || 'Turma'}</h1>
            <p className="text-muted-foreground mt-1">
              {formatarDomingo(dataSelecionada)}
              {turma.professor ? ` • Professor: ${turma.professor}` : ''}
              {turma.sala ? ` • ${turma.sala}` : ''}
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
                <p className="text-center text-muted-foreground py-8">Nenhum aluno cadastrado nesta turma</p>
              ) : (
                alunos.map((aluno, index) => {
                  const cargoInfo = getCargo(aluno.cargo)
                  return (
                  <div
                    key={aluno.aluno_id}
                    className={`p-4 border rounded-lg space-y-3 ${aluno.dadoAula ? 'border-red-500/60 bg-red-500/5' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{aluno.nome}</span>
                            {aluno.isProfessor && (
                              <Badge variant="outline" className="text-xs border-blue-400 text-blue-400 px-1.5 py-0">
                                Professor
                              </Badge>
                            )}
                            {cargoInfo && (
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                                style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}
                              >
                                {cargoInfo.label}
                              </span>
                            )}
                          </div>
                          {aluno.dadoAula && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <GraduationCap className="h-3 w-3 text-red-400" />
                              <span className="text-[11px] font-semibold text-red-400">
                                {aluno.turmaDaAulaId === turmaId
                                  ? 'Lecionando hoje nesta turma'
                                  : `Lecionando hoje em: ${aluno.turmaDaAulaNome}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={aluno.presente === 'presente' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleMarcarPresenca(aluno.aluno_id, 'presente')}
                          className={aluno.presente === 'presente' ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          Presente
                        </Button>
                        <Button
                          variant={aluno.presente === 'ausente' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleMarcarPresenca(aluno.aluno_id, 'ausente')}
                          className={aluno.presente === 'ausente' ? 'bg-red-500 hover:bg-red-600' : ''}
                        >
                          Ausente
                        </Button>
                        {aluno.presente === 'pendente' && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                    {aluno.presente === 'presente' && (
                      <div className="flex flex-wrap gap-4 sm:gap-6 ml-8 sm:ml-11">
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`biblia-${aluno.aluno_id}`} checked={aluno.trouxe_biblia} onCheckedChange={() => handleToggleBiblia(aluno.aluno_id)} />
                          <label htmlFor={`biblia-${aluno.aluno_id}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                            <Book className="h-4 w-4" /> Trouxe Bíblia
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`revista-${aluno.aluno_id}`} checked={aluno.trouxe_revista} onCheckedChange={() => handleToggleRevista(aluno.aluno_id)} />
                          <label htmlFor={`revista-${aluno.aluno_id}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                            <BookOpen className="h-4 w-4" /> Trouxe Revista
                          </label>
                        </div>
                      </div>
                    )}
                    {aluno.presente === 'ausente' && (
                      <div className="ml-8 sm:ml-11 space-y-2">
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
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Visitantes */}
          <Card>
            <CardHeader>
              <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle>Visitantes</CardTitle>
                  <CardDescription>
                    Visitantes anteriores aparecem automaticamente — marque presença ou ausência
                  </CardDescription>
                </div>
                <Button onClick={() => setDialogVisitanteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Visitante
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visitantes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum visitante registrado para esta turma
                </p>
              ) : (
                visitantes.map((visitante) => {
                  const totalComHoje = visitante.totalVisitas + (visitante.presenteHoje === 'presente' ? (visitante.isNovo ? 1 : 0) : 0)
                  // Contagem real: histórico com presente=true + hoje se presente
                  const visitasConfirmadas = visitante.historico.filter(h => h.presente).length +
                    (visitante.presenteHoje === 'presente' ? 1 : 0)
                  const podeConverter = visitasConfirmadas >= 3

                  return (
                    <div key={visitante.id} className={`p-4 border rounded-lg space-y-3 ${podeConverter ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                      {/* Cabeçalho */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium">{visitante.nome}</h4>
                            {visitante.isNovo && (
                              <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">Novo</Badge>
                            )}
                            {podeConverter && (
                              <Badge className="bg-green-500 text-xs">
                                <PartyPopper className="h-3 w-3 mr-1" />
                                {visitasConfirmadas} visitas — Pronto para ser aluno!
                              </Badge>
                            )}
                          </div>
                          {visitante.telefone && (
                            <p className="text-sm text-muted-foreground">{visitante.telefone}</p>
                          )}
                          {visitante.observacao && (
                            <p className="text-xs text-muted-foreground mt-1">{visitante.observacao}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoverVisitante(visitante.id)}
                          title="Remover da lista hoje"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {/* Histórico + presença hoje */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Histórico de Presenças</Label>
                        {renderIndicadorPresencas(visitante)}
                        <Progress value={(Math.min(visitasConfirmadas, 3) / 3) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {visitasConfirmadas}/3 visitas confirmadas
                        </p>
                      </div>

                      {/* Botões Presente / Ausente */}
                      <div className="flex gap-2">
                        <Button
                          variant={visitante.presenteHoje === 'presente' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleMarcarPresencaVisitante(visitante.id, 'presente')}
                          className={visitante.presenteHoje === 'presente' ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          Presente
                        </Button>
                        <Button
                          variant={visitante.presenteHoje === 'ausente' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleMarcarPresencaVisitante(visitante.id, 'ausente')}
                          className={visitante.presenteHoje === 'ausente' ? 'bg-red-500 hover:bg-red-600' : ''}
                        >
                          Ausente
                        </Button>
                        {visitante.presenteHoje === 'pendente' && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Pendente
                          </Badge>
                        )}
                      </div>

                      {/* Bíblia / Revista (só se presente) */}
                      {visitante.presenteHoje === 'presente' && (
                        <div className="flex flex-wrap gap-4 sm:gap-6">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`vbiblia-${visitante.id}`}
                              checked={visitante.trouxe_biblia}
                              onCheckedChange={() => handleToggleVisitanteBiblia(visitante.id)}
                            />
                            <label htmlFor={`vbiblia-${visitante.id}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                              <Book className="h-4 w-4" /> Trouxe Bíblia
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`vrevista-${visitante.id}`}
                              checked={visitante.trouxe_revista}
                              onCheckedChange={() => handleToggleVisitanteRevista(visitante.id)}
                            />
                            <label htmlFor={`vrevista-${visitante.id}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                              <BookOpen className="h-4 w-4" /> Trouxe Revista
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Botão converter */}
                      {podeConverter && (
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleConverterEmAluno(visitante.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
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
        <div className="space-y-6">
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
                  <span className="font-semibold text-green-600">{resumo.presentes} ({resumo.percentual_presenca}%)</span>
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
                  type="text"
                  inputMode="numeric"
                  value={(ofertaCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  onChange={() => {}}
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
                    } else if (!['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  className="text-right font-mono tabular-nums"
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

              <Button className="w-full" onClick={handleSalvarChamada} disabled={salvando}>
                <Save className="h-4 w-4 mr-2" />
                {salvando ? 'Salvando...' : 'Salvar Chamada'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Adicionar Visitante */}
      <Dialog open={dialogVisitanteOpen} onOpenChange={setDialogVisitanteOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Visitante</DialogTitle>
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
            <Button variant="outline" onClick={() => setDialogVisitanteOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdicionarVisitante}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Botão salvar sticky — visível apenas no mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-20">
        <Button className="w-full" size="lg" onClick={handleSalvarChamada} disabled={salvando}>
          <Save className="h-4 w-4 mr-2" />
          {salvando ? 'Salvando...' : 'Salvar Chamada'}
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Users,
  CheckCircle2,
  XCircle,
  UserPlus,
  Book,
  BookOpen,
  DollarSign,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
} from 'lucide-react'
import { getDomingoAtual, getProximoDomingo, getUltimosDomingos, formatarDomingo, converterParaISO } from '@/lib/chamada-utils'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Turma {
  id: string
  nome: string
  faixaEtaria: string
  totalAlunos: number
  sala: string
  cor: string
}

interface ResumoTurma {
  presentes: number
  faltas: number
  visitantes: number
  biblias: number
  revistas: number
  oferta: number
}

const STORAGE_KEY_DATA = 'ebd-chamada-data'
const STORAGE_KEY_OFFSET = 'ebd-chamada-offset'

function getDataInicial(): Date {
  if (typeof window === 'undefined') return getDomingoAtual()
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DATA)
    if (stored) {
      const d = new Date(stored + 'T12:00:00')
      if (!isNaN(d.getTime())) return d
    }
  } catch {}
  return getDomingoAtual()
}

function getOffsetInicial(): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(STORAGE_KEY_OFFSET)
    if (stored !== null) {
      const n = parseInt(stored, 10)
      if (!isNaN(n)) return n
    }
  } catch {}
  return 0
}

export default function ChamadaPage() {
  const router = useRouter()
  const [turmasData, setTurmasData] = useState<Turma[]>([])
  const [dataSelecionada, setDataSelecionada] = useState<Date>(getDataInicial)
  const [semanaOffset, setSemanaOffset] = useState<number>(getOffsetInicial)
  const [resumoDia, setResumoDia] = useState({
    total_matriculados: 0,
    total_presentes: 0,
    total_faltas: 0,
    total_visitantes: 0,
    total_biblias: 0,
    total_revistas: 0,
    total_oferta: 0,
  })
  const [resumosPorTurma, setResumosPorTurma] = useState<Record<string, ResumoTurma>>({})

  // Persistir data e offset no localStorage sempre que mudarem
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, converterParaISO(dataSelecionada))
      localStorage.setItem(STORAGE_KEY_OFFSET, String(semanaOffset))
    } catch {}
  }, [dataSelecionada, semanaOffset])

  useEffect(() => {
    // TODO: buscar do Supabase
    // const { data } = await supabase.from('turmas').select('id, nome, faixa_etaria, total_alunos, sala, cor')
    // setTurmasData(data ?? [])
  }, [])

  useEffect(() => {
    // TODO: buscar do Supabase
    // Buscar resumo de chamadas para a data selecionada
    // const dataISO = converterParaISO(dataSelecionada)
    // const { data } = await supabase.from('chamadas').select('*').eq('data', dataISO)
    // Calcular resumos por turma e totais gerais a partir dos dados reais

    // Calcular totais de matriculados a partir das turmas carregadas
    const totalMatriculados = turmasData.reduce((acc, t) => acc + t.totalAlunos, 0)

    // Calcular resumos por turma (vazios enquanto não há dados do Supabase)
    const resumos: Record<string, ResumoTurma> = {}
    turmasData.forEach((turma) => {
      resumos[turma.id] = {
        presentes: 0,
        faltas: 0,
        visitantes: 0,
        biblias: 0,
        revistas: 0,
        oferta: 0,
      }
    })
    setResumosPorTurma(resumos)

    // Calcular totais gerais
    let totalPresentes = 0
    let totalFaltas = 0
    let totalVisitantes = 0
    let totalBiblias = 0
    let totalRevistas = 0
    let totalOferta = 0

    Object.values(resumos).forEach((resumo) => {
      totalPresentes += resumo.presentes
      totalFaltas += resumo.faltas
      totalVisitantes += resumo.visitantes
      totalBiblias += resumo.biblias
      totalRevistas += resumo.revistas
      totalOferta += resumo.oferta
    })

    setResumoDia({
      total_matriculados: totalMatriculados,
      total_presentes: totalPresentes,
      total_faltas: totalFaltas,
      total_visitantes: totalVisitantes,
      total_biblias: totalBiblias,
      total_revistas: totalRevistas,
      total_oferta: totalOferta,
    })
  }, [dataSelecionada, turmasData])

  // Gera a lista de domingos da "semana de visualização" (5 domingos centrados no offset)
  const getDomingosDaSemana = (): Date[] => {
    const base = getDomingoAtual()
    const domingos: Date[] = []
    for (let i = -2; i <= 2; i++) {
      domingos.push(addDays(base, (semanaOffset + i) * 7))
    }
    return domingos
  }

  const domingosDaSemana = getDomingosDaSemana()
  const hoje = getDomingoAtual()
  const proximoDomingo = getProximoDomingo()

  const handleSelecionarDomingo = (domingo: Date) => {
    setDataSelecionada(domingo)
  }

  const handleSemanaAnterior = () => setSemanaOffset(prev => prev - 1)
  const handleProximaSemana = () => setSemanaOffset(prev => prev + 1)

  const handleHoje = () => {
    setDataSelecionada(hoje)
    setSemanaOffset(0)
  }

  const handleProximoDomingo = () => {
    setDataSelecionada(proximoDomingo)
    setSemanaOffset(1)
  }

  const handleSelecionarTurma = (turmaId: string) => {
    router.push(`/chamada/${turmaId}?data=${converterParaISO(dataSelecionada)}`)
  }

  const isMesmoDomingo = (a: Date, b: Date) =>
    converterParaISO(a) === converterParaISO(b)

  const isHoje = isMesmoDomingo(dataSelecionada, hoje)
  const isProximo = isMesmoDomingo(dataSelecionada, proximoDomingo)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chamada - Sistema EBD</h1>
        <p className="text-muted-foreground mt-2">
          Selecione a data e visualize os resumos das turmas
        </p>
      </div>

      {/* Seletor de Data */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Data da Chamada</h2>
              <p className="text-xs text-muted-foreground">Selecione o domingo</p>
            </div>
          </div>
          {/* Data selecionada em destaque */}
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-2">
              {isHoje && (
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Atual</Badge>
              )}
              {isProximo && (
                <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-xs">Próximo</Badge>
              )}
              <span className="text-sm font-semibold text-primary capitalize">
                {format(dataSelecionada, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Atalhos rápidos */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={isHoje ? 'default' : 'outline'}
              onClick={handleHoje}
              className="h-8 text-xs"
            >
              Domingo Atual
            </Button>
            <Button
              size="sm"
              variant={isProximo ? 'default' : 'outline'}
              onClick={handleProximoDomingo}
              className="h-8 text-xs"
            >
              Próximo Domingo
            </Button>
          </div>

          {/* Navegação por semanas + chips de domingos */}
          <div className="flex items-center gap-2">
            {/* Botão anterior */}
            <button
              onClick={handleSemanaAnterior}
              className="flex-shrink-0 p-2 rounded-lg border bg-muted/40 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Chips de domingos */}
            <div className="flex-1 grid grid-cols-5 gap-1.5">
              {domingosDaSemana.map((domingo, i) => {
                const selecionado = isMesmoDomingo(domingo, dataSelecionada)
                const ehHoje = isMesmoDomingo(domingo, hoje)
                const ehProximo = isMesmoDomingo(domingo, proximoDomingo)
                const isFuturo = domingo > hoje
                const dataISO = converterParaISO(domingo)

                return (
                  <button
                    key={dataISO}
                    onClick={() => handleSelecionarDomingo(domingo)}
                    className={`
                      relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition-all duration-150
                      ${selecionado
                        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                        : ehHoje
                        ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                        : isFuturo
                        ? 'border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40'
                        : 'border-border bg-background hover:bg-muted/50'
                      }
                    `}
                  >
                    {/* Indicador topo */}
                    {(ehHoje || ehProximo) && !selecionado && (
                      <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        ehHoje ? 'bg-primary text-primary-foreground' : 'bg-orange-500 text-white'
                      }`}>
                        {ehHoje ? 'Hoje' : 'Próx'}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium uppercase tracking-wide mb-0.5 ${selecionado ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(domingo, 'MMM', { locale: ptBR })}
                    </span>
                    <span className={`text-xl font-bold leading-none ${selecionado ? 'text-primary-foreground' : ''}`}>
                      {format(domingo, 'dd')}
                    </span>
                    <span className={`text-[10px] mt-0.5 ${selecionado ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(domingo, 'yyyy')}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Botão próximo */}
            <button
              onClick={handleProximaSemana}
              className="flex-shrink-0 p-2 rounded-lg border bg-muted/40 hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Data selecionada - mobile */}
          <div className="sm:hidden text-center">
            <p className="text-sm font-semibold text-primary capitalize">
              {formatarDomingo(dataSelecionada)}
            </p>
          </div>
        </div>
      </div>

      {/* Resumo Geral do Dia */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Resumo Geral do Dia</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Matriculados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumoDia.total_matriculados}</div>
              <p className="text-xs text-muted-foreground">Todas as turmas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Presentes</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {resumoDia.total_presentes}
              </div>
              <p className="text-xs text-muted-foreground">
                {resumoDia.total_matriculados > 0
                  ? `${Math.round((resumoDia.total_presentes / resumoDia.total_matriculados) * 100)}%`
                  : '0%'}{' '}
                de presença
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Faltas</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {resumoDia.total_faltas}
              </div>
              <p className="text-xs text-muted-foreground">Ausências</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visitantes</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {resumoDia.total_visitantes}
              </div>
              <p className="text-xs text-muted-foreground">Novos visitantes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bíblias</CardTitle>
              <Book className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {resumoDia.total_biblias}
              </div>
              <p className="text-xs text-muted-foreground">Trouxeram bíblia</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revistas</CardTitle>
              <BookOpen className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {resumoDia.total_revistas}
              </div>
              <p className="text-xs text-muted-foreground">Trouxeram revista</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Oferta</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {resumoDia.total_oferta.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Arrecadado no dia</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resumo Por Sala */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Resumo por Sala</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {turmasData.map((turma) => {
            const resumo = resumosPorTurma[turma.id] || {
              presentes: 0,
              faltas: 0,
              visitantes: 0,
              biblias: 0,
              revistas: 0,
              oferta: 0,
            }
            const pct = turma.totalAlunos > 0
              ? Math.round((resumo.presentes / turma.totalAlunos) * 100)
              : 0
            const chamadaFeita = resumo.presentes > 0 || resumo.faltas > 0

            return (
              <div
                key={turma.id}
                onClick={() => handleSelecionarTurma(turma.id)}
                className="group relative overflow-hidden rounded-xl border bg-card cursor-pointer hover:shadow-xl hover:border-primary/40 transition-all duration-200"
              >
                {/* Barra colorida topo */}
                <div className={`h-1.5 w-full ${turma.cor}`} />

                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-4 pb-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                      {turma.nome}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {turma.sala}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-2 py-0">
                        {turma.faixaEtaria}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {chamadaFeita ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Realizada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        <ClipboardList className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Barra de presença */}
                <div className="px-5 pb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Presença</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Grid de stats */}
                <div className="grid grid-cols-3 gap-0 border-t">
                  {/* Matriculados */}
                  <div className="flex flex-col items-center justify-center py-3 px-2 border-r">
                    <Users className="h-4 w-4 text-muted-foreground mb-1" />
                    <span className="text-lg font-bold">{turma.totalAlunos}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Matrículas</span>
                  </div>
                  {/* Presentes */}
                  <div className="flex flex-col items-center justify-center py-3 px-2 border-r">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mb-1" />
                    <span className="text-lg font-bold text-green-600">{resumo.presentes}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Presentes</span>
                  </div>
                  {/* Faltas */}
                  <div className="flex flex-col items-center justify-center py-3 px-2">
                    <XCircle className="h-4 w-4 text-red-500 mb-1" />
                    <span className="text-lg font-bold text-red-600">{resumo.faltas}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Faltas</span>
                  </div>
                </div>

                {/* Linha secundária */}
                <div className="grid grid-cols-4 gap-0 border-t bg-muted/30">
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <UserPlus className="h-3.5 w-3.5 text-blue-500 mb-0.5" />
                    <span className="text-sm font-semibold text-blue-600">{resumo.visitantes}</span>
                    <span className="text-[9px] text-muted-foreground">Visitantes</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <Book className="h-3.5 w-3.5 text-purple-500 mb-0.5" />
                    <span className="text-sm font-semibold text-purple-600">{resumo.biblias}</span>
                    <span className="text-[9px] text-muted-foreground">Bíblias</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <BookOpen className="h-3.5 w-3.5 text-orange-500 mb-0.5" />
                    <span className="text-sm font-semibold text-orange-600">{resumo.revistas}</span>
                    <span className="text-[9px] text-muted-foreground">Revistas</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1">
                    <DollarSign className="h-3.5 w-3.5 text-green-500 mb-0.5" />
                    <span className="text-sm font-semibold text-green-600">
                      {resumo.oferta.toFixed(0)}
                    </span>
                    <span className="text-[9px] text-muted-foreground">Oferta R$</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

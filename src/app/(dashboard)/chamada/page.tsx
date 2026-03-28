"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, CheckCircle2, XCircle, UserPlus, Book, BookOpen, DollarSign,
  CalendarDays, ChevronRight, ChevronLeft, ClipboardList,
  Sun, CloudSun, Cloud, CloudDrizzle, CloudRain, CloudLightning, Zap, Thermometer,
  TrendingUp, TrendingDown,
} from 'lucide-react'
import { getDomingoAtual, getProximoDomingo, formatarDomingo, converterParaISO } from '@/lib/chamada-utils'
import { useAuth } from '@/contexts/AuthContext'
import { calcularPct, corPresenca, resolverCor } from '@/lib/presence'
import { buscarTurmasComContagem, buscarResumoDia } from '@/actions/chamada'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Turma {
  id: string; nome: string; faixaEtaria: string; totalAlunos: number; sala: string; cor: string
}
interface ResumoTurma {
  presentes: number; faltas: number; visitantes: number; biblias: number; revistas: number; oferta: number
}

const getSalaNum = (sala: string) => parseInt(sala.match(/\d+/)?.[0] ?? '0') || 0

const STORAGE_KEY_DATA   = 'ebd-chamada-data'
const STORAGE_KEY_OFFSET = 'ebd-chamada-offset'
const STORAGE_KEY_TEMPO  = (data: string) => `ebd-tempo-${data}`

const TEMPO_OPTIONS = [
  { value: 'ensolarado', label: 'Ensolarado', Icon: Sun,            cor: 'text-yellow-500' },
  { value: 'bom',        label: 'Bom',        Icon: CloudSun,       cor: 'text-blue-400'   },
  { value: 'nublado',    label: 'Nublado',    Icon: Cloud,          cor: 'text-slate-400'  },
  { value: 'garoa',      label: 'Garoa',      Icon: CloudDrizzle,   cor: 'text-sky-400'    },
  { value: 'chuvoso',    label: 'Chuvoso',    Icon: CloudRain,      cor: 'text-blue-600'   },
  { value: 'ameacador',  label: 'Ameaçador',  Icon: CloudLightning, cor: 'text-yellow-600' },
  { value: 'tempestade', label: 'Tempestade', Icon: Zap,            cor: 'text-purple-500' },
  { value: 'frio',       label: 'Frio',       Icon: Thermometer,    cor: 'text-cyan-500'   },
]

function getDataInicial(): Date {
  if (typeof window === 'undefined') return getDomingoAtual()
  try {
    const s = localStorage.getItem(STORAGE_KEY_DATA)
    if (s) { const d = new Date(s + 'T12:00:00'); if (!isNaN(d.getTime())) return d }
  } catch {}
  return getDomingoAtual()
}

function getOffsetInicial(): number {
  if (typeof window === 'undefined') return 0
  try {
    const s = localStorage.getItem(STORAGE_KEY_OFFSET)
    if (s !== null) { const n = parseInt(s, 10); if (!isNaN(n)) return n }
  } catch {}
  return 0
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ChamadaPage() {
  const router = useRouter()
  const { isAdmin, turmasPermitidas, loading: authLoading } = useAuth()
  const [turmasData, setTurmasData] = useState<Turma[]>([])
  const [turmasLoading, setTurmasLoading] = useState(true)
  const [dataSelecionada, setDataSelecionada] = useState<Date>(getDataInicial)
  const [semanaOffset, setSemanaOffset] = useState<number>(getOffsetInicial)
  const [tempo, setTempo] = useState('')
  const [resumoDia, setResumoDia] = useState({ total_matriculados: 0, total_presentes: 0, total_faltas: 0, total_visitantes: 0, total_biblias: 0, total_revistas: 0, total_oferta: 0 })
  const [resumosPorTurma, setResumosPorTurma] = useState<Record<string, ResumoTurma>>({})

  // Persistir data/offset no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, converterParaISO(dataSelecionada))
      localStorage.setItem(STORAGE_KEY_OFFSET, String(semanaOffset))
    } catch {}
  }, [dataSelecionada, semanaOffset])

  // Carregar/salvar tempo por data
  useEffect(() => {
    try { setTempo(localStorage.getItem(STORAGE_KEY_TEMPO(converterParaISO(dataSelecionada))) ?? '') }
    catch { setTempo('') }
  }, [dataSelecionada])

  function handleTempoChange(value: string) {
    const key = STORAGE_KEY_TEMPO(converterParaISO(dataSelecionada))
    const novo = value === tempo ? '' : value
    try { novo ? localStorage.setItem(key, novo) : localStorage.removeItem(key) } catch {}
    setTempo(novo)
  }

  // Carregar turmas via server action (SQL direto)
  useEffect(() => {
    if (authLoading) return
    async function load() {
      setTurmasLoading(true)
      try {
        const turmasRaw = await buscarTurmasComContagem()
        const comContagem: Turma[] = turmasRaw.map(t => ({
          id: t.id, nome: t.nome, faixaEtaria: t.faixa_etaria,
          totalAlunos: t.total_alunos, sala: t.sala, cor: t.cor,
        }))
        const sorted = [...comContagem].sort((a, b) => getSalaNum(a.sala) - getSalaNum(b.sala))
        setTurmasData(isAdmin || turmasPermitidas.includes('*')
          ? sorted
          : sorted.filter(t => turmasPermitidas.includes(t.id)))
      } catch (e) {
        console.error('Erro ao buscar turmas:', e)
      } finally {
        setTurmasLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, turmasPermitidas])

  // Carregar resumo do dia via server action (SQL direto)
  useEffect(() => {
    async function load() {
      const dataISO = converterParaISO(dataSelecionada)
      const totalMatriculados = turmasData.reduce((a, t) => a + t.totalAlunos, 0)

      try {
        const { porTurma } = await buscarResumoDia(dataISO)

        const resumos: Record<string, ResumoTurma> = {}
        turmasData.forEach(t => { resumos[t.id] = { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0 } })

        for (const [turmaId, r] of Object.entries(porTurma)) {
          resumos[turmaId] = {
            presentes: r.presentes, faltas: r.faltas, visitantes: r.visitantes,
            biblias: r.biblias, revistas: r.revistas, oferta: r.oferta,
          }
        }

        setResumosPorTurma(resumos)
        const vals = Object.values(resumos)
        setResumoDia({
          total_matriculados: totalMatriculados,
          total_presentes:  vals.reduce((a, r) => a + r.presentes, 0),
          total_faltas:     vals.reduce((a, r) => a + r.faltas, 0),
          total_visitantes: vals.reduce((a, r) => a + r.visitantes, 0),
          total_biblias:    vals.reduce((a, r) => a + r.biblias, 0),
          total_revistas:   vals.reduce((a, r) => a + r.revistas, 0),
          total_oferta:     vals.reduce((a, r) => a + r.oferta, 0),
        })
      } catch (e) {
        console.error('Erro ao buscar resumo do dia:', e)
      }
    }
    load()
  }, [dataSelecionada, turmasData])

  const hoje = getDomingoAtual()
  const proximoDomingo = getProximoDomingo()

  const domingosDaSemana: Date[] = Array.from({ length: 5 }, (_, i) => addDays(hoje, (semanaOffset + i - 2) * 7))

  const isMesmoDomingo = (a: Date, b: Date) => converterParaISO(a) === converterParaISO(b)
  const isHoje   = isMesmoDomingo(dataSelecionada, hoje)
  const isProximo = isMesmoDomingo(dataSelecionada, proximoDomingo)

  const presencaPct = calcularPct(resumoDia.total_presentes, resumoDia.total_matriculados)
  const turmasComChamada = turmasData.filter(t => {
    const r = resumosPorTurma[t.id]
    return r && (r.presentes > 0 || r.faltas > 0)
  }).length

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Chamada</h1>
        <p className="text-muted-foreground mt-1 text-sm">Selecione a data e registre a presença das turmas</p>
      </div>

      {/* Seletor de Data — compacto */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10"><CalendarDays className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="font-semibold text-sm">Data da Chamada</h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Selecione o domingo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHoje   && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] px-1.5">Atual</Badge>}
            {isProximo && <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-[10px] px-1.5">Próximo</Badge>}
            <span className="text-sm font-semibold text-primary capitalize hidden sm:inline">
              {format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant={isHoje ? 'default' : 'outline'} onClick={() => { setDataSelecionada(hoje); setSemanaOffset(0) }} className="h-7 text-xs px-2.5">Domingo Atual</Button>
            <Button size="sm" variant={isProximo ? 'default' : 'outline'} onClick={() => { setDataSelecionada(proximoDomingo); setSemanaOffset(1) }} className="h-7 text-xs px-2.5">Próximo Domingo</Button>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setSemanaOffset(prev => prev - 1)} className="flex-shrink-0 p-1.5 rounded-lg border bg-muted/40 hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex-1 grid grid-cols-5 gap-1">
              {domingosDaSemana.map((domingo) => {
                const selecionado = isMesmoDomingo(domingo, dataSelecionada)
                const ehHoje   = isMesmoDomingo(domingo, hoje)
                const ehProximo = isMesmoDomingo(domingo, proximoDomingo)
                const isFuturo  = domingo > hoje
                const dataISO   = converterParaISO(domingo)
                return (
                  <button key={dataISO} onClick={() => setDataSelecionada(domingo)}
                    className={`relative flex flex-col items-center justify-center py-2 px-0.5 rounded-xl border text-center transition-all duration-150 ${selecionado ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.03]' : ehHoje ? 'border-primary/50 bg-primary/5 hover:bg-primary/10' : isFuturo ? 'border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40' : 'border-border bg-background hover:bg-muted/50'}`}>
                    {(ehHoje || ehProximo) && !selecionado && (
                      <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1 py-0.5 rounded-full ${ehHoje ? 'bg-primary text-primary-foreground' : 'bg-orange-500 text-white'}`}>
                        {ehHoje ? 'Hoje' : 'Próx'}
                      </span>
                    )}
                    <span className={`text-[9px] font-medium uppercase tracking-wide mb-0.5 ${selecionado ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{format(domingo, 'MMM', { locale: ptBR })}</span>
                    <span className={`text-lg sm:text-xl font-bold leading-none ${selecionado ? 'text-primary-foreground' : ''}`}>{format(domingo, 'dd')}</span>
                    <span className={`text-[9px] mt-0.5 ${selecionado ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{format(domingo, 'yyyy')}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setSemanaOffset(prev => prev + 1)} className="flex-shrink-0 p-1.5 rounded-lg border bg-muted/40 hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>

          <div className="sm:hidden text-center">
            <p className="text-sm font-semibold text-primary capitalize">{formatarDomingo(dataSelecionada)}</p>
          </div>
        </div>
      </div>

      {/* Condições do Tempo — mais compacto */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
          <Sun className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold text-sm">Tempo</span>
          {tempo && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {TEMPO_OPTIONS.find(t => t.value === tempo)?.label}
            </Badge>
          )}
        </div>
        <div className="px-4 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {TEMPO_OPTIONS.map(({ value, label, Icon, cor }) => {
              const ativo = tempo === value
              return (
                <button
                  key={value}
                  onClick={() => handleTempoChange(value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    ativo
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${ativo ? 'text-primary-foreground' : cor}`} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Resumo Geral do Dia — card unico e mais visual */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h2 className="font-semibold text-sm">Resumo do Dia</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {turmasComChamada}/{turmasData.length} turmas
            </Badge>
          </div>
        </div>

        {/* Destaque presença */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold" style={{ color: corPresenca(presencaPct) }}>{presencaPct}%</span>
              <div className="text-xs text-muted-foreground">
                <div>de presença</div>
                <div className="font-medium text-foreground">{resumoDia.total_presentes + resumoDia.total_visitantes} pessoas no total</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {presencaPct >= 75 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              <span>{resumoDia.total_presentes}/{resumoDia.total_matriculados} matriculados</span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${presencaPct}%`, backgroundColor: corPresenca(presencaPct) }}
            />
          </div>
        </div>

        {/* Numeros em grid — Matriculados, Ausentes, Presentes, Visitantes */}
        <div className="grid grid-cols-4 gap-0 border-t">
          <div className="flex flex-col items-center justify-center py-2.5 px-1 border-r">
            <Users className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
            <span className="text-base sm:text-lg font-bold">{resumoDia.total_matriculados}</span>
            <span className="text-[9px] text-muted-foreground">Matriculados</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2.5 px-1 border-r">
            <XCircle className="h-3.5 w-3.5 text-red-500 mb-0.5" />
            <span className="text-base sm:text-lg font-bold text-red-600">{resumoDia.total_faltas}</span>
            <span className="text-[9px] text-muted-foreground">Ausentes</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2.5 px-1 border-r">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mb-0.5" />
            <span className="text-base sm:text-lg font-bold text-green-600">{resumoDia.total_presentes}</span>
            <span className="text-[9px] text-muted-foreground">Presentes</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2.5 px-1">
            <UserPlus className="h-3.5 w-3.5 text-blue-500 mb-0.5" />
            <span className="text-base sm:text-lg font-bold text-blue-600">{resumoDia.total_visitantes}</span>
            <span className="text-[9px] text-muted-foreground">Visitantes</span>
          </div>
        </div>
        {/* Total, Bíblias, Revistas, Oferta */}
        <div className="grid grid-cols-4 gap-0 border-t bg-muted/30">
          <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
            <ClipboardList className="h-3 w-3 text-muted-foreground mb-0.5" />
            <span className="text-sm font-semibold">{resumoDia.total_presentes + resumoDia.total_visitantes}</span>
            <span className="text-[9px] text-muted-foreground">Total</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
            <Book className="h-3 w-3 text-purple-500 mb-0.5" />
            <span className="text-sm font-semibold text-purple-600">{resumoDia.total_biblias}</span>
            <span className="text-[9px] text-muted-foreground">Bíblias</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
            <BookOpen className="h-3 w-3 text-orange-500 mb-0.5" />
            <span className="text-sm font-semibold text-orange-600">{resumoDia.total_revistas}</span>
            <span className="text-[9px] text-muted-foreground">Revistas</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-1">
            <DollarSign className="h-3 w-3 text-green-500 mb-0.5" />
            <span className="text-sm font-semibold text-green-600">R$ {resumoDia.total_oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[9px] text-muted-foreground">Oferta</span>
          </div>
        </div>
      </div>

      {/* Resumo Por Sala */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Turmas</h2>
          <span className="text-xs text-muted-foreground">{turmasData.length} turmas ativas</span>
        </div>
        {(authLoading || turmasLoading) ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                <div className="h-2 w-full bg-muted" />
                <div className="px-4 pt-3 pb-2 space-y-2">
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
                <div className="px-4 pb-2"><div className="h-2 w-full bg-muted rounded-full" /></div>
                <div className="grid grid-cols-4 gap-0 border-t">
                  {[...Array(4)].map((_, j) => <div key={j} className="py-2.5 flex flex-col items-center gap-1"><div className="h-4 w-4 bg-muted rounded" /><div className="h-5 w-6 bg-muted rounded" /></div>)}
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {turmasData.map((turma) => {
            const resumo = resumosPorTurma[turma.id] ?? { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0 }
            const pct = calcularPct(resumo.presentes, turma.totalAlunos)
            const chamadaFeita = resumo.presentes > 0 || resumo.faltas > 0
            const corHex = resolverCor(turma.cor, 0)

            return (
              <div key={turma.id} onClick={() => router.push(`/chamada/${turma.id}?data=${converterParaISO(dataSelecionada)}`)}
                className="group relative overflow-hidden rounded-xl border bg-card cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                {/* Barra colorida no topo */}
                <div className="h-2 w-full" style={{ backgroundColor: corHex }} />

                {/* Header do card */}
                <div className="flex items-start justify-between px-4 pt-3 pb-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: corHex }} />
                      <h3 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors truncate">{turma.nome}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 ml-4">
                      <span className="text-[10px] text-muted-foreground">{turma.sala}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{turma.faixaEtaria}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {chamadaFeita
                      ? <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px] px-1.5 py-0"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Feita</Badge>
                      : <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground"><ClipboardList className="h-2.5 w-2.5 mr-0.5" />Pendente</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Barra de presença */}
                <div className="px-4 pb-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                    <span>{resumo.presentes}/{turma.totalAlunos} presentes</span>
                    <span className="font-bold text-xs" style={{ color: chamadaFeita ? corPresenca(pct) : undefined }}>{chamadaFeita ? `${pct}%` : '—'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: corPresenca(pct) }} />
                  </div>
                </div>

                {/* Estatísticas — linha 1: Matr., Aus., Pres., Visit. */}
                <div className="grid grid-cols-4 gap-0 border-t">
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <span className="text-sm font-bold">{turma.totalAlunos}</span>
                    <span className="text-[9px] text-muted-foreground">Matr.</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <span className="text-sm font-bold text-red-600">{resumo.faltas}</span>
                    <span className="text-[9px] text-muted-foreground">Aus.</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <span className="text-sm font-bold text-green-600">{resumo.presentes}</span>
                    <span className="text-[9px] text-muted-foreground">Pres.</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1">
                    <span className="text-sm font-bold text-blue-600">{resumo.visitantes}</span>
                    <span className="text-[9px] text-muted-foreground">Visit.</span>
                  </div>
                </div>
                {/* Estatísticas — linha 2: Total, Bíbl., Rev., Oferta */}
                <div className="grid grid-cols-4 gap-0 border-t bg-muted/20">
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <span className="text-sm font-bold">{resumo.presentes + resumo.visitantes}</span>
                    <span className="text-[9px] text-muted-foreground">Total</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <span className="text-sm font-bold text-purple-600">{resumo.biblias}</span>
                    <span className="text-[9px] text-muted-foreground">Bíbl.</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 border-r">
                    <span className="text-sm font-bold text-orange-600">{resumo.revistas}</span>
                    <span className="text-[9px] text-muted-foreground">Rev.</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1">
                    <span className="text-sm font-bold text-green-600">R$ {resumo.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-[9px] text-muted-foreground">Oferta</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import {
  Users, CheckCircle2, XCircle, UserPlus, Book, BookOpen, DollarSign,
  CalendarDays, ChevronRight, ChevronLeft, ClipboardList,
} from 'lucide-react'
import { getDomingoAtual, getProximoDomingo, formatarDomingo, converterParaISO } from '@/lib/chamada-utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calcularPct } from '@/lib/presence'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Turma {
  id: string; nome: string; faixaEtaria: string; totalAlunos: number; sala: string; cor: string
}
interface ResumoTurma {
  presentes: number; faltas: number; visitantes: number; biblias: number; revistas: number; oferta: number
}

const STORAGE_KEY_DATA   = 'ebd-chamada-data'
const STORAGE_KEY_OFFSET = 'ebd-chamada-offset'

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
  const { isAdmin, turmasPermitidas } = useAuth()
  const db = supabase as any

  const [turmasData, setTurmasData] = useState<Turma[]>([])
  const [dataSelecionada, setDataSelecionada] = useState<Date>(getDataInicial)
  const [semanaOffset, setSemanaOffset] = useState<number>(getOffsetInicial)
  const [resumoDia, setResumoDia] = useState({ total_matriculados: 0, total_presentes: 0, total_faltas: 0, total_visitantes: 0, total_biblias: 0, total_revistas: 0, total_oferta: 0 })
  const [resumosPorTurma, setResumosPorTurma] = useState<Record<string, ResumoTurma>>({})

  // Persistir no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, converterParaISO(dataSelecionada))
      localStorage.setItem(STORAGE_KEY_OFFSET, String(semanaOffset))
    } catch {}
  }, [dataSelecionada, semanaOffset])

  // Carregar turmas
  useEffect(() => {
    async function load() {
      const { data } = await db.from('turmas').select('id, nome, faixa_etaria, sala, cor').eq('ativa', true).order('nome')
      if (!data) return

      const comContagem: Turma[] = await Promise.all(data.map(async (t: any) => {
        const { count } = await db.from('alunos').select('id', { count: 'exact', head: true }).eq('turma_id', t.id).eq('ativo', true)
        return { id: t.id, nome: t.nome, faixaEtaria: t.faixa_etaria ?? '', totalAlunos: count ?? 0, sala: t.sala ?? '', cor: t.cor ?? 'bg-blue-500' }
      }))

      setTurmasData(isAdmin || turmasPermitidas.includes('*')
        ? comContagem
        : comContagem.filter(t => turmasPermitidas.includes(t.id)))
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, turmasPermitidas])

  // Carregar resumo do dia
  useEffect(() => {
    async function load() {
      const dataISO = converterParaISO(dataSelecionada)
      const totalMatriculados = turmasData.reduce((a, t) => a + t.totalAlunos, 0)
      const { data: chamadas } = await db.from('chamadas').select('id, turma_id, oferta, presencas(presente, trouxe_biblia, trouxe_revista)').eq('data', dataISO)

      const resumos: Record<string, ResumoTurma> = {}
      turmasData.forEach(t => { resumos[t.id] = { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0 } })

      if (chamadas) {
        for (const c of chamadas) {
          const ps = c.presencas as any[]
          resumos[c.turma_id] = {
            presentes: ps.filter(p => p.presente).length, faltas: ps.filter(p => !p.presente).length,
            biblias: ps.filter(p => p.trouxe_biblia).length, revistas: ps.filter(p => p.trouxe_revista).length,
            oferta: Number(c.oferta) || 0, visitantes: 0,
          }
        }
        const { data: visitantes } = await db.from('historico_visitantes').select('turma_id').eq('data', dataISO).eq('presente', true)
        visitantes?.forEach((v: any) => { if (resumos[v.turma_id]) resumos[v.turma_id].visitantes++ })
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Chamada</h1>
        <p className="text-muted-foreground mt-2">Selecione a data e visualize os resumos das turmas</p>
      </div>

      {/* Seletor de Data */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-5 w-5 text-primary" /></div>
            <div>
              <h2 className="font-semibold text-base">Data da Chamada</h2>
              <p className="text-xs text-muted-foreground">Selecione o domingo</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-2">
              {isHoje   && <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Atual</Badge>}
              {isProximo && <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-xs">Próximo</Badge>}
              <span className="text-sm font-semibold text-primary capitalize">
                {format(dataSelecionada, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={isHoje ? 'default' : 'outline'} onClick={() => { setDataSelecionada(hoje); setSemanaOffset(0) }} className="h-8 text-xs">Domingo Atual</Button>
            <Button size="sm" variant={isProximo ? 'default' : 'outline'} onClick={() => { setDataSelecionada(proximoDomingo); setSemanaOffset(1) }} className="h-8 text-xs">Próximo Domingo</Button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setSemanaOffset(prev => prev - 1)} className="flex-shrink-0 p-2 rounded-lg border bg-muted/40 hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex-1 grid grid-cols-5 gap-1.5">
              {domingosDaSemana.map((domingo) => {
                const selecionado = isMesmoDomingo(domingo, dataSelecionada)
                const ehHoje   = isMesmoDomingo(domingo, hoje)
                const ehProximo = isMesmoDomingo(domingo, proximoDomingo)
                const isFuturo  = domingo > hoje
                const dataISO   = converterParaISO(domingo)
                return (
                  <button key={dataISO} onClick={() => setDataSelecionada(domingo)}
                    className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition-all duration-150 ${selecionado ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' : ehHoje ? 'border-primary/50 bg-primary/5 hover:bg-primary/10' : isFuturo ? 'border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40' : 'border-border bg-background hover:bg-muted/50'}`}>
                    {(ehHoje || ehProximo) && !selecionado && (
                      <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ehHoje ? 'bg-primary text-primary-foreground' : 'bg-orange-500 text-white'}`}>
                        {ehHoje ? 'Hoje' : 'Próx'}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium uppercase tracking-wide mb-0.5 ${selecionado ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{format(domingo, 'MMM', { locale: ptBR })}</span>
                    <span className={`text-xl font-bold leading-none ${selecionado ? 'text-primary-foreground' : ''}`}>{format(domingo, 'dd')}</span>
                    <span className={`text-[10px] mt-0.5 ${selecionado ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{format(domingo, 'yyyy')}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setSemanaOffset(prev => prev + 1)} className="flex-shrink-0 p-2 rounded-lg border bg-muted/40 hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>

          <div className="sm:hidden text-center">
            <p className="text-sm font-semibold text-primary capitalize">{formatarDomingo(dataSelecionada)}</p>
          </div>
        </div>
      </div>

      {/* Resumo Geral do Dia */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Resumo Geral do Dia</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Matriculados" value={resumoDia.total_matriculados} icon={Users} description="Todas as turmas" />
          <StatCard title="Total no Dia" value={resumoDia.total_presentes + resumoDia.total_visitantes} icon={CheckCircle2} description="Presentes + visitantes" valueClassName="text-primary" />
          <StatCard title="Total Presentes" value={resumoDia.total_presentes} icon={CheckCircle2} description={`${presencaPct}% de presença`} valueClassName="text-green-600" />
          <StatCard title="Total Faltas"    value={resumoDia.total_faltas}    icon={XCircle}     description="Ausências"        valueClassName="text-red-600" />
          <StatCard title="Total Visitantes" value={resumoDia.total_visitantes} icon={UserPlus}  description="Novos visitantes"  valueClassName="text-blue-600" />
          <StatCard title="Total Bíblias"   value={resumoDia.total_biblias}   icon={Book}        description="Trouxeram bíblia"  valueClassName="text-purple-600" />
          <StatCard title="Total Revistas"  value={resumoDia.total_revistas}  icon={BookOpen}    description="Trouxeram revista" valueClassName="text-orange-600" />
          <StatCard title="Total Oferta" value={`R$ ${resumoDia.total_oferta.toFixed(2)}`} icon={DollarSign} description="Arrecadado no dia" valueClassName="text-green-600" />
        </div>
      </div>

      {/* Resumo Por Sala */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Resumo por Sala</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmasData.map((turma) => {
            const resumo = resumosPorTurma[turma.id] ?? { presentes: 0, faltas: 0, visitantes: 0, biblias: 0, revistas: 0, oferta: 0 }
            const pct = calcularPct(resumo.presentes, turma.totalAlunos)
            const chamadaFeita = resumo.presentes > 0 || resumo.faltas > 0

            return (
              <div key={turma.id} onClick={() => router.push(`/chamada/${turma.id}?data=${converterParaISO(dataSelecionada)}`)}
                className="group relative overflow-hidden rounded-xl border bg-card cursor-pointer hover:shadow-xl hover:border-primary/40 transition-all duration-200">
                <div className={`h-1.5 w-full ${turma.cor}`} />
                <div className="flex items-start justify-between px-5 pt-4 pb-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{turma.nome}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs px-2 py-0">{turma.sala}</Badge>
                      <Badge variant="outline" className="text-xs px-2 py-0">{turma.faixaEtaria}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {chamadaFeita
                      ? <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Realizada</Badge>
                      : <Badge variant="outline" className="text-xs text-muted-foreground"><ClipboardList className="h-3 w-3 mr-1" />Pendente</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                <div className="px-5 pb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Presença</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-0 border-t">
                  <div className="flex flex-col items-center justify-center py-3 px-2 border-r">
                    <Users className="h-4 w-4 text-muted-foreground mb-1" />
                    <span className="text-lg font-bold">{turma.totalAlunos}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Matrículas</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-3 px-2 border-r">
                    <CheckCircle2 className="h-4 w-4 text-primary mb-1" />
                    <span className="text-lg font-bold text-primary">{resumo.presentes + resumo.visitantes}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-3 px-2 border-r">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mb-1" />
                    <span className="text-lg font-bold text-green-600">{resumo.presentes}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Presentes</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-3 px-2">
                    <XCircle className="h-4 w-4 text-red-500 mb-1" />
                    <span className="text-lg font-bold text-red-600">{resumo.faltas}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Faltas</span>
                  </div>
                </div>

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
                    <span className="text-sm font-semibold text-green-600">{resumo.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

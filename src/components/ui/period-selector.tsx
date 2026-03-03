'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ANOS_DISPONIVEIS, MESES_CURTOS, TRIMESTRES } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ─── Helpers exportados ───────────────────────────────────────────────────────

export function labelDoPeriodo(opts: {
  periodo: 'mensal' | 'trimestral' | 'anual'
  ano: number
  mes: number
  trimestre: number
}): string {
  const { periodo, ano, mes, trimestre } = opts
  const MESES_FULL = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  if (periodo === 'anual') return `Ano ${ano}`
  if (periodo === 'trimestral') return `${TRIMESTRES[trimestre].label} ${ano} (${TRIMESTRES[trimestre].desc})`
  return `${MESES_FULL[mes]} de ${ano}`
}

// ─── Componente ───────────────────────────────────────────────────────────────

type Periodo = 'mensal' | 'trimestral' | 'anual'

interface PeriodSelectorProps {
  periodo: Periodo
  ano: number
  mes: number
  trimestre: number
  onPeriodo: (p: Periodo) => void
  onAno: (a: number) => void
  onMes: (m: number) => void
  onTrimestre: (t: number) => void
  /** Rótulo descritivo mostrado abaixo do título */
  label?: string
  className?: string
  /** Conteúdo extra renderizado dentro do card (ex: gráficos) */
  children?: React.ReactNode
}

export function PeriodSelector({
  periodo, ano, mes, trimestre,
  onPeriodo, onAno, onMes, onTrimestre,
  label, className, children,
}: PeriodSelectorProps) {
  const anoIdx = ANOS_DISPONIVEIS.indexOf(ano)
  const podePrev = anoIdx > 0
  const podeNext = anoIdx < ANOS_DISPONIVEIS.length - 1

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      {/* Cabeçalho + toggle de período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b bg-muted/30">
        <div>
          <h2 className="text-lg font-semibold">Análise de Presença</h2>
          {label && <p className="text-sm text-muted-foreground">{label}</p>}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/40 self-start sm:self-auto">
          {(['mensal', 'trimestral', 'anual'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodo(p)}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all',
                periodo === p
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {p === 'mensal' ? 'Mês' : p === 'trimestral' ? 'Trim.' : 'Anual'}
            </button>
          ))}
        </div>
      </div>

      {/* Seletor de Ano */}
      <div className="px-5 py-3 border-b bg-muted/10">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ano</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => podePrev && onAno(ANOS_DISPONIVEIS[anoIdx - 1])}
              disabled={!podePrev}
              className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex gap-1">
              {ANOS_DISPONIVEIS.map((a) => (
                <button
                  key={a}
                  onClick={() => onAno(a)}
                  className={cn(
                    'px-3 py-1 rounded text-sm font-semibold transition-all',
                    ano === a
                      ? 'bg-primary text-primary-foreground'
                      : 'border hover:bg-muted text-muted-foreground',
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              onClick={() => podeNext && onAno(ANOS_DISPONIVEIS[anoIdx + 1])}
              disabled={!podeNext}
              className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Seletor de Trimestre */}
      {periodo === 'trimestral' && (
        <div className="px-5 py-3 border-b bg-muted/10">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trimestre</span>
            <div className="flex gap-1.5 flex-wrap">
              {TRIMESTRES.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => onTrimestre(idx)}
                  className={cn(
                    'flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    trimestre === idx
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <span className="font-bold">{t.label}</span>
                  <span className={cn('text-[10px]', trimestre === idx ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seletor de Mês */}
      {(periodo === 'mensal') && (
        <div className="px-5 py-3 border-b bg-muted/10">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mês</span>
            <div className="flex gap-1 flex-wrap">
              {MESES_CURTOS.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => onMes(idx)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-all',
                    mes === idx
                      ? 'bg-primary text-primary-foreground'
                      : 'border hover:bg-muted text-muted-foreground',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo extra (ex: gráficos) */}
      {children}
    </div>
  )
}

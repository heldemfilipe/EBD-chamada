'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ANOS_DISPONIVEIS, MESES_CURTOS, TRIMESTRES } from '@/lib/constants'
import type { Granularidade } from '@/lib/relatorio-utils'
import { cn } from '@/lib/utils'

// Seletor de período compartilhado (Dashboard e Relatórios).

interface PeriodSelectorProps {
  granularidade: Granularidade
  ano: number
  mes: number
  trimestre: number
  onGranularidade: (g: Granularidade) => void
  onAno: (a: number) => void
  onMes: (m: number) => void
  onTrimestre: (t: number) => void
  /** Habilita a opção "Dia" (escolha de um domingo do mês) */
  permitirDia?: boolean
  /** Domingos com chamada no mês selecionado (YYYY-MM-DD) — usado em "Dia" */
  domingos?: string[]
  dataDia?: string | null
  onDataDia?: (d: string) => void
  titulo?: string
  /** Rótulo descritivo mostrado abaixo do título */
  label?: string
  /** Linha extra de filtros (ex.: turma) */
  filtros?: React.ReactNode
  /** Ações no cabeçalho (ex.: exportar) */
  acoes?: React.ReactNode
  className?: string
  /** Conteúdo renderizado dentro do card, abaixo dos filtros */
  children?: React.ReactNode
}

const LABEL_GRANULARIDADE: Record<Granularidade, string> = { dia: 'Dia', mes: 'Mês', trimestre: 'Trimestre', ano: 'Ano' }

function Linha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b bg-muted/10">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16 flex-shrink-0">{titulo}</span>
        {children}
      </div>
    </div>
  )
}

export function PeriodSelector({
  granularidade, ano, mes, trimestre,
  onGranularidade, onAno, onMes, onTrimestre,
  permitirDia, domingos = [], dataDia, onDataDia,
  titulo = 'Análise de Presença', label, filtros, acoes, className, children,
}: PeriodSelectorProps) {
  const anoIdx = ANOS_DISPONIVEIS.indexOf(ano)
  const podePrev = anoIdx > 0
  const podeNext = anoIdx < ANOS_DISPONIVEIS.length - 1
  const opcoes: Granularidade[] = permitirDia ? ['dia', 'mes', 'trimestre', 'ano'] : ['mes', 'trimestre', 'ano']

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      {/* Cabeçalho + granularidade */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b bg-muted/30">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          {label && <p className="text-sm text-muted-foreground">{label}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/40">
            {opcoes.map(g => (
              <button
                key={g}
                onClick={() => onGranularidade(g)}
                className={cn(
                  'px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all',
                  granularidade === g ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {LABEL_GRANULARIDADE[g]}
              </button>
            ))}
          </div>
          {acoes}
        </div>
      </div>

      <Linha titulo="Ano">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => podePrev && onAno(ANOS_DISPONIVEIS[anoIdx - 1])}
            disabled={!podePrev}
            aria-label="Ano anterior"
            className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {ANOS_DISPONIVEIS.map(a => (
            <button
              key={a}
              onClick={() => onAno(a)}
              className={cn('px-3 py-1 rounded text-sm font-semibold transition-all', ano === a ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground')}
            >
              {a}
            </button>
          ))}
          <button
            onClick={() => podeNext && onAno(ANOS_DISPONIVEIS[anoIdx + 1])}
            disabled={!podeNext}
            aria-label="Próximo ano"
            className="p-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </Linha>

      {filtros && <Linha titulo="Filtro">{filtros}</Linha>}

      {granularidade === 'trimestre' && (
        <Linha titulo="Trimestre">
          <div className="flex gap-1.5 flex-wrap">
            {TRIMESTRES.map((t, idx) => (
              <button
                key={idx}
                onClick={() => onTrimestre(idx)}
                className={cn(
                  'flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  trimestre === idx ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground hover:border-primary/40',
                )}
              >
                <span className="font-bold">{t.label}</span>
                <span className={cn('text-[10px]', trimestre === idx ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>{t.desc}</span>
              </button>
            ))}
          </div>
        </Linha>
      )}

      {(granularidade === 'mes' || granularidade === 'dia') && (
        <Linha titulo="Mês">
          <div className="flex gap-1 flex-wrap">
            {MESES_CURTOS.map((m, idx) => (
              <button
                key={idx}
                onClick={() => onMes(idx)}
                className={cn('px-2.5 py-1 rounded text-xs font-medium transition-all', mes === idx ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground')}
              >
                {m}
              </button>
            ))}
          </div>
        </Linha>
      )}

      {granularidade === 'dia' && (
        <Linha titulo="Domingo">
          {domingos.length === 0 ? (
            <span className="text-xs text-muted-foreground">Nenhuma chamada neste mês.</span>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {domingos.map(d => (
                <button
                  key={d}
                  onClick={() => onDataDia?.(d)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all', dataDia === d ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-muted-foreground')}
                >
                  {format(parseISO(d), 'dd/MM', { locale: ptBR })}
                </button>
              ))}
            </div>
          )}
        </Linha>
      )}

      {children}
    </div>
  )
}

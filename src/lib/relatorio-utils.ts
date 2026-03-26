import { parseISO } from 'date-fns'
import { TRIMESTRES } from '@/lib/constants'

export type Granularidade = 'dia' | 'mes' | 'trimestre' | 'ano'

/** Filtra chamadas por granularidade de período */
export function filtrarPorPeriodo<T extends { data?: string | null; [key: string]: any }>(
  chamadas: T[],
  opts: { granularidade: Granularidade; mes: number; trim: number }
): T[] {
  return chamadas.filter((c) => {
    if (!c.data) return opts.granularidade === 'ano'
    const m = parseISO(c.data).getMonth()
    if (opts.granularidade === 'mes' || opts.granularidade === 'dia') return m === opts.mes
    if (opts.granularidade === 'trimestre') return TRIMESTRES[opts.trim].meses.includes(m)
    return true
  })
}

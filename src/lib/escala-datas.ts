// ─── Datas das aulas da escala ────────────────────────────────────────────────
// Cada aula do trimestre pertence a um domingo. Quando a aula é remarcada para
// outro dia da mesma semana (de quinta antes a quarta depois), ela continua
// ligada ao domingo mais próximo — mantendo número da aula e lição.

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Domingo ao qual a aula pertence (o domingo mais próximo da data). */
export function domingoReferencia(data: string): string {
  const d = new Date(data + 'T12:00:00')
  const dia = d.getDay()
  d.setDate(d.getDate() + (dia <= 3 ? -dia : 7 - dia))
  return isoLocal(d)
}

/** Menor e maior data para onde a aula daquele domingo pode ser remarcada. */
export function limitesRemarcacao(domingo: string): { min: string; max: string } {
  const d = new Date(domingo + 'T12:00:00')
  const min = new Date(d); min.setDate(d.getDate() - 3)
  const max = new Date(d); max.setDate(d.getDate() + 3)
  return { min: isoLocal(min), max: isoLocal(max) }
}

export function ehDomingo(data: string): boolean {
  return new Date(data + 'T12:00:00').getDay() === 0
}

/** "quinta-feira", "sábado"... */
export function diaDaSemana(data: string): string {
  return DIAS[new Date(data + 'T12:00:00').getDay()] ?? ''
}

/** Trimestre (1–4) e ano da aula, pelo domingo de referência. */
export function periodoDaAula(data: string): { ano: number; trimestre: number } {
  const dom = new Date(domingoReferencia(data) + 'T12:00:00')
  return { ano: dom.getFullYear(), trimestre: Math.floor(dom.getMonth() / 3) + 1 }
}

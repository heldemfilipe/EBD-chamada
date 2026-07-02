// ─── Utilitários de presença ───────────────────────────────────────────────────

import { BG_TO_HEX, CORES_FALLBACK } from './constants'

/** Calcula percentual de presença (0–100), retorna 0 quando total = 0 */
export function calcularPct(presentes: number, total: number): number {
  if (!total) return 0
  return Math.round((presentes / total) * 100)
}

/** Cor hex para gráfico baseado no percentual */
export function corPresenca(pct: number): string {
  if (pct >= 90) return '#22c55e'  // verde
  if (pct >= 75) return '#eab308'  // amarelo
  return '#ef4444'                 // vermelho
}

/** Classe de texto Tailwind baseada no percentual */
export function corTextoPresenca(pct: number): string {
  if (pct >= 90) return 'text-green-600'
  if (pct >= 75) return 'text-yellow-600'
  return 'text-red-600'
}

/** Classe de badge (bg + text + border) baseada no percentual */
export function badgePresenca(pct: number): string {
  if (pct >= 90) return 'bg-green-500/15 text-green-600 border-green-500/30'
  if (pct >= 75) return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
  return 'bg-red-500/15 text-red-600 border-red-500/30'
}

/** Rótulo textual do nível de presença */
export function labelPresenca(pct: number): string {
  if (pct >= 90) return 'Excelente'
  if (pct >= 75) return 'Bom'
  return 'Atenção'
}

/** Classe da barra de progresso baseada no percentual */
export function corBarraPresenca(pct: number): string {
  if (pct === 100) return 'bg-green-500'
  if (pct >= 90)   return 'bg-primary'
  return 'bg-yellow-500'
}

/**
 * Converte uma classe bg-* do Tailwind para cor hex.
 * Usa a cor diretamente se já for hex; caso contrário, usa o mapeamento BG_TO_HEX
 * e cai no CORES_FALLBACK pelo índice.
 */
export function resolverCor(cor: string | undefined | null, fallbackIdx: number): string {
  if (!cor) return CORES_FALLBACK[fallbackIdx % CORES_FALLBACK.length]
  if (cor.startsWith('#')) return cor
  return BG_TO_HEX[cor] ?? CORES_FALLBACK[fallbackIdx % CORES_FALLBACK.length]
}

/**
 * Converte uma classe bg-* de turma para rgba CSS numa dada opacidade.
 * Ex: turmaCorRgba('bg-blue-500', 0, 0.1) => 'rgba(59,130,246,0.1)'
 */
export function turmaCorRgba(cor: string | undefined | null, fallbackIdx: number, opacity: number): string {
  const hex = resolverCor(cor, fallbackIdx)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

/**
 * Agrega um array de presenças brutas num objeto { presentes, total, pct }.
 * Aceita o shape vindo do Supabase: `{ presente: boolean }[]`
 */
export function agregarPresencas(presencas: { presente: boolean }[]): {
  presentes: number
  total: number
  pct: number
} {
  const total = presencas.length
  const presentes = presencas.filter((p) => p.presente === true).length
  return { presentes, total, pct: calcularPct(presentes, total) }
}

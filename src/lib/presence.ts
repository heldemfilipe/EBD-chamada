// ─── Utilitários de presença ───────────────────────────────────────────────────

import { BG_TO_HEX, CORES_FALLBACK } from './constants'

/** Calcula percentual de presença (0–100), retorna 0 quando total = 0 */
export function calcularPct(presentes: number, total: number): number {
  if (!total) return 0
  return Math.round((presentes / total) * 100)
}

// ─── Escala única de avaliação (usada em todas as telas) ──────────────────────
//   90%+ Excelente · 70%+ Bom · 50%+ Regular · abaixo de 50% Crítico

export type NivelPresenca = 'excelente' | 'bom' | 'regular' | 'critico'

export const FAIXAS_PRESENCA: { nivel: NivelPresenca; min: number; label: string; hex: string; texto: string; badge: string; barra: string }[] = [
  { nivel: 'excelente', min: 90, label: 'Excelente', hex: '#22c55e', texto: 'text-green-600',  badge: 'bg-green-500/15 text-green-600 border-green-500/30',   barra: 'bg-green-500' },
  { nivel: 'bom',       min: 70, label: 'Bom',       hex: '#3b82f6', texto: 'text-blue-600',   badge: 'bg-blue-500/15 text-blue-600 border-blue-500/30',      barra: 'bg-blue-500' },
  { nivel: 'regular',   min: 50, label: 'Regular',   hex: '#eab308', texto: 'text-yellow-600', badge: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30', barra: 'bg-yellow-500' },
  { nivel: 'critico',   min: 0,  label: 'Crítico',   hex: '#ef4444', texto: 'text-red-600',    badge: 'bg-red-500/15 text-red-600 border-red-500/30',         barra: 'bg-red-500' },
]

export function faixaPresenca(pct: number) {
  return FAIXAS_PRESENCA.find(f => pct >= f.min) ?? FAIXAS_PRESENCA[FAIXAS_PRESENCA.length - 1]
}

/** Cor hex para gráfico baseado no percentual */
export function corPresenca(pct: number): string {
  return faixaPresenca(pct).hex
}

/** Classe de texto Tailwind baseada no percentual */
export function corTextoPresenca(pct: number): string {
  return faixaPresenca(pct).texto
}

/** Classe de badge (bg + text + border) baseada no percentual */
export function badgePresenca(pct: number): string {
  return faixaPresenca(pct).badge
}

/** Rótulo textual do nível de presença */
export function labelPresenca(pct: number): string {
  return faixaPresenca(pct).label
}

/** Classe da barra de progresso baseada no percentual */
export function corBarraPresenca(pct: number): string {
  return faixaPresenca(pct).barra
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

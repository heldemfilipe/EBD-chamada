// ─── Constantes globais do sistema EBD ────────────────────────────────────────

export const ANOS_DISPONIVEIS = (() => {
  const anoAtual = new Date().getFullYear()
  const anos: number[] = []
  for (let a = 2026; a <= Math.max(anoAtual + 1, 2027); a++) anos.push(a)
  return anos
})()

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export const TRIMESTRES = [
  { label: '1º Trim', desc: 'Jan – Mar', meses: [0, 1, 2] },
  { label: '2º Trim', desc: 'Abr – Jun', meses: [3, 4, 5] },
  { label: '3º Trim', desc: 'Jul – Set', meses: [6, 7, 8] },
  { label: '4º Trim', desc: 'Out – Dez', meses: [9, 10, 11] },
]

/** Cores hex usadas em gráficos quando a turma não tem cor cadastrada */
export const CORES_FALLBACK = [
  '#EAB308', '#F97316', '#3B82F6', '#A855F7',
  '#22C55E', '#14B8A6', '#EF4444', '#EC4899',
]

/** Mapeamento de classes Tailwind bg para hex (usado em legenda de gráficos) */
export const BG_TO_HEX: Record<string, string> = {
  'bg-yellow-500': '#EAB308',
  'bg-orange-500': '#F97316',
  'bg-blue-500':   '#3B82F6',
  'bg-purple-500': '#A855F7',
  'bg-green-500':  '#22C55E',
  'bg-teal-500':   '#14B8A6',
  'bg-red-500':    '#EF4444',
  'bg-pink-500':   '#EC4899',
  'bg-indigo-500': '#6366F1',
  'bg-cyan-500':   '#06B6D4',
}

/** Faixas etárias padrão da EBD */
export const FAIXAS_ETARIAS = [
  { label: 'Crianças (0–7)',   min: 0,  max: 7  },
  { label: 'Juniores (8–11)', min: 8,  max: 11 },
  { label: 'Adolescentes (12–17)', min: 12, max: 17 },
  { label: 'Jovens (18–25)', min: 18, max: 25 },
  { label: 'Adultos (26+)',  min: 26, max: 999 },
]

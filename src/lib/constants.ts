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

/** Cargos eclesiásticos com cores */
export const CARGOS = [
  { label: 'Pastor',      bg: '#7C3AED20', color: '#7C3AED', border: '#7C3AED50' },
  { label: 'Evangelista', bg: '#2563EB20', color: '#2563EB', border: '#2563EB50' },
  { label: 'Presbítero',  bg: '#4F46E520', color: '#4F46E5', border: '#4F46E550' },
  { label: 'Diácono',     bg: '#16A34A20', color: '#16A34A', border: '#16A34A50' },
  { label: 'Cooperador',  bg: '#0D948820', color: '#0D9488', border: '#0D948850' },
  { label: 'Obreiro',     bg: '#EA580C20', color: '#EA580C', border: '#EA580C50' },
]

export function getCargo(cargo: string) {
  return CARGOS.find(c => c.label === cargo) ?? null
}

// ─── Temas das revistas CPAD por ano/trimestre ────────────────────────────────
export const TEMAS_REVISTA: Record<string, Record<number, Record<string, string>>> = {
  '2026': {
    2: {
      adultos:      'Homens dos quais o Mundo não Era Digno',
      jovens:       'Entre a Verdade e o Engano',
      adolescentes: 'As Parábolas de Jesus são Vivas',
      juniores:     'Israel e a Terra Prometida',
      primarios:    'Os Ensinamentos de Deus',
    },
  },
}

/** Mapeia o nome de uma turma para a categoria de revista CPAD */
export function getTurmaCategoria(nome: string): string | null {
  const n = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (n.includes('adulto') || n.includes('heroi') || n.includes('herois')) return 'adultos'
  if (n.includes('filha') || n.includes('shekinah') || n.includes('jovem')) return 'jovens'
  if (n.includes('adolesc') || n.includes('dynamo')) return 'adolescentes'
  if (n.includes('junior') || n.includes('guerreiro')) return 'juniores'
  if (n.includes('primar') || n.includes('cordeirinho')) return 'primarios'
  return null
}

/** Retorna o tema da revista para uma turma em um período */
export function getTemaRevista(turmaNome: string, ano: string | number, trimestre: number): string | null {
  const cat = getTurmaCategoria(turmaNome)
  if (!cat) return null
  return TEMAS_REVISTA[String(ano)]?.[trimestre]?.[cat] ?? null
}

/** Faixas etárias padrão da EBD */
export const FAIXAS_ETARIAS = [
  { label: 'Crianças (0–7)',   min: 0,  max: 7  },
  { label: 'Juniores (8–11)', min: 8,  max: 11 },
  { label: 'Adolescentes (12–17)', min: 12, max: 17 },
  { label: 'Jovens (18–25)', min: 18, max: 25 },
  { label: 'Adultos (26+)',  min: 26, max: 999 },
]

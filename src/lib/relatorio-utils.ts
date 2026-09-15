import { parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MESES, MESES_CURTOS, TRIMESTRES } from '@/lib/constants'

export type Granularidade = 'dia' | 'mes' | 'trimestre' | 'ano'

// ─── Regra única de presença ──────────────────────────────────────────────────
// Em TODAS as telas, a presença de um aluno = presenças / registros de chamada
// do aluno no período (em qualquer turma). Domingos antes de o aluno entrar na
// turma não contam como falta, e a troca de turma não zera o histórico.

/** Filtra chamadas por período. Em 'dia', usa a data exata (YYYY-MM-DD). */
export function filtrarPorPeriodo<T extends { data?: string | null; [key: string]: any }>(
  chamadas: T[],
  opts: { granularidade: Granularidade; mes: number; trim: number; dataDia?: string | null }
): T[] {
  return chamadas.filter((c) => {
    if (!c.data) return opts.granularidade === 'ano'
    if (opts.granularidade === 'dia') {
      if (opts.dataDia) return c.data.slice(0, 10) === opts.dataDia
      return parseISO(c.data).getMonth() === opts.mes
    }
    const m = parseISO(c.data).getMonth()
    if (opts.granularidade === 'mes') return m === opts.mes
    if (opts.granularidade === 'trimestre') return TRIMESTRES[opts.trim].meses.includes(m)
    return true
  })
}

/** Período imediatamente anterior (para comparação). */
export function periodoAnterior(opts: { granularidade: Exclude<Granularidade, 'dia'>; ano: number; mes: number; trim: number }) {
  const { granularidade, ano, mes, trim } = opts
  if (granularidade === 'ano') return { granularidade, ano: ano - 1, mes, trim }
  if (granularidade === 'trimestre') return trim === 0 ? { granularidade, ano: ano - 1, mes, trim: 3 } : { granularidade, ano, mes, trim: trim - 1 }
  return mes === 0 ? { granularidade, ano: ano - 1, mes: 11, trim } : { granularidade, ano, mes: mes - 1, trim }
}

export function labelPeriodo(opts: { granularidade: Granularidade; ano: number; mes: number; trim: number; dataDia?: string | null }): string {
  const { granularidade, ano, mes, trim, dataDia } = opts
  if (granularidade === 'dia' && dataDia) return format(parseISO(dataDia), "dd/MM/yyyy", { locale: ptBR })
  if (granularidade === 'dia' || granularidade === 'mes') return `${MESES[mes]} de ${ano}`
  if (granularidade === 'trimestre') return `${TRIMESTRES[trim].label} ${ano} (${TRIMESTRES[trim].desc})`
  return `Ano ${ano}`
}

export function labelCurtoPeriodo(opts: { granularidade: Granularidade; ano: number; mes: number; trim: number }): string {
  const { granularidade, ano, mes, trim } = opts
  if (granularidade === 'dia' || granularidade === 'mes') return `${MESES_CURTOS[mes]}/${ano}`
  if (granularidade === 'trimestre') return `${TRIMESTRES[trim].label} ${ano}`
  return String(ano)
}

/** Datas distintas (YYYY-MM-DD), em ordem. */
export function datasDistintas(chamadas: { data?: string | null }[]): string[] {
  return Array.from(new Set(chamadas.map(c => c.data?.slice(0, 10)).filter((d): d is string => !!d))).sort()
}

export interface PontoEvolucao { periodo: string; presentes: number; total: number; pct: number | null }

/**
 * Série do gráfico de evolução: um ponto por domingo (dia/mês/trimestre) ou por mês (ano).
 * `presentes`/`total` = presenças e registros de alunos.
 */
export function serieEvolucao(
  chamadas: { data?: string | null; presentes: number; total: number }[],
  granularidade: Granularidade,
): PontoEvolucao[] {
  if (granularidade === 'ano') {
    const meses = Array.from({ length: 12 }, () => ({ presentes: 0, total: 0 }))
    for (const c of chamadas) {
      if (!c.data) continue
      const m = parseISO(c.data).getMonth()
      meses[m].presentes += c.presentes
      meses[m].total += c.total
    }
    return meses.map((m, i) => ({
      periodo: MESES_CURTOS[i], presentes: m.presentes, total: m.total,
      pct: m.total ? Math.round((m.presentes / m.total) * 100) : null,
    }))
  }
  const porData = new Map<string, { presentes: number; total: number }>()
  for (const c of chamadas) {
    const d = c.data?.slice(0, 10)
    if (!d) continue
    const acc = porData.get(d) ?? { presentes: 0, total: 0 }
    acc.presentes += c.presentes
    acc.total += c.total
    porData.set(d, acc)
  }
  return Array.from(porData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({
      periodo: format(parseISO(d), 'dd/MM', { locale: ptBR }),
      presentes: v.presentes, total: v.total,
      pct: v.total ? Math.round((v.presentes / v.total) * 100) : null,
    }))
}

// ─── Nomes repetidos ──────────────────────────────────────────────────────────

const normalizarNome = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Cria uma função que devolve o nome de exibição do aluno. Quando o mesmo nome
 * aparece mais de uma vez, acrescenta a turma ("Lucas · Shekinah"); se também
 * forem da mesma turma, numera ("Lucas · Shekinah (2)").
 */
export function criarRotuloNome(itens: { id: string; nome: string; turma?: string | null }[]) {
  const porNome = new Map<string, { id: string; turma: string }[]>()
  for (const i of itens) {
    const k = normalizarNome(i.nome)
    const lista = porNome.get(k) ?? []
    if (!lista.some(x => x.id === i.id)) lista.push({ id: i.id, turma: i.turma ?? 'Sem turma' })
    porNome.set(k, lista)
  }
  const rotulos = new Map<string, string>()
  for (const i of itens) {
    const lista = porNome.get(normalizarNome(i.nome))!
    if (lista.length < 2) { rotulos.set(i.id, i.nome); continue }
    const turma = i.turma ?? 'Sem turma'
    const mesmaTurma = lista.filter(x => x.turma === turma)
    const sufixo = mesmaTurma.length > 1 ? ` (${mesmaTurma.findIndex(x => x.id === i.id) + 1})` : ''
    rotulos.set(i.id, `${i.nome} · ${turma}${sufixo}`)
  }
  return (id: string, nomePadrao = ''): string => rotulos.get(id) ?? nomePadrao
}

/** Conjunto de nomes (normalizados) que se repetem. */
export function nomesRepetidos(itens: { nome: string }[]): Set<string> {
  const cont = new Map<string, number>()
  for (const i of itens) cont.set(normalizarNome(i.nome), (cont.get(normalizarNome(i.nome)) ?? 0) + 1)
  return new Set(Array.from(cont).filter(([, n]) => n > 1).map(([k]) => k))
}

export { normalizarNome }

// ─── Ranking com empates ──────────────────────────────────────────────────────

/**
 * Ordena por % (desc), depois presenças (desc), depois nome, e atribui a mesma
 * posição a quem empata em % e presenças (ex.: 1º, 1º, 3º).
 */
export function rankingComEmpates<T extends { pct: number; presentes: number; nome: string }>(lista: T[]): (T & { posicao: number; empatado: boolean })[] {
  const ordenada = [...lista].sort((a, b) => b.pct - a.pct || b.presentes - a.presentes || a.nome.localeCompare(b.nome, 'pt-BR'))
  const res: (T & { posicao: number; empatado: boolean })[] = []
  ordenada.forEach((item, i) => {
    const anterior = res[i - 1]
    const empataAnterior = !!anterior && anterior.pct === item.pct && anterior.presentes === item.presentes
    const posicao = empataAnterior ? anterior.posicao : i + 1
    res.push({ ...item, posicao, empatado: false })
    if (empataAnterior) { res[i - 1].empatado = true; res[i].empatado = true }
  })
  return res
}

// ─── Sequência de faltas ──────────────────────────────────────────────────────

/**
 * A partir dos registros do aluno (qualquer ordem), devolve quantas faltas
 * seguidas ele tem nos domingos mais recentes e a data da última presença.
 */
export function sequenciaFaltas(registros: { data: string; presente: boolean }[]): { faltasSeguidas: number; ultimaPresenca: string | null } {
  const ordenados = [...registros].sort((a, b) => b.data.localeCompare(a.data))
  let faltasSeguidas = 0
  for (const r of ordenados) {
    if (r.presente) break
    faltasSeguidas++
  }
  const ultima = ordenados.find(r => r.presente)
  return { faltasSeguidas, ultimaPresenca: ultima?.data ?? null }
}

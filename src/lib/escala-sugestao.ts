// ─── Regras do "Gerar Sugestão" da escala ─────────────────────────────────────
// Configuração por congregação (tabela escala_config_sugestao). Usa IDs de
// professores e turmas, então regras de uma congregação nunca afetam outra.
// Compartilhado entre cliente e servidor — sem imports de servidor aqui.

export type Paridade = 'par' | 'impar' | 'todos'
export type Trimestre = '1' | '2' | '3' | '4'

export interface LimiteTurma {
  professorId: string
  turmaId: string
  maxAulas: number
}

export interface ParIncompativel {
  a: string
  b: string
}

export interface ConfigSugestao {
  versao: 2
  /** Evita escalar o mesmo professor em domingos seguidos (relaxa se faltar gente) */
  semDomingosSeguidos: boolean
  /** Turmas que não entram na geração automática */
  turmasExcluidas: string[]
  /** Professores que só dão aula em aulas pares/ímpares, conforme o trimestre */
  paridadeProfessores: string[]
  paridadePorTrimestre: Record<Trimestre, Paridade>
  /** Professores que não podem no 2º domingo do mês */
  semSegundoDomingo: string[]
  /** Professores que não podem na 1ª aula do trimestre */
  semPrimeiraAula: string[]
  /** Máximo de aulas no trimestre de um professor em uma turma */
  limitesPorTurma: LimiteTurma[]
  /** Professores que não devem ser escalados no mesmo domingo */
  paresIncompativeis: ParIncompativel[]
}

export const CONFIG_SUGESTAO_VAZIA: ConfigSugestao = {
  versao: 2,
  semDomingosSeguidos: true,
  turmasExcluidas: [],
  paridadeProfessores: [],
  paridadePorTrimestre: { '1': 'par', '2': 'par', '3': 'par', '4': 'par' },
  semSegundoDomingo: [],
  semPrimeiraAula: [],
  limitesPorTurma: [],
  paresIncompativeis: [],
}

const TRIMESTRES: Trimestre[] = ['1', '2', '3', '4']

function listaIds(v: unknown): string[] {
  return Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && !!x))) : []
}

/** Converte qualquer entrada em uma configuração válida (campos ausentes → padrão). */
export function normalizarConfigSugestao(raw: unknown): ConfigSugestao {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const paridadePorTrimestre = { ...CONFIG_SUGESTAO_VAZIA.paridadePorTrimestre }
  for (const t of TRIMESTRES) {
    const v = r.paridadePorTrimestre?.[t]
    if (v === 'par' || v === 'impar' || v === 'todos') paridadePorTrimestre[t] = v
  }

  const limitesPorTurma: LimiteTurma[] = Array.isArray(r.limitesPorTurma)
    ? r.limitesPorTurma
        .filter((l: any) => typeof l?.professorId === 'string' && typeof l?.turmaId === 'string' && l.professorId && l.turmaId)
        .map((l: any) => ({
          professorId: l.professorId,
          turmaId: l.turmaId,
          maxAulas: Math.max(0, Math.min(20, parseInt(l.maxAulas) || 0)),
        }))
    : []

  const paresIncompativeis: ParIncompativel[] = Array.isArray(r.paresIncompativeis)
    ? r.paresIncompativeis
        .filter((p: any) => typeof p?.a === 'string' && typeof p?.b === 'string' && p.a && p.b && p.a !== p.b)
        .map((p: any) => ({ a: p.a, b: p.b }))
    : []

  return {
    versao: 2,
    semDomingosSeguidos: r.semDomingosSeguidos !== false,
    turmasExcluidas: listaIds(r.turmasExcluidas),
    paridadeProfessores: listaIds(r.paridadeProfessores),
    paridadePorTrimestre,
    semSegundoDomingo: listaIds(r.semSegundoDomingo),
    semPrimeiraAula: listaIds(r.semPrimeiraAula),
    limitesPorTurma,
    paresIncompativeis,
  }
}

/** Remove da configuração IDs que não existem mais (professor/turma removidos). */
export function filtrarConfigPorIds(cfg: ConfigSugestao, professorIds: Set<string>, turmaIds: Set<string>): ConfigSugestao {
  const prof = (ids: string[]) => ids.filter(id => professorIds.has(id))
  return {
    ...cfg,
    turmasExcluidas: cfg.turmasExcluidas.filter(id => turmaIds.has(id)),
    paridadeProfessores: prof(cfg.paridadeProfessores),
    semSegundoDomingo: prof(cfg.semSegundoDomingo),
    semPrimeiraAula: prof(cfg.semPrimeiraAula),
    limitesPorTurma: cfg.limitesPorTurma.filter(l => professorIds.has(l.professorId) && turmaIds.has(l.turmaId)),
    paresIncompativeis: cfg.paresIncompativeis.filter(p => professorIds.has(p.a) && professorIds.has(p.b)),
  }
}

/** Quantidade de regras ativas (para indicar na interface). */
export function contarRegras(cfg: ConfigSugestao): number {
  return cfg.turmasExcluidas.length
    + cfg.paridadeProfessores.length
    + cfg.semSegundoDomingo.length
    + cfg.semPrimeiraAula.length
    + cfg.limitesPorTurma.length
    + cfg.paresIncompativeis.length
}

"use server"

import sql from '@/lib/db'
import { exigirModulo, filtrarChamadasDaCongregacao } from '@/lib/sessao'

// Observação sobre os totais: presenças e visitantes são contados em subconsultas
// separadas. Juntar as duas tabelas no mesmo JOIN multiplica as linhas (cada
// aluno × cada visitante) e infla presentes/faltas/bíblias/revistas.

export async function buscarTurmasDisponiveis() {
  const { cid } = await exigirModulo(['relatorios', 'usuarios'])
  const rows = await sql`SELECT id, nome FROM turmas WHERE ativa = true AND congregacao_id = ${cid} ORDER BY nome`
  return rows.map(r => ({ id: r.id, nome: r.nome }))
}

export interface ChamadaAgregada {
  id: string
  data: string
  turma_id: string
  oferta: number
  presentes: number
  ausentes: number
  biblias: number
  revistas: number
  visitantes: number
}

/** Uma linha por chamada do ano, com totais corretos (sem multiplicação de JOIN). */
export async function buscarChamadasPorAno(ano: number, turmaFiltro?: string): Promise<ChamadaAgregada[]> {
  const { cid } = await exigirModulo('relatorios')
  const rows = await sql`
    SELECT c.id, c.data, c.turma_id, c.oferta,
      COALESCE(p.presentes, 0)::int AS presentes,
      COALESCE(p.ausentes, 0)::int  AS ausentes,
      COALESCE(p.biblias, 0)::int   AS biblias,
      COALESCE(p.revistas, 0)::int  AS revistas,
      COALESCE(v.visitantes, 0)::int AS visitantes
    FROM chamadas c
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE presente) AS presentes,
             COUNT(*) FILTER (WHERE NOT presente) AS ausentes,
             COUNT(*) FILTER (WHERE presente AND trouxe_biblia) AS biblias,
             COUNT(*) FILTER (WHERE presente AND trouxe_revista) AS revistas
      FROM presencas WHERE chamada_id = c.id
    ) p ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS visitantes FROM historico_visitantes WHERE chamada_id = c.id AND presente = true
    ) v ON true
    WHERE c.ano = ${ano} AND c.congregacao_id = ${cid}
      ${turmaFiltro ? sql`AND c.turma_id = ${turmaFiltro}` : sql``}
    ORDER BY c.data
  `
  return rows.map(r => ({
    id: r.id, data: r.data, turma_id: r.turma_id, oferta: Number(r.oferta) || 0,
    presentes: r.presentes, ausentes: r.ausentes, biblias: r.biblias,
    revistas: r.revistas, visitantes: r.visitantes,
  }))
}

/** Turmas ativas com número de matriculados (ordenadas pela sala). */
export async function buscarTurmasRelatorio() {
  const { cid } = await exigirModulo('relatorios')
  const rows = await sql`
    SELECT t.id, t.nome, t.cor, t.sala,
      (SELECT COUNT(*)::int FROM alunos a WHERE a.turma_id = t.id AND a.ativo = true) AS total_alunos
    FROM turmas t
    WHERE t.ativa = true AND t.congregacao_id = ${cid}
  `
  const numSala = (s: string | null) => parseInt(s?.match(/\d+/)?.[0] ?? '') || 999
  return rows
    .map(t => ({ id: t.id as string, nome: t.nome as string, cor: t.cor as string, sala: (t.sala ?? null) as string | null, totalAlunos: t.total_alunos as number }))
    .sort((a, b) => numSala(a.sala) - numSala(b.sala) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Presenças por aluno nas chamadas informadas (somente alunos ativos). */
export async function buscarRankingAlunos(chamadaIdsParam: string[], turmaFiltro?: string) {
  const { cid } = await exigirModulo('relatorios')
  const chamadaIds = await filtrarChamadasDaCongregacao(chamadaIdsParam, cid)
  if (chamadaIds.length === 0) return []

  const rows = await sql`
    SELECT a.id AS aluno_id, a.nome, t.nome AS turma_nome,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE p.presente)::int AS presentes
    FROM presencas p
    JOIN alunos a ON a.id = p.aluno_id AND a.ativo = true AND a.congregacao_id = ${cid}
    LEFT JOIN turmas t ON t.id = a.turma_id
    WHERE p.chamada_id = ANY(${chamadaIds}::uuid[])
      ${turmaFiltro ? sql`AND a.turma_id = ${turmaFiltro}` : sql``}
    GROUP BY a.id, a.nome, t.nome
  `
  return rows.map(r => ({
    aluno_id: r.aluno_id as string, nome: r.nome as string, turma_nome: (r.turma_nome ?? 'Sem turma') as string,
    total: r.total as number, presentes: r.presentes as number,
  }))
}

/**
 * Professores: aulas dadas vêm da ESCALA (quem foi escalado), e a presença
 * pessoal vem dos registros de chamada do professor como aluno (em qualquer turma).
 */
export async function buscarProfessoresRelatorio(ano: number) {
  const { cid } = await exigirModulo('relatorios')
  const [professores, profAlunos, escalas, registros] = await Promise.all([
    sql`
      SELECT p.id, p.nome,
        json_agg(json_build_object('turma_id', pt.turma_id, 'turma_nome', t.nome) ORDER BY t.nome) FILTER (WHERE pt.turma_id IS NOT NULL) AS turmas
      FROM professores p
      LEFT JOIN professor_turmas pt ON pt.professor_id = p.id
      LEFT JOIN turmas t ON t.id = pt.turma_id
      WHERE p.ativo = true AND p.congregacao_id = ${cid}
      GROUP BY p.id
    `,
    sql`SELECT id, responsavel FROM alunos WHERE responsavel LIKE 'professor:%' AND congregacao_id = ${cid}`,
    sql`SELECT professor_id, turma_id, data FROM escalas WHERE ano = ${ano} AND congregacao_id = ${cid} AND professor_id IS NOT NULL`,
    sql`
      SELECT p.aluno_id, c.data, p.presente, p.trouxe_biblia
      FROM presencas p
      JOIN chamadas c ON c.id = p.chamada_id
      JOIN alunos a ON a.id = p.aluno_id AND a.responsavel LIKE 'professor:%'
      WHERE c.ano = ${ano} AND c.congregacao_id = ${cid}
    `,
  ])

  return {
    professores: professores.map(p => ({ id: p.id as string, nome: p.nome as string, turmas: (p.turmas ?? []) as { turma_id: string; turma_nome: string }[] })),
    profAlunos: profAlunos.map(a => ({ alunoId: a.id as string, professorId: (a.responsavel as string).replace('professor:', '') })),
    escalas: escalas.map(e => ({ professor_id: e.professor_id as string, turma_id: e.turma_id as string, data: e.data as string })),
    registros: registros.map(r => ({ aluno_id: r.aluno_id as string, data: r.data as string, presente: r.presente as boolean, trouxe_biblia: r.trouxe_biblia as boolean })),
  }
}

export async function buscarVisitantesPorChamadas(chamadaIdsParam: string[]) {
  const { cid } = await exigirModulo('relatorios')
  const chamadaIds = await filtrarChamadasDaCongregacao(chamadaIdsParam, cid)
  if (chamadaIds.length === 0) return []
  const rows = await sql`
    SELECT hv.visitante_id, hv.data, hv.presente, hv.trouxe_biblia, hv.trouxe_revista,
      v.nome, v.telefone, v.convertido_em_aluno,
      (SELECT MIN(x.data) FROM historico_visitantes x WHERE x.visitante_id = hv.visitante_id AND x.presente = true) AS primeira_visita
    FROM historico_visitantes hv
    JOIN visitantes v ON v.id = hv.visitante_id
    WHERE hv.chamada_id = ANY(${chamadaIds}::uuid[])
    ORDER BY hv.data DESC
  `
  return rows.map(r => ({
    visitante_id: r.visitante_id as string, data: r.data as string, presente: r.presente as boolean,
    trouxe_biblia: r.trouxe_biblia as boolean, trouxe_revista: r.trouxe_revista as boolean,
    nome: r.nome as string, telefone: (r.telefone ?? '') as string, convertido_em_aluno: (r.convertido_em_aluno ?? false) as boolean,
    primeira_visita: (r.primeira_visita ?? null) as string | null,
  }))
}

/** Alunos da turma + registro de cada aluno em cada chamada (para tabela e mapa de presença). */
export async function buscarAlunosTurmaDetalhado(turmaId: string, chamadaIdsParam: string[]) {
  const { cid } = await exigirModulo('relatorios')
  const chamadaIds = await filtrarChamadasDaCongregacao(chamadaIdsParam, cid)
  const [alunos, chamadas, registros] = await Promise.all([
    sql`SELECT id, nome, cargo FROM alunos WHERE turma_id = ${turmaId} AND ativo = true AND congregacao_id = ${cid} ORDER BY nome`,
    chamadaIds.length > 0
      ? sql`SELECT id, data FROM chamadas WHERE id = ANY(${chamadaIds}::uuid[]) ORDER BY data`
      : Promise.resolve([] as any[]),
    chamadaIds.length > 0
      ? sql`SELECT aluno_id, chamada_id, presente, trouxe_biblia, trouxe_revista FROM presencas WHERE chamada_id = ANY(${chamadaIds}::uuid[])`
      : Promise.resolve([] as any[]),
  ])

  return {
    alunos: alunos.map(a => ({ id: a.id as string, nome: a.nome as string, cargo: (a.cargo ?? '') as string })),
    chamadas: chamadas.map((c: any) => ({ id: c.id as string, data: c.data as string })),
    registros: registros.map((p: any) => ({
      aluno_id: p.aluno_id as string, chamada_id: p.chamada_id as string, presente: p.presente as boolean,
      trouxe_biblia: p.trouxe_biblia as boolean, trouxe_revista: p.trouxe_revista as boolean,
    })),
  }
}

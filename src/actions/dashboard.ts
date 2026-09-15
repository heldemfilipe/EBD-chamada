"use server"

import sql from '@/lib/db'
import { exigirModulo } from '@/lib/sessao'

export async function buscarContadoresGerais() {
  const { cid } = await exigirModulo('dashboard')
  const [[alunos], [professores]] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE responsavel LIKE 'professor:%')::int AS professores
      FROM alunos WHERE ativo = true AND congregacao_id = ${cid}
    `,
    sql`SELECT COUNT(*)::int AS total FROM professores WHERE ativo = true AND congregacao_id = ${cid}`,
  ])
  return {
    totalAlunos: alunos.total as number,
    alunosProfessores: alunos.professores as number,
    totalProfessores: professores.total as number,
  }
}

export async function buscarTurmasComProfessores() {
  const { cid } = await exigirModulo('dashboard')
  const rows = await sql`
    SELECT
      t.id, t.nome, t.cor, t.sala,
      json_agg(DISTINCT p.nome) FILTER (WHERE p.nome IS NOT NULL) AS professores,
      COUNT(DISTINCT a.id)::int AS total_alunos
    FROM turmas t
    LEFT JOIN professor_turmas pt ON pt.turma_id = t.id
    LEFT JOIN professores p ON p.id = pt.professor_id AND p.ativo = true
    LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = true
    WHERE t.ativa = true AND t.congregacao_id = ${cid}
    GROUP BY t.id
  `
  const numSala = (s: string | null) => parseInt(s?.match(/\d+/)?.[0] ?? '') || 999
  return rows
    .map(r => ({
      id: r.id as string, nome: r.nome as string, cor: (r.cor ?? 'bg-blue-500') as string, sala: (r.sala ?? null) as string | null,
      professores: (r.professores ?? []) as string[],
      totalAlunos: r.total_alunos as number,
    }))
    .sort((a, b) => numSala(a.sala) - numSala(b.sala) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function buscarUltimasChamadas(limit: number) {
  const { cid } = await exigirModulo('dashboard')
  const rows = await sql`
    SELECT c.id, c.data, c.created_at, t.nome AS turma_nome,
      COUNT(p.aluno_id) FILTER (WHERE p.presente = true)::int AS presentes,
      COUNT(p.aluno_id)::int AS total
    FROM chamadas c
    LEFT JOIN turmas t ON t.id = c.turma_id
    LEFT JOIN presencas p ON p.chamada_id = c.id
    WHERE c.congregacao_id = ${cid}
    GROUP BY c.id, t.nome
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `
  return rows.map(r => ({
    id: r.id, data: r.data, created_at: r.created_at,
    turma_nome: r.turma_nome, presentes: r.presentes, total: r.total,
  }))
}

/** Visitantes recentes — um item por visitante (última visita), com o total de visitas. */
export async function buscarUltimosVisitantes(limit: number) {
  const { cid } = await exigirModulo('dashboard')
  const rows = await sql`
    SELECT * FROM (
      SELECT DISTINCT ON (hv.visitante_id)
        hv.visitante_id, hv.data, hv.created_at,
        v.nome AS visitante_nome, t.nome AS turma_nome,
        (SELECT COUNT(*)::int FROM historico_visitantes x WHERE x.visitante_id = hv.visitante_id AND x.presente = true) AS visitas
      FROM historico_visitantes hv
      JOIN visitantes v ON v.id = hv.visitante_id
      LEFT JOIN turmas t ON t.id = hv.turma_id
      WHERE hv.presente = true AND hv.congregacao_id = ${cid}
      ORDER BY hv.visitante_id, hv.data DESC, hv.created_at DESC
    ) ultimos
    ORDER BY data DESC, created_at DESC
    LIMIT ${limit}
  `
  return rows.map(r => ({
    id: r.visitante_id as string, data: r.data as string, created_at: r.created_at as string,
    visitante_nome: r.visitante_nome as string, turma_nome: r.turma_nome as string | null, visitas: r.visitas as number,
  }))
}

export async function buscarDadosPeriodo(ano: number) {
  const { cid } = await exigirModulo('dashboard')
  const [chamadas, alunos, turmas] = await Promise.all([
    sql`
      SELECT c.id, c.data, c.turma_id,
        json_agg(json_build_object('aluno_id', p.aluno_id, 'presente', p.presente))
          FILTER (WHERE p.aluno_id IS NOT NULL) AS presencas
      FROM chamadas c
      LEFT JOIN presencas p ON p.chamada_id = c.id
      WHERE c.ano = ${ano} AND c.congregacao_id = ${cid}
      GROUP BY c.id
      ORDER BY c.data
    `,
    sql`
      SELECT a.id, a.nome, a.turma_id, t.nome AS turma_nome, a.responsavel, a.cargo
      FROM alunos a
      LEFT JOIN turmas t ON t.id = a.turma_id
      WHERE a.ativo = true AND a.congregacao_id = ${cid}
    `,
    sql`SELECT id, nome, cor, sala FROM turmas WHERE ativa = true AND congregacao_id = ${cid}`,
  ])

  const numSala = (s: string | null) => parseInt(s?.match(/\d+/)?.[0] ?? '') || 999
  return {
    chamadas: chamadas.map(c => ({
      id: c.id as string, data: c.data as string, turma_id: c.turma_id as string,
      presencas: (c.presencas ?? []) as { aluno_id: string; presente: boolean }[],
    })),
    alunos: alunos.map(a => ({
      id: a.id as string, nome: a.nome as string, turma_id: a.turma_id as string | null, turma_nome: a.turma_nome as string | null,
      responsavel: a.responsavel as string | null, cargo: a.cargo as string | null,
    })),
    turmas: turmas
      .map(t => ({ id: t.id as string, nome: t.nome as string, cor: (t.cor ?? 'bg-blue-500') as string, sala: (t.sala ?? null) as string | null }))
      .sort((a, b) => numSala(a.sala) - numSala(b.sala) || a.nome.localeCompare(b.nome, 'pt-BR')),
  }
}

export async function buscarAniversariantes() {
  const { cid } = await exigirModulo('dashboard')
  const [alunos, professores] = await Promise.all([
    sql`
      SELECT a.id, a.nome, a.data_nascimento, a.responsavel,
        t.nome AS turma_nome
      FROM alunos a
      LEFT JOIN turmas t ON t.id = a.turma_id
      WHERE a.ativo = true AND a.data_nascimento IS NOT NULL AND a.congregacao_id = ${cid}
    `,
    sql`
      SELECT p.id, p.nome, p.data_nascimento
      FROM professores p
      WHERE p.ativo = true AND p.data_nascimento IS NOT NULL AND p.congregacao_id = ${cid}
        AND NOT EXISTS (SELECT 1 FROM alunos a WHERE a.responsavel = 'professor:' || p.id::text AND a.ativo = true)
    `,
  ])

  function normalizarData(v: unknown): string {
    if (!v) return ''
    if (v instanceof Date) return v.toISOString().split('T')[0]
    const s = String(v)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0]
    return s
  }

  const resultado = alunos.map(r => ({
    id: r.id as string,
    nome: r.nome as string,
    data_nascimento: normalizarData(r.data_nascimento),
    turma_nome: (r.turma_nome ?? '') as string,
    isProfessor: typeof r.responsavel === 'string' && (r.responsavel as string).startsWith('professor:'),
  })).filter(r => r.data_nascimento !== '')

  for (const p of professores) {
    const dn = normalizarData(p.data_nascimento)
    if (!dn) continue
    resultado.push({ id: p.id as string, nome: p.nome as string, data_nascimento: dn, turma_nome: '', isProfessor: true })
  }

  return resultado
}

/** Escala do próximo domingo com aula (a partir de `hoje`, YYYY-MM-DD) e status de confirmação. */
export async function buscarProximoDomingo(hoje: string) {
  const { cid } = await exigirModulo('dashboard')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hoje)) return null

  const [prox] = await sql`SELECT MIN(data) AS data FROM escalas WHERE congregacao_id = ${cid} AND data >= ${hoje}`
  if (!prox?.data) return null

  const base = sql`
    SELECT e.id, t.nome AS turma_nome, t.cor AS turma_cor, t.sala, p.nome AS professor_nome
    FROM escalas e
    JOIN turmas t ON t.id = e.turma_id
    LEFT JOIN professores p ON p.id = e.professor_id
    WHERE e.congregacao_id = ${cid} AND e.data = ${prox.data}
  `
  // Status de lembrete/confirmação (tolerante à migration 011 ainda não aplicada)
  const status = await sql`
    SELECT id, confirmado,
      to_char(lembrete_enviado_em   AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS lembrete_enviado_em,
      to_char(lembrete_reenviado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS lembrete_reenviado_em
    FROM escalas WHERE congregacao_id = ${cid} AND data = ${prox.data}
  `.catch(() => [])
  const porId = new Map(status.map(s => [s.id as string, s]))
  const numSala = (s: string | null) => parseInt(s?.match(/\d+/)?.[0] ?? '') || 999

  const escalas = (await base)
    .map(e => {
      const s = porId.get(e.id)
      return {
        id: e.id as string,
        turma_nome: e.turma_nome as string,
        turma_cor: (e.turma_cor ?? 'bg-blue-500') as string,
        sala: (e.sala ?? null) as string | null,
        professor_nome: (e.professor_nome ?? null) as string | null,
        confirmado: !!s?.confirmado,
        lembrete_enviado_em: (s?.lembrete_enviado_em ?? null) as string | null,
        lembrete_reenviado_em: (s?.lembrete_reenviado_em ?? null) as string | null,
      }
    })
    .sort((a, b) => numSala(a.sala) - numSala(b.sala))

  return { data: prox.data as string, escalas }
}

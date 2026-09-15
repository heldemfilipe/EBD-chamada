"use server"

import sql from '@/lib/db'
import { exigirModulo, assertTurmasDaCongregacao, assertProfessoresDaCongregacao } from '@/lib/sessao'
import {
  normalizarConfigSugestao, filtrarConfigPorIds, CONFIG_SUGESTAO_VAZIA, type ConfigSugestao,
} from '@/lib/escala-sugestao'

export async function buscarDadosEscala() {
  const { cid } = await exigirModulo('escala')
  const escalas        = await sql`SELECT id, data, turma_id, professor_id, trimestre, observacoes, titulo_aula FROM escalas WHERE congregacao_id = ${cid} ORDER BY data`
  const professores    = await sql`SELECT id, nome FROM professores WHERE ativo = true AND congregacao_id = ${cid} ORDER BY nome`
  const turmas         = await sql`SELECT id, nome, cor, sala FROM turmas WHERE ativa = true AND congregacao_id = ${cid} ORDER BY nome`
  const professorTurmas = await sql`
    SELECT pt.professor_id, pt.turma_id
    FROM professor_turmas pt
    JOIN turmas t ON t.id = pt.turma_id
    WHERE t.congregacao_id = ${cid}
  `
  // Tolerante à ausência da tabela (migration 010 ainda não aplicada)
  const [cfgRow] = await sql`SELECT config FROM escala_config_sugestao WHERE congregacao_id = ${cid}`.catch(() => [])

  return {
    escalas: escalas.map(e => ({
      id: e.id, data: e.data, turma_id: e.turma_id, professor_id: e.professor_id,
      trimestre: e.trimestre, observacoes: e.observacoes, titulo_aula: e.titulo_aula,
    })),
    professores: professores.map(p => ({ id: p.id, nome: p.nome })),
    turmas: turmas.map(t => ({ id: t.id, nome: t.nome, cor: t.cor, sala: t.sala ?? null })),
    professorTurmas: professorTurmas.map(pt => ({ professor_id: pt.professor_id, turma_id: pt.turma_id })),
    configSugestao: cfgRow ? normalizarConfigSugestao(cfgRow.config) : CONFIG_SUGESTAO_VAZIA,
  }
}

/** Salva as regras do "Gerar Sugestão" da congregação ativa. */
export async function salvarConfigSugestao(config: ConfigSugestao): Promise<{ success: boolean; config?: ConfigSugestao; error?: string }> {
  try {
    const { cid } = await exigirModulo('escala', 'editar')
    const [profs, turmas] = await Promise.all([
      sql`SELECT id FROM professores WHERE congregacao_id = ${cid}`,
      sql`SELECT id FROM turmas WHERE congregacao_id = ${cid}`,
    ])
    // Descarta qualquer ID que não seja desta congregação
    const limpa = filtrarConfigPorIds(
      normalizarConfigSugestao(config),
      new Set(profs.map(p => p.id as string)),
      new Set(turmas.map(t => t.id as string)),
    )
    await sql`
      INSERT INTO escala_config_sugestao (congregacao_id, config, updated_at)
      VALUES (${cid}, ${sql.json(limpa as any)}, NOW())
      ON CONFLICT (congregacao_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
    `
    return { success: true, config: limpa }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function salvarEscala(dados: {
  id?: string
  data: string
  turma_id: string
  professor_id: string
  observacoes?: string | null
  titulo_aula?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { cid } = await exigirModulo('escala', 'editar')
    await assertTurmasDaCongregacao([dados.turma_id], cid)
    await assertProfessoresDaCongregacao([dados.professor_id], cid)
    if (dados.id) {
      await sql`
        UPDATE escalas SET data = ${dados.data}, turma_id = ${dados.turma_id},
          professor_id = ${dados.professor_id}, observacoes = ${dados.observacoes ?? null},
          titulo_aula = ${dados.titulo_aula ?? null}
        WHERE id = ${dados.id} AND congregacao_id = ${cid}
      `
      return { success: true, id: dados.id }
    } else {
      const [row] = await sql`
        INSERT INTO escalas (data, turma_id, professor_id, observacoes, titulo_aula)
        VALUES (${dados.data}, ${dados.turma_id}, ${dados.professor_id}, ${dados.observacoes ?? null}, ${dados.titulo_aula ?? null})
        RETURNING id
      `
      return { success: true, id: row.id }
    }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function excluirEscala(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { cid } = await exigirModulo('escala', 'editar')
    await sql`DELETE FROM escalas WHERE id = ${id} AND congregacao_id = ${cid}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

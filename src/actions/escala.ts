"use server"

import sql from '@/lib/db'
import { exigirModulo, assertTurmasDaCongregacao, assertProfessoresDaCongregacao } from '@/lib/sessao'
import {
  normalizarConfigSugestao, filtrarConfigPorIds, CONFIG_SUGESTAO_VAZIA, type ConfigSugestao,
} from '@/lib/escala-sugestao'
import { MENSAGENS_PADRAO, type MensagensWhatsApp } from '@/lib/lembrete-whatsapp'

export async function buscarDadosEscala() {
  const { cid } = await exigirModulo('escala')
  const escalas        = await sql`SELECT id, data, turma_id, professor_id, trimestre, observacoes, titulo_aula FROM escalas WHERE congregacao_id = ${cid} ORDER BY data`
  const professores    = await sql`SELECT id, nome, telefone FROM professores WHERE ativo = true AND congregacao_id = ${cid} ORDER BY nome`
  const turmas         = await sql`SELECT id, nome, cor, sala FROM turmas WHERE ativa = true AND congregacao_id = ${cid} ORDER BY nome`
  const professorTurmas = await sql`
    SELECT pt.professor_id, pt.turma_id
    FROM professor_turmas pt
    JOIN turmas t ON t.id = pt.turma_id
    WHERE t.congregacao_id = ${cid}
  `
  // Tolerante à ausência da tabela (migration 010 ainda não aplicada)
  const [cfgRow] = await sql`SELECT config FROM escala_config_sugestao WHERE congregacao_id = ${cid}`.catch(() => [])

  // Acompanhamento dos lembretes de WhatsApp (tolerante à migration 011 ainda não aplicada)
  const lembretes = await sql`
    SELECT id, confirmado,
      to_char(lembrete_enviado_em   AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS lembrete_enviado_em,
      to_char(lembrete_reenviado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS lembrete_reenviado_em
    FROM escalas WHERE congregacao_id = ${cid}
  `.catch(() => [])
  const lembretePorEscala = new Map(lembretes.map(l => [l.id as string, l]))
  const [msgRow] = await sql`SELECT mensagem_lembrete, mensagem_reenvio FROM escala_mensagens_whatsapp WHERE congregacao_id = ${cid}`.catch(() => [])

  return {
    escalas: escalas.map(e => {
      const l = lembretePorEscala.get(e.id)
      return {
        id: e.id, data: e.data, turma_id: e.turma_id, professor_id: e.professor_id,
        trimestre: e.trimestre, observacoes: e.observacoes, titulo_aula: e.titulo_aula,
        confirmado: !!l?.confirmado,
        lembrete_enviado_em: (l?.lembrete_enviado_em ?? null) as string | null,
        lembrete_reenviado_em: (l?.lembrete_reenviado_em ?? null) as string | null,
      }
    }),
    professores: professores.map(p => ({ id: p.id, nome: p.nome, telefone: (p.telefone ?? null) as string | null })),
    turmas: turmas.map(t => ({ id: t.id, nome: t.nome, cor: t.cor, sala: t.sala ?? null })),
    professorTurmas: professorTurmas.map(pt => ({ professor_id: pt.professor_id, turma_id: pt.turma_id })),
    configSugestao: cfgRow ? normalizarConfigSugestao(cfgRow.config) : CONFIG_SUGESTAO_VAZIA,
    mensagensWhatsApp: {
      lembrete: msgRow?.mensagem_lembrete || MENSAGENS_PADRAO.lembrete,
      reenvio: msgRow?.mensagem_reenvio || MENSAGENS_PADRAO.reenvio,
    } as MensagensWhatsApp,
  }
}

// ─── Lembretes de WhatsApp ────────────────────────────────────────────────────

type ResultadoLembrete = {
  success: boolean
  error?: string
  confirmado?: boolean
  lembrete_enviado_em?: string | null
  lembrete_reenviado_em?: string | null
}

async function lerLembrete(id: string, cid: string): Promise<ResultadoLembrete> {
  const [row] = await sql`
    SELECT confirmado,
      to_char(lembrete_enviado_em   AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS lembrete_enviado_em,
      to_char(lembrete_reenviado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS lembrete_reenviado_em
    FROM escalas WHERE id = ${id} AND congregacao_id = ${cid}
  `
  if (!row) return { success: false, error: 'Escala não encontrada.' }
  return {
    success: true,
    confirmado: row.confirmado,
    lembrete_enviado_em: row.lembrete_enviado_em,
    lembrete_reenviado_em: row.lembrete_reenviado_em,
  }
}

/** Registra que o lembrete (ou o reenvio) foi aberto no WhatsApp. */
export async function registrarLembreteWhatsApp(escalaId: string, tipo: 'lembrete' | 'reenvio'): Promise<ResultadoLembrete> {
  try {
    const { cid } = await exigirModulo('escala', 'editar')
    if (tipo === 'reenvio') {
      await sql`
        UPDATE escalas SET lembrete_reenviado_em = NOW(),
          lembrete_enviado_em = COALESCE(lembrete_enviado_em, NOW())
        WHERE id = ${escalaId} AND congregacao_id = ${cid}
      `
    } else {
      await sql`
        UPDATE escalas SET lembrete_enviado_em = NOW(), lembrete_reenviado_em = NULL
        WHERE id = ${escalaId} AND congregacao_id = ${cid}
      `
    }
    return await lerLembrete(escalaId, cid)
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

/** Marca/desmarca a confirmação do professor. */
export async function definirConfirmacaoEscala(escalaId: string, confirmado: boolean): Promise<ResultadoLembrete> {
  try {
    const { cid } = await exigirModulo('escala', 'editar')
    await sql`
      UPDATE escalas SET confirmado = ${confirmado}, confirmado_em = ${confirmado ? sql`NOW()` : null}
      WHERE id = ${escalaId} AND congregacao_id = ${cid}
    `
    return await lerLembrete(escalaId, cid)
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

/** Salva os modelos de mensagem da congregação ativa. */
export async function salvarMensagensWhatsApp(dados: MensagensWhatsApp): Promise<{ success: boolean; error?: string }> {
  try {
    const { cid } = await exigirModulo('escala', 'editar')
    const lembrete = (dados.lembrete ?? '').trim()
    const reenvio = (dados.reenvio ?? '').trim()
    if (!lembrete || !reenvio) return { success: false, error: 'As duas mensagens precisam ter texto.' }
    if (lembrete.length > 2000 || reenvio.length > 2000) return { success: false, error: 'Mensagem muito longa (máx. 2000 caracteres).' }
    await sql`
      INSERT INTO escala_mensagens_whatsapp (congregacao_id, mensagem_lembrete, mensagem_reenvio, updated_at)
      VALUES (${cid}, ${lembrete}, ${reenvio}, NOW())
      ON CONFLICT (congregacao_id) DO UPDATE
        SET mensagem_lembrete = EXCLUDED.mensagem_lembrete, mensagem_reenvio = EXCLUDED.mensagem_reenvio, updated_at = NOW()
    `
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
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
        UPDATE escalas SET lembrete_enviado_em = NULL, lembrete_reenviado_em = NULL, confirmado = false, confirmado_em = NULL
        WHERE id = ${dados.id} AND congregacao_id = ${cid}
          AND (professor_id IS DISTINCT FROM ${dados.professor_id} OR data <> ${dados.data})
      `.catch(() => {}) // tolerante à migration 011 ainda não aplicada
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

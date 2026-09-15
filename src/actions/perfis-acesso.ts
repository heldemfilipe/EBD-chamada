"use server"

import sql from '@/lib/db'
import {
  exigirSessao, podeGerenciarUsuarios, normalizarModulos, assertPodeConceder,
  AcessoNegadoError, type ModuloPermissao, type Sessao,
} from '@/lib/sessao'

// Perfis de acesso = modelos de permissão reutilizáveis.
//   Global (congregacao_id NULL): criado/editado só pelo admin geral; as
//     congregações podem usar, mas não alterar.
//   Da congregação: visível e gerenciável apenas dentro dela.

export interface PerfilAcesso {
  id: string
  nome: string
  descricao: string | null
  global: boolean
  editavel: boolean
  modulos: ModuloPermissao[]
  total_usuarios: number
}

/** Congregação alvo: o admin geral pode escolher qualquer uma; os demais ficam na própria. */
async function resolverCongregacaoAlvo(s: Sessao, congregacaoId?: string | null): Promise<string | null> {
  if (s.adminGeral && congregacaoId) {
    const [c] = await sql`SELECT id FROM congregacoes WHERE id = ${congregacaoId}`
    return c?.id ?? null
  }
  return s.cid
}

export async function listarPerfisAcesso(congregacaoId?: string | null): Promise<PerfilAcesso[]> {
  const s = await exigirSessao()
  if (!podeGerenciarUsuarios(s, 'ver')) throw new AcessoNegadoError()
  const cid = await resolverCongregacaoAlvo(s, congregacaoId)
  if (!cid) return []

  const rows = await sql`
    SELECT pa.id, pa.nome, pa.descricao, pa.congregacao_id,
      COALESCE(
        (SELECT json_agg(json_build_object('modulo', m.modulo, 'nivel', m.nivel))
         FROM perfis_acesso_modulos m WHERE m.perfil_acesso_id = pa.id),
        '[]'
      ) AS modulos,
      (SELECT COUNT(*)::int FROM perfis u
        WHERE u.perfil_acesso_id = pa.id AND u.congregacao_id = ${cid}) AS total_usuarios
    FROM perfis_acesso pa
    WHERE pa.congregacao_id IS NULL OR pa.congregacao_id = ${cid}
    ORDER BY (pa.congregacao_id IS NOT NULL), pa.nome
  `
  const podeEditar = podeGerenciarUsuarios(s, 'editar')
  return rows.map(r => ({
    id: r.id,
    nome: r.nome,
    descricao: r.descricao,
    global: r.congregacao_id === null,
    editavel: podeEditar && (r.congregacao_id === null ? s.adminGeral : true),
    modulos: r.modulos,
    total_usuarios: r.total_usuarios,
  }))
}

export async function salvarPerfilAcesso(dados: {
  id?: string
  nome: string
  descricao?: string | null
  global?: boolean
  modulos: ModuloPermissao[]
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const s = await exigirSessao()
    if (!podeGerenciarUsuarios(s, 'editar') || !s.cid) throw new AcessoNegadoError()

    const nome = dados.nome?.trim()
    if (!nome) return { success: false, error: 'Nome do perfil é obrigatório.' }
    const modulos = normalizarModulos(dados.modulos)
    if (modulos.length === 0) return { success: false, error: 'Selecione ao menos um módulo.' }
    assertPodeConceder(s, modulos)

    let congregacaoId: string | null
    if (dados.id) {
      const [atual] = await sql`SELECT congregacao_id FROM perfis_acesso WHERE id = ${dados.id}`
      if (!atual || (atual.congregacao_id !== null && atual.congregacao_id !== s.cid)) {
        return { success: false, error: 'Perfil não encontrado.' }
      }
      if (atual.congregacao_id === null && !s.adminGeral) {
        throw new AcessoNegadoError('Perfis globais só podem ser alterados pelo administrador geral.')
      }
      congregacaoId = atual.congregacao_id
    } else {
      if (dados.global && !s.adminGeral) {
        throw new AcessoNegadoError('Apenas o administrador geral pode criar perfis globais.')
      }
      congregacaoId = dados.global ? null : s.cid
    }

    const [duplicado] = await sql`
      SELECT id FROM perfis_acesso
      WHERE lower(nome) = lower(${nome})
        AND ${congregacaoId === null ? sql`congregacao_id IS NULL` : sql`congregacao_id = ${congregacaoId}`}
        ${dados.id ? sql`AND id <> ${dados.id}` : sql``}
    `
    if (duplicado) return { success: false, error: `Já existe um perfil chamado "${nome}".` }

    const id = await sql.begin(async t => {
      const tx = t as unknown as typeof sql // tipagem do postgres.js não expõe a assinatura de chamada
      let perfilId = dados.id
      if (perfilId) {
        await tx`UPDATE perfis_acesso SET nome = ${nome}, descricao = ${dados.descricao?.trim() || null} WHERE id = ${perfilId}`
        await tx`DELETE FROM perfis_acesso_modulos WHERE perfil_acesso_id = ${perfilId}`
      } else {
        const [row] = await tx`
          INSERT INTO perfis_acesso (nome, descricao, congregacao_id)
          VALUES (${nome}, ${dados.descricao?.trim() || null}, ${congregacaoId})
          RETURNING id
        `
        perfilId = row.id as string
      }
      await tx`
        INSERT INTO perfis_acesso_modulos (perfil_acesso_id, modulo, nivel)
        SELECT ${perfilId}::uuid, * FROM unnest(
          ${sql.array(modulos.map(m => m.modulo))}::text[],
          ${sql.array(modulos.map(m => m.nivel))}::text[]
        )
      `
      return perfilId
    })

    return { success: true, id }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function excluirPerfilAcesso(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const s = await exigirSessao()
    if (!podeGerenciarUsuarios(s, 'editar') || !s.cid) throw new AcessoNegadoError()

    const [atual] = await sql`SELECT congregacao_id FROM perfis_acesso WHERE id = ${id}`
    if (!atual || (atual.congregacao_id !== null && atual.congregacao_id !== s.cid)) {
      return { success: false, error: 'Perfil não encontrado.' }
    }
    if (atual.congregacao_id === null && !s.adminGeral) {
      throw new AcessoNegadoError('Perfis globais só podem ser excluídos pelo administrador geral.')
    }

    const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM perfis WHERE perfil_acesso_id = ${id}`
    if (total > 0) {
      return { success: false, error: `Este perfil está em uso por ${total} usuário(s). Altere o perfil deles antes de excluir.` }
    }
    await sql`DELETE FROM perfis_acesso WHERE id = ${id}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

/** Turmas que podem ser liberadas na chamada para um usuário da congregação alvo. */
export async function buscarTurmasParaPermissao(congregacaoId?: string | null): Promise<{ id: string; nome: string }[]> {
  const s = await exigirSessao()
  if (!podeGerenciarUsuarios(s, 'ver')) throw new AcessoNegadoError()
  const cid = await resolverCongregacaoAlvo(s, congregacaoId)
  if (!cid) return []
  const rows = await sql`SELECT id, nome FROM turmas WHERE ativa = true AND congregacao_id = ${cid} ORDER BY nome`
  const turmas = rows.map(r => ({ id: r.id as string, nome: r.nome as string }))
  // Colaborador gestor só pode liberar as turmas que ele mesmo tem
  return s.turmas === '*' ? turmas : turmas.filter(t => (s.turmas as string[]).includes(t.id))
}

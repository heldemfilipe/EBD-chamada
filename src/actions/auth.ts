"use server"

import sql from '@/lib/db'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PerfilComPermissoes {
  id: string
  nome: string
  role: 'admin' | 'usuario'
  ativo: boolean
  modulos: { modulo: string; nivel: string }[]
  turmas: string[]
}

// ─── Buscar perfil + permissões em uma única query ───────────────────────────

export async function buscarPerfilUsuario(userId: string): Promise<PerfilComPermissoes | null> {
  const rows = await sql`
    SELECT
      p.id,
      p.nome,
      p.role,
      p.ativo,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('modulo', pm.modulo, 'nivel', pm.nivel))
        FILTER (WHERE pm.modulo IS NOT NULL),
        '[]'
      ) AS modulos,
      COALESCE(
        array_agg(DISTINCT pt.turma_id) FILTER (WHERE pt.turma_id IS NOT NULL),
        '{}'
      ) AS turmas
    FROM perfis p
    LEFT JOIN permissoes_modulos pm ON pm.perfil_id = p.id
    LEFT JOIN permissoes_turmas  pt ON pt.perfil_id = p.id
    WHERE p.id = ${userId}
    GROUP BY p.id
  `

  if (!rows[0]) return null

  const r = rows[0]
  return {
    id: r.id,
    nome: r.nome,
    role: r.role,
    ativo: r.ativo,
    modulos: (r.modulos ?? []) as { modulo: string; nivel: string }[],
    turmas: (r.turmas ?? []) as string[],
  }
}

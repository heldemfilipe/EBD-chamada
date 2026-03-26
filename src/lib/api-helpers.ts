import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

type DbClient = ReturnType<typeof createServiceClient>

/** Wrapper que elimina try-catch repetido nas API routes */
export function withDbHandler(
  fn: (db: DbClient, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const db = createServiceClient()
      return await fn(db, req)
    } catch (e: any) {
      return NextResponse.json({ error: e.message ?? 'Erro interno' }, { status: 500 })
    }
  }
}

/** Busca configuração de notificações (helper para evitar query duplicada) */
export async function getNotifConfig(db: DbClient) {
  const { data } = await (db as any)
    .from('notificacoes_config')
    .select('*')
    .single()
  return data
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { obterSessao, AcessoNegadoError, type Sessao } from '@/lib/sessao'

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

/** Notificações: exige administrador (geral ou da congregação) e devolve a congregação ativa. */
export async function exigirAdminNotificacoes(): Promise<{ s: Sessao; cid: string }> {
  const s = await obterSessao()
  if (!s) throw new AcessoNegadoError('Sessão expirada. Faça login novamente.')
  if (s.role !== 'admin') throw new AcessoNegadoError('Apenas administradores podem gerenciar notificações.')
  if (!s.cid) throw new AcessoNegadoError('Nenhuma congregação selecionada.')
  return { s, cid: s.cid }
}

/** Converte erros em resposta JSON (403 para acesso negado, 500 para o resto). */
export function respostaErro(e: any) {
  const status = e instanceof AcessoNegadoError ? 403 : 500
  return NextResponse.json({ error: e?.message ?? 'Erro interno' }, { status })
}

/** Busca configuração de notificações da congregação */
export async function getNotifConfig(db: DbClient, congregacaoId: string) {
  const { data } = await (db as any)
    .from('notificacoes_config')
    .select('*')
    .eq('congregacao_id', congregacaoId)
    .maybeSingle()
  return data
}

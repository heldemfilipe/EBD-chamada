import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { exigirAdminNotificacoes, respostaErro } from '@/lib/api-helpers'

// ─── GET: histórico de envios ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limite = parseInt(searchParams.get('limite') ?? '50')

  try {
    const { cid } = await exigirAdminNotificacoes()
    const db = createServiceClient() as any
    const { data, error } = await db
      .from('notificacoes_log')
      .select('id, data_aula, numero_telefone, mensagem, status, erro, criado_em, professor_id, turma_id, professores(nome), turmas(nome, cor)')
      .eq('congregacao_id', cid)
      .order('criado_em', { ascending: false })
      .limit(limite)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return respostaErro(e)
  }
}

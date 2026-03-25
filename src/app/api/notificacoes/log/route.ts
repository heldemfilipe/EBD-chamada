import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// ─── GET: histórico de envios ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limite = parseInt(searchParams.get('limite') ?? '50')

  try {
    const db = createServiceClient() as any
    const { data, error } = await db
      .from('notificacoes_log')
      .select('id, data_aula, numero_telefone, mensagem, status, erro, criado_em, professor_id, turma_id, professores(nome), turmas(nome, cor)')
      .order('criado_em', { ascending: false })
      .limit(limite)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

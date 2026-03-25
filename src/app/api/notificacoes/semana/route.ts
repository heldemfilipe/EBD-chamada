import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// ─── GET: busca overrides de uma semana ───────────────────────────────────────
// ?data=YYYY-MM-DD (data da aula)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dataAula = searchParams.get('data')

  if (!dataAula) {
    return NextResponse.json({ error: 'Parâmetro data obrigatório' }, { status: 400 })
  }

  try {
    const db = createServiceClient() as any
    const { data, error } = await db
      .from('notificacoes_semana')
      .select('*')
      .eq('data_aula', dataAula)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST: cria ou atualiza override ──────────────────────────────────────────
// body: { data_aula, professor_id, turma_id, silenciado?, mensagem_personalizada? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data_aula, professor_id, turma_id, silenciado, mensagem_personalizada } = body

    if (!data_aula || !professor_id || !turma_id) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const db = createServiceClient() as any
    const { data, error } = await db
      .from('notificacoes_semana')
      .upsert(
        { data_aula, professor_id, turma_id, silenciado: silenciado ?? false, mensagem_personalizada: mensagem_personalizada ?? null },
        { onConflict: 'data_aula,professor_id,turma_id' }
      )
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── DELETE: remove override ───────────────────────────────────────────────────
// ?data=YYYY-MM-DD&professorId=X&turmaId=Y
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dataAula    = searchParams.get('data')
  const professorId = searchParams.get('professorId')
  const turmaId     = searchParams.get('turmaId')

  if (!dataAula || !professorId || !turmaId) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  try {
    const db = createServiceClient() as any
    const { error } = await db
      .from('notificacoes_semana')
      .delete()
      .eq('data_aula', dataAula)
      .eq('professor_id', professorId)
      .eq('turma_id', turmaId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// ─── GET: retorna configuração atual ──────────────────────────────────────────
export async function GET() {
  try {
    const db = createServiceClient() as any
    const { data, error } = await db
      .from('notificacoes_config')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Configuração padrão caso a linha não exista ainda
    const config = data ?? {
      ativo: false,
      dia_envio: 1,
      horario_envio: '09:00',
      dia_aula: 0,
      template: TEMPLATE_PADRAO,
      zapi_instance_id: '',
      zapi_token: '',
    }

    return NextResponse.json(config)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── PUT: salva configuração ───────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const db = createServiceClient() as any

    // Verifica se já existe uma linha
    const { data: existing } = await db
      .from('notificacoes_config')
      .select('id')
      .single()

    let result
    if (existing?.id) {
      result = await db
        .from('notificacoes_config')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*')
        .single()
    } else {
      result = await db
        .from('notificacoes_config')
        .insert({ ...body })
        .select('*')
        .single()
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const TEMPLATE_PADRAO = `Paz do Senhor, *{professor}*! Tudo bem? 🙏

Lembrete: você está escalado para a *Aula {aula}* no *{dia_semana} ({data})* na sala *{sala}*.

Pode contar com você? 😊`

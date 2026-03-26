import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { TEMPLATE_PADRAO } from '@/lib/notificacoes'

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
      provedor: 'zapi',
      zapi_instance_id: '',
      zapi_token: '',
      meta_access_token: '',
      meta_phone_number_id: '',
      meta_template_name: '',
      meta_template_language: 'pt_BR',
      baileys_url: '',
      baileys_instance: '',
      baileys_token: '',
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


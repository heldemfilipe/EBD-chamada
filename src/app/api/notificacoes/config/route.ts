import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { TEMPLATE_PADRAO } from '@/lib/notificacoes'
import { getNotifConfig, exigirAdminNotificacoes, respostaErro } from '@/lib/api-helpers'

// ─── GET: retorna configuração atual da congregação ───────────────────────────
export async function GET() {
  try {
    const { cid } = await exigirAdminNotificacoes()
    const db = createServiceClient() as any
    const data = await getNotifConfig(db, cid)

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
    return respostaErro(e)
  }
}

// ─── PUT: salva configuração da congregação ───────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const { cid } = await exigirAdminNotificacoes()
    // id/congregacao_id nunca vêm do cliente
    const { id: _id, congregacao_id: _cid, ...body } = await req.json()
    const db = createServiceClient() as any

    const existing = await getNotifConfig(db, cid)

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
        .insert({ ...body, congregacao_id: cid })
        .select('*')
        .single()
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (e: any) {
    return respostaErro(e)
  }
}

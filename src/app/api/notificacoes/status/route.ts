import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// ─── GET: verifica conexão com o provedor configurado ─────────────────────────
export async function GET() {
  try {
    const db = createServiceClient() as any
    const { data: config } = await db
      .from('notificacoes_config')
      .select('provedor, zapi_instance_id, zapi_token, meta_access_token, meta_phone_number_id')
      .single()

    const provedor = config?.provedor ?? 'zapi'

    // ── Meta Cloud API ────────────────────────────────────────────────────────
    if (provedor === 'meta') {
      if (!config?.meta_access_token || !config?.meta_phone_number_id) {
        return NextResponse.json({ conectado: false, motivo: 'credenciais_ausentes', provedor })
      }

      const url = `https://graph.facebook.com/v21.0/${config.meta_phone_number_id}?fields=display_phone_number,verified_name&access_token=${config.meta_access_token}`
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
      const json = await resp.json()

      if (!resp.ok || json.error) {
        return NextResponse.json({
          conectado: false,
          motivo: json.error?.message ?? 'api_error',
          provedor,
          status: resp.status,
        })
      }

      return NextResponse.json({
        conectado: true,
        motivo: 'ok',
        provedor,
        detalhes: {
          numero: json.display_phone_number,
          nome:   json.verified_name,
        },
      })
    }

    // ── Z-API (padrão) ────────────────────────────────────────────────────────
    if (!config?.zapi_instance_id || !config?.zapi_token) {
      return NextResponse.json({ conectado: false, motivo: 'credenciais_ausentes', provedor })
    }

    const url = `https://api.z-api.io/instances/${config.zapi_instance_id}/token/${config.zapi_token}/status`
    const resp = await fetch(url, {
      headers: { 'Client-Token': config.zapi_token },
      signal: AbortSignal.timeout(8000),
    })

    if (!resp.ok) {
      return NextResponse.json({ conectado: false, motivo: 'api_error', status: resp.status, provedor })
    }

    const json = await resp.json()
    const conectado = json.connected === true && json.smartphoneConnected === true

    return NextResponse.json({
      conectado,
      motivo: conectado ? 'ok' : 'desconectado',
      provedor,
      detalhes: json,
    })
  } catch (e: any) {
    return NextResponse.json({ conectado: false, motivo: 'timeout_ou_erro', erro: e.message })
  }
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// ─── GET: verifica conexão Z-API ──────────────────────────────────────────────
export async function GET() {
  try {
    const db = createServiceClient() as any
    const { data: config } = await db
      .from('notificacoes_config')
      .select('zapi_instance_id, zapi_token')
      .single()

    if (!config?.zapi_instance_id || !config?.zapi_token) {
      return NextResponse.json({ conectado: false, motivo: 'credenciais_ausentes' })
    }

    const url = `https://api.z-api.io/instances/${config.zapi_instance_id}/token/${config.zapi_token}/status`
    const resp = await fetch(url, {
      headers: { 'Client-Token': config.zapi_token },
      signal: AbortSignal.timeout(8000),
    })

    if (!resp.ok) {
      return NextResponse.json({ conectado: false, motivo: 'api_error', status: resp.status })
    }

    const json = await resp.json()
    // Z-API retorna { connected: true/false, smartphoneConnected: true/false, ... }
    const conectado = json.connected === true && json.smartphoneConnected === true

    return NextResponse.json({
      conectado,
      motivo: conectado ? 'ok' : 'desconectado',
      detalhes: json,
    })
  } catch (e: any) {
    return NextResponse.json({ conectado: false, motivo: 'timeout_ou_erro', erro: e.message })
  }
}

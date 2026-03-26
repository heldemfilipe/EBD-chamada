import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { TEMPLATE_PADRAO, formatarTelefone, formatarMensagem } from '@/lib/notificacoes'
import { getLicaoTema } from '@/lib/constants'

// ─── POST /api/notificacoes/disparar ─────────────────────────────────────────
// Pode ser chamado pelo Vercel Cron ou manualmente
// Body opcional: { data?: 'YYYY-MM-DD', skip_auth?: true }

export async function POST(req: NextRequest) {
  // Ler body uma única vez
  const reqBody = await req.json().catch(() => ({}))

  // Verificar secret do cron (pula se chamado com flag skip_auth)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && !reqBody.skip_auth) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  }

  try {
    const db = createServiceClient() as any

    // 1. Carregar configuração
    const { data: config } = await db
      .from('notificacoes_config')
      .select('*')
      .single()

    const provedor = config?.provedor ?? 'zapi'

    if (provedor === 'meta') {
      if (!config?.meta_access_token || !config?.meta_phone_number_id) {
        return NextResponse.json({ error: 'Meta Cloud API não configurada', enviados: 0, erros: 0 })
      }
    } else if (provedor === 'baileys') {
      if (!config?.baileys_url || !config?.baileys_instance) {
        return NextResponse.json({ error: 'Baileys não configurado', enviados: 0, erros: 0 })
      }
    } else {
      if (!config?.zapi_instance_id || !config?.zapi_token) {
        return NextResponse.json({ error: 'Z-API não configurada', enviados: 0, erros: 0 })
      }
    }

    // 2. Determinar data da aula
    const dataAula: string = reqBody.data ?? proximaDataDiaAula(config.dia_aula ?? 0)

    // 3. Buscar escalas do dia
    const { data: escalas = [] } = await db
      .from('escalas')
      .select('turma_id, professor_id, turmas(nome), professores(nome, telefone)')
      .eq('data', dataAula)

    if (!escalas || escalas.length === 0) {
      return NextResponse.json({ mensagem: 'Nenhuma escala para esta data', dataAula, enviados: 0, erros: 0 })
    }

    // 4. Carregar overrides da semana
    const { data: overrides = [] } = await db
      .from('notificacoes_semana')
      .select('*')
      .eq('data_aula', dataAula)

    // 5. Calcular nº da aula e período
    const dAula    = new Date(dataAula + 'T12:00:00')
    const aulaNum  = calcularNumeroAula(dataAula)
    const diaAula  = dAula.getDay()
    const anoAula  = dAula.getFullYear()
    const trimAula = Math.floor(dAula.getMonth() / 3) + 1
    const template = config.template ?? TEMPLATE_PADRAO

    const logs: any[]  = []
    let enviados    = 0
    let erros       = 0
    let silenciados = 0

    // 6. Enviar para cada professor
    for (const e of escalas) {
      const override = (overrides as any[]).find(
        o => o.professor_id === e.professor_id && o.turma_id === e.turma_id
      )

      if (override?.silenciado) {
        silenciados++
        logs.push({ professor_id: e.professor_id, turma_id: e.turma_id, data_aula: dataAula,
          numero_telefone: null, mensagem: null, status: 'silenciado', erro: null })
        continue
      }

      const prof  = e.professores
      const turma = e.turmas
      const tema  = getLicaoTema(turma?.nome ?? '', String(anoAula), trimAula, aulaNum) ?? undefined
      const tel   = prof?.telefone ? formatarTelefone(prof.telefone) : null

      if (!tel) {
        erros++
        logs.push({ professor_id: e.professor_id, turma_id: e.turma_id, data_aula: dataAula,
          numero_telefone: null, mensagem: null, status: 'sem_telefone',
          erro: 'Professor sem telefone cadastrado' })
        continue
      }

      const mensagem = formatarMensagem(
        override?.mensagem_personalizada ?? template,
        { professor: prof?.nome ?? 'Professor', aula: aulaNum, sala: turma?.nome ?? '', data: dataAula, diaAula, tema }
      )

      try {
        let enviado = false
        let erroMsg = ''

        if (provedor === 'meta') {
          const resultado = await enviarMeta(config, tel, mensagem, prof?.nome ?? '', aulaNum, dataAula, turma?.nome ?? '', tema)
          enviado = resultado.ok
          erroMsg = resultado.erro
        } else if (provedor === 'baileys') {
          const resultado = await enviarBaileys(config, tel, mensagem)
          enviado = resultado.ok
          erroMsg = resultado.erro
        } else {
          const resultado = await enviarZapi(config, tel, mensagem)
          enviado = resultado.ok
          erroMsg = resultado.erro
        }

        if (enviado) {
          enviados++
          logs.push({ professor_id: e.professor_id, turma_id: e.turma_id, data_aula: dataAula,
            numero_telefone: tel, mensagem, status: 'enviado', erro: null })
        } else {
          erros++
          logs.push({ professor_id: e.professor_id, turma_id: e.turma_id, data_aula: dataAula,
            numero_telefone: tel, mensagem, status: 'erro', erro: erroMsg })
        }
      } catch (sendErr: any) {
        erros++
        logs.push({ professor_id: e.professor_id, turma_id: e.turma_id, data_aula: dataAula,
          numero_telefone: tel, mensagem, status: 'erro', erro: sendErr.message })
      }

      await new Promise(r => setTimeout(r, 500))
    }

    // 7. Gravar logs
    if (logs.length > 0) {
      await db.from('notificacoes_log').insert(logs)
    }

    return NextResponse.json({ dataAula, aulaNum, enviados, erros, silenciados, provedor })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── Envio via Meta Cloud API ─────────────────────────────────────────────────
async function enviarMeta(
  config: any, tel: string, mensagemTexto: string,
  professor: string, aula: number, data: string, sala: string, tema?: string
): Promise<{ ok: boolean; erro: string }> {
  const url = `https://graph.facebook.com/v21.0/${config.meta_phone_number_id}/messages`

  let body: any

  if (config.meta_template_name) {
    // Template aprovado: passa variáveis como parâmetros {{1}}–{{5}}
    const dataFmt = new Date(data + 'T12:00:00')
      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    body = {
      messaging_product: 'whatsapp',
      to: tel,
      type: 'template',
      template: {
        name: config.meta_template_name,
        language: { code: config.meta_template_language ?? 'pt_BR' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: professor },
            { type: 'text', text: String(aula) },
            { type: 'text', text: dataFmt },
            { type: 'text', text: sala },
            { type: 'text', text: tema ?? '—' },
          ],
        }],
      },
    }
  } else {
    // Mensagem livre (apenas funciona dentro da janela de 24h)
    body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: tel,
      type: 'text',
      text: { preview_url: false, body: mensagemTexto },
    }
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.meta_access_token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })

  const json = await resp.json()

  if (resp.ok && !json.error) {
    return { ok: true, erro: '' }
  }

  return {
    ok: false,
    erro: json.error?.message ?? `HTTP ${resp.status}`,
  }
}

// ─── Envio via Baileys (Evolution API) ───────────────────────────────────────
async function enviarBaileys(config: any, tel: string, mensagem: string): Promise<{ ok: boolean; erro: string }> {
  const url = `${config.baileys_url}/message/sendText/${config.baileys_instance}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.baileys_token) headers['apikey'] = config.baileys_token

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: tel, text: mensagem }),
    signal: AbortSignal.timeout(10000),
  })

  if (resp.ok) return { ok: true, erro: '' }

  const errBody = await resp.text()
  return { ok: false, erro: `HTTP ${resp.status}: ${errBody}` }
}

// ─── Envio via Z-API ──────────────────────────────────────────────────────────
async function enviarZapi(config: any, tel: string, mensagem: string): Promise<{ ok: boolean; erro: string }> {
  const zapiUrl = `https://api.z-api.io/instances/${config.zapi_instance_id}/token/${config.zapi_token}/send-text`
  const resp = await fetch(zapiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': config.zapi_token },
    body: JSON.stringify({ phone: tel, message: mensagem }),
    signal: AbortSignal.timeout(10000),
  })

  if (resp.ok) return { ok: true, erro: '' }

  const errBody = await resp.text()
  return { ok: false, erro: `HTTP ${resp.status}: ${errBody}` }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function proximaDataDiaAula(diaAula: number): string {
  const hoje = new Date()
  const diff = (diaAula - hoje.getDay() + 7) % 7 || 7
  const proxima = new Date(hoje)
  proxima.setDate(hoje.getDate() + diff)
  return proxima.toISOString().split('T')[0]
}

function calcularNumeroAula(dataIso: string): number {
  const d = new Date(dataIso + 'T12:00:00')
  const mesInicio = (Math.floor(d.getMonth() / 3)) * 3
  const inicio = new Date(d.getFullYear(), mesInicio, 1)
  while (inicio.getDay() !== 0) inicio.setDate(inicio.getDate() + 1)
  let aula = 1
  const cursor = new Date(inicio)
  while (cursor <= d) {
    if (cursor.toISOString().split('T')[0] === dataIso) return aula
    cursor.setDate(cursor.getDate() + 7)
    aula++
  }
  return aula
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { TEMPLATE_PADRAO, formatarTelefone, formatarMensagem } from '@/lib/notificacoes'
import { getLicaoTema } from '@/lib/constants'
import { obterSessao } from '@/lib/sessao'

// ─── POST /api/notificacoes/disparar ─────────────────────────────────────────
// Manual (admin logado): dispara apenas para a congregação ativa do usuário.
// Vercel Cron (Authorization: Bearer CRON_SECRET): dispara para todas as
// congregações com notificações ativas.
// Body opcional: { data?: 'YYYY-MM-DD' }

export async function POST(req: NextRequest) {
  // Ler body uma única vez
  const reqBody = await req.json().catch(() => ({}))

  try {
    const db = createServiceClient() as any
    const sessao = await obterSessao()

    // ─ Disparo manual por um administrador
    if (sessao) {
      if (sessao.role !== 'admin' || !sessao.cid) {
        return NextResponse.json({ error: 'Apenas administradores podem disparar notificações.' }, { status: 403 })
      }
      const { data: config } = await db
        .from('notificacoes_config')
        .select('*')
        .eq('congregacao_id', sessao.cid)
        .maybeSingle()
      if (!config) {
        return NextResponse.json({ error: 'Notificações não configuradas para esta congregação', enviados: 0, erros: 0 })
      }
      const resultado = await dispararCongregacao(db, config, reqBody.data)
      return NextResponse.json(resultado)
    }

    // ─ Cron: exige o secret quando configurado
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const auth = req.headers.get('authorization') ?? ''
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
    }

    const { data: configs = [] } = await db
      .from('notificacoes_config')
      .select('*')
      .eq('ativo', true)
      .not('congregacao_id', 'is', null)

    const resultados = []
    for (const config of configs ?? []) {
      resultados.push({ congregacao_id: config.congregacao_id, ...(await dispararCongregacao(db, config, reqBody.data)) })
    }

    return NextResponse.json({
      congregacoes: resultados.length,
      enviados: resultados.reduce((s, r: any) => s + (r.enviados ?? 0), 0),
      erros: resultados.reduce((s, r: any) => s + (r.erros ?? 0), 0),
      resultados,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── Disparo de uma congregação ───────────────────────────────────────────────
async function dispararCongregacao(db: any, config: any, dataParam?: string) {
  const cid = config.congregacao_id
  const provedor = config?.provedor ?? 'zapi'

  if (provedor === 'meta') {
    if (!config?.meta_access_token || !config?.meta_phone_number_id) {
      return { error: 'Meta Cloud API não configurada', enviados: 0, erros: 0 }
    }
  } else if (provedor === 'baileys') {
    if (!config?.baileys_url || !config?.baileys_instance) {
      return { error: 'Baileys não configurado', enviados: 0, erros: 0 }
    }
  } else {
    if (!config?.zapi_instance_id || !config?.zapi_token) {
      return { error: 'Z-API não configurada', enviados: 0, erros: 0 }
    }
  }

  // 1. Determinar data da aula
  const dataAula: string = dataParam ?? proximaDataDiaAula(config.dia_aula ?? 0)

  // 2. Buscar escalas do dia (somente da congregação)
  const { data: escalas = [] } = await db
    .from('escalas')
    .select('turma_id, professor_id, turmas(nome), professores(nome, telefone)')
    .eq('data', dataAula)
    .eq('congregacao_id', cid)

  if (!escalas || escalas.length === 0) {
    return { mensagem: 'Nenhuma escala para esta data', dataAula, enviados: 0, erros: 0 }
  }

  // 3. Carregar overrides da semana
  const { data: overrides = [] } = await db
    .from('notificacoes_semana')
    .select('*')
    .eq('data_aula', dataAula)
    .eq('congregacao_id', cid)

  // 4. Calcular nº da aula e período
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

  // 5. Enviar para cada professor
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
      let resultado: { ok: boolean; erro: string }
      if (provedor === 'meta') {
        resultado = await enviarMeta(config, tel, mensagem, prof?.nome ?? '', aulaNum, dataAula, turma?.nome ?? '', tema)
      } else if (provedor === 'baileys') {
        resultado = await enviarBaileys(config, tel, mensagem)
      } else {
        resultado = await enviarZapi(config, tel, mensagem)
      }

      if (resultado.ok) {
        enviados++
        logs.push({ professor_id: e.professor_id, turma_id: e.turma_id, data_aula: dataAula,
          numero_telefone: tel, mensagem, status: 'enviado', erro: null })
      } else {
        erros++
        logs.push({ professor_id: e.professor_id, turma_id: e.turma_id, data_aula: dataAula,
          numero_telefone: tel, mensagem, status: 'erro', erro: resultado.erro })
      }
    } catch (sendErr: any) {
      erros++
      logs.push({ professor_id: e.professor_id, turma_id: e.turma_id, data_aula: dataAula,
        numero_telefone: tel, mensagem, status: 'erro', erro: sendErr.message })
    }

    await new Promise(r => setTimeout(r, 500))
  }

  // 6. Gravar logs (congregacao_id é preenchido pelo trigger a partir da turma)
  if (logs.length > 0) {
    await db.from('notificacoes_log').insert(logs)
  }

  return { dataAula, aulaNum, enviados, erros, silenciados, provedor }
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

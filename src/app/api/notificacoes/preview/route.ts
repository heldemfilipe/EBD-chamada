import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { TEMPLATE_PADRAO, formatarTelefone, formatarMensagem } from '@/lib/notificacoes'

/** Calcula o número de aula de uma data dentro do trimestre */
function calcularNumeroAula(dataIso: string): number {
  const d = new Date(dataIso + 'T12:00:00')
  const ano = d.getFullYear()
  const trim = Math.floor(d.getMonth() / 3) + 1
  const [mesInicio] = [[0], [3], [6], [9]][trim - 1]
  const inicio = new Date(ano, mesInicio, 1)
  while (inicio.getDay() !== 0) inicio.setDate(inicio.getDate() + 1) // primeiro domingo
  let aula = 1
  const cursor = new Date(inicio)
  while (cursor <= d) {
    if (cursor.toISOString().split('T')[0] === dataIso) return aula
    cursor.setDate(cursor.getDate() + 7)
    aula++
  }
  return aula
}

// ─── GET /api/notificacoes/preview?data=YYYY-MM-DD ────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dataAula = searchParams.get('data') // data da aula (domingo)

  if (!dataAula) {
    return NextResponse.json({ error: 'Parâmetro data obrigatório' }, { status: 400 })
  }

  try {
    const db = createServiceClient() as any

    const [escalasRes, configRes, overridesRes] = await Promise.all([
      db.from('escalas')
        .select('id, turma_id, professor_id, turmas(nome, cor), professores(nome, telefone)')
        .eq('data', dataAula),
      db.from('notificacoes_config').select('template').single(),
      db.from('notificacoes_semana').select('*').eq('data_aula', dataAula),
    ])

    const escalas   = escalasRes.data  ?? []
    const template  = configRes.data?.template ?? TEMPLATE_PADRAO
    const overrides = overridesRes.data ?? []
    const diaAula   = new Date(dataAula + 'T12:00:00').getDay()
    const aulaNum   = calcularNumeroAula(dataAula)

    const notificacoes = escalas.map((e: any) => {
      const override = overrides.find(
        (o: any) => o.professor_id === e.professor_id && o.turma_id === e.turma_id
      )
      const prof    = e.professores
      const turma   = e.turmas
      const tel     = prof?.telefone ? formatarTelefone(prof.telefone) : null
      const mensagem = formatarMensagem(
        override?.mensagem_personalizada ?? template,
        { professor: prof?.nome ?? 'Professor', aula: aulaNum, sala: turma?.nome ?? '', data: dataAula, diaAula }
      )

      return {
        professorId:   e.professor_id,
        turmaId:       e.turma_id,
        professorNome: prof?.nome ?? '—',
        turmaNome:     turma?.nome ?? '—',
        turmaCor:      turma?.cor ?? 'bg-gray-400',
        telefone:      tel,
        telefoneMascarado: tel ? tel.slice(0, 4) + '****' + tel.slice(-4) : null,
        silenciado:    override?.silenciado ?? false,
        mensagemPersonalizada: override?.mensagem_personalizada ?? null,
        mensagem,
        aulaNum,
        dataAula,
      }
    })

    return NextResponse.json({ notificacoes, aulaNum, diaAula, dataAula })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── Lembrete de escala pelo WhatsApp ─────────────────────────────────────────
// Envio manual: gera um link wa.me com a mensagem pronta; quem organiza a escala
// revisa e envia pelo próprio WhatsApp. Compartilhado entre cliente e servidor.

import { formatarTelefone } from '@/lib/notificacoes'

export interface MensagensWhatsApp {
  lembrete: string
  reenvio: string
}

export const MENSAGENS_PADRAO: MensagensWhatsApp = {
  lembrete: `Paz do Senhor, {primeiro_nome}! Tudo bem?

Passando para lembrar que você está na escala da EBD no próximo {dia_semana}, {data}, na turma *{turma}*.
Lição {aula}: {licao}

Posso contar com você?`,
  reenvio: `Paz do Senhor, {primeiro_nome}!

Tudo certo para a aula de {dia_semana} ({data}) com a turma *{turma}*?`,
}

export const VARIAVEIS_MENSAGEM: { chave: string; descricao: string }[] = [
  { chave: '{primeiro_nome}', descricao: 'Primeiro nome do professor' },
  { chave: '{professor}',     descricao: 'Nome completo do professor' },
  { chave: '{turma}',         descricao: 'Nome da turma' },
  { chave: '{dia_semana}',    descricao: 'Dia da semana (ex.: domingo)' },
  { chave: '{data}',          descricao: 'Data da aula (dd/mm)' },
  { chave: '{aula}',          descricao: 'Número da aula no trimestre' },
  { chave: '{licao}',         descricao: 'Tema da lição' },
]

/** Dias sem resposta a partir dos quais o card sugere reenviar. */
export const DIAS_PARA_REENVIO = 2

export interface VariaveisMensagem {
  professor: string
  turma: string
  data: string        // YYYY-MM-DD
  aula: number | null
  licao: string | null
}

const DIAS_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export function montarMensagem(template: string, v: VariaveisMensagem): string {
  const d = new Date(v.data + 'T12:00:00')
  const [, mes, dia] = v.data.split('-')
  return template
    .replace(/\{primeiro_nome\}/gi, v.professor.trim().split(/\s+/)[0] ?? '')
    .replace(/\{professor\}/gi,     v.professor)
    .replace(/\{turma\}/gi,         v.turma)
    .replace(/\{dia_semana\}/gi,    DIAS_PT[d.getDay()] ?? 'domingo')
    .replace(/\{data\}/gi,          `${dia}/${mes}`)
    .replace(/\{aula\}/gi,          v.aula ? String(v.aula) : '')
    .replace(/\{licao\}/gi,         v.licao ?? '—')
}

/** Telefone só com dígitos e DDI 55; null se não parecer um celular/telefone válido. */
export function telefoneWhatsApp(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  return formatarTelefone(digitos)
}

export function linkWhatsApp(telefone: string, mensagem: string): string {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`
}

/** Segunda-feira da semana (seg→dom) que termina na data da aula. */
export function segundaDaSemana(dataAula: string): Date {
  const d = new Date(dataAula + 'T00:00:00')
  const diasDesdeSegunda = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diasDesdeSegunda)
  return d
}

export type StatusLembrete =
  | { tipo: 'pendente'; recomendado: boolean }   // ainda não enviado
  | { tipo: 'aguardando'; dias: number }         // enviado, dentro do prazo
  | { tipo: 'sem_resposta'; dias: number }       // enviado há DIAS_PARA_REENVIO+ dias
  | { tipo: 'confirmado' }
  | { tipo: 'encerrado' }                        // aula já passou sem confirmação

export function calcularStatusLembrete(
  e: { data: string; confirmado: boolean; lembreteEnviadoEm: string | null; lembreteReenviadoEm: string | null },
  agora: Date = new Date(),
): StatusLembrete {
  if (e.confirmado) return { tipo: 'confirmado' }
  const fimDaAula = new Date(e.data + 'T23:59:59')
  if (agora > fimDaAula) return { tipo: 'encerrado' }

  const ultimoEnvio = e.lembreteReenviadoEm ?? e.lembreteEnviadoEm
  if (!ultimoEnvio) return { tipo: 'pendente', recomendado: agora >= segundaDaSemana(e.data) }

  const dias = Math.floor((agora.getTime() - new Date(ultimoEnvio).getTime()) / 86_400_000)
  return dias >= DIAS_PARA_REENVIO ? { tipo: 'sem_resposta', dias } : { tipo: 'aguardando', dias }
}

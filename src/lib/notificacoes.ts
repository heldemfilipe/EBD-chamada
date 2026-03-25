// ─── Constantes e helpers compartilhados de notificações WhatsApp ─────────────

export const TEMPLATE_PADRAO = `Paz do Senhor, *{professor}*! Tudo bem? 🙏

Lembrete: você está escalado para a *Aula {aula}* no *{dia_semana} ({data})* na sala *{sala}*.

Pode contar com você? 😊`

/** Formata número para Z-API: 5511999999999 */
export function formatarTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return '55' + digits
}

const DIAS_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

function fmtData(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/** Substitui variáveis no template */
export function formatarMensagem(
  template: string,
  vars: { professor: string; aula: number; sala: string; data: string; diaAula: number }
): string {
  return template
    .replace(/\{professor\}/gi, vars.professor)
    .replace(/\{aula\}/gi,      String(vars.aula))
    .replace(/\{sala\}/gi,      vars.sala)
    .replace(/\{data\}/gi,      fmtData(vars.data))
    .replace(/\{dia_semana\}/gi, DIAS_PT[vars.diaAula] ?? 'domingo')
}

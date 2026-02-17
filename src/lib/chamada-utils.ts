import { format, addWeeks, startOfWeek, isSunday, parseISO, addDays, subDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Retorna o domingo atual da semana
 */
export function getDomingoAtual(): Date {
  const hoje = new Date()
  const diaSemana = hoje.getDay()

  if (diaSemana === 0) {
    // Já é domingo
    return startOfDay(hoje)
  }

  // Voltar para o domingo desta semana
  return startOfDay(subDays(hoje, diaSemana))
}

/**
 * Retorna o próximo domingo
 */
export function getProximoDomingo(): Date {
  const hoje = new Date()
  const diaSemana = hoje.getDay()

  if (diaSemana === 0) {
    // Se hoje é domingo, retorna o próximo domingo
    return startOfDay(addDays(hoje, 7))
  }

  // Calcular dias até o próximo domingo
  const diasAteProximoDomingo = 7 - diaSemana
  return startOfDay(addDays(hoje, diasAteProximoDomingo))
}

/**
 * Retorna todos os domingos entre duas datas
 */
export function getAllDomingos(inicio: Date, fim: Date): Date[] {
  const domingos: Date[] = []
  let data = new Date(inicio)

  // Ajustar para o primeiro domingo
  if (!isSunday(data)) {
    const diaSemana = data.getDay()
    if (diaSemana === 0) {
      data = startOfDay(data)
    } else {
      const diasAteProximoDomingo = 7 - diaSemana
      data = startOfDay(addDays(data, diasAteProximoDomingo))
    }
  }

  // Adicionar todos os domingos até a data final
  while (data <= fim) {
    domingos.push(new Date(data))
    data = addDays(data, 7)
  }

  return domingos
}

/**
 * Verifica se é um domingo no passado
 */
export function isPastDomingo(date: Date): boolean {
  const hoje = startOfDay(new Date())
  const dataVerificacao = startOfDay(date)
  return isSunday(dataVerificacao) && dataVerificacao < hoje
}

/**
 * Retorna os próximos N domingos a partir da data atual (incluindo hoje se for domingo)
 */
export function getProximosDomingos(quantidade: number): Date[] {
  const domingos: Date[] = []
  const hoje = new Date()
  let data = new Date()

  // Se hoje for domingo, incluir hoje como primeiro domingo
  if (isSunday(hoje)) {
    domingos.push(startOfDay(new Date(hoje)))
    data = addDays(hoje, 7)
    quantidade-- // Já temos um domingo
  } else {
    // Encontrar o próximo domingo
    const diaSemana = data.getDay()
    const diasAteProximoDomingo = 7 - diaSemana
    data = startOfDay(addDays(data, diasAteProximoDomingo))
  }

  // Adicionar os próximos domingos
  for (let i = 0; i < quantidade; i++) {
    domingos.push(new Date(data))
    data = addDays(data, 7)
  }

  return domingos
}

/**
 * Retorna os últimos N domingos incluindo o domingo atual ou mais recente
 */
export function getUltimosDomingos(quantidade: number): Date[] {
  const domingos: Date[] = []
  let data = new Date()

  // Se hoje não for domingo, encontrar o domingo anterior
  if (!isSunday(data)) {
    const diaSemana = data.getDay()
    data.setDate(data.getDate() - diaSemana)
  }

  // Adicionar os domingos anteriores
  for (let i = 0; i < quantidade; i++) {
    domingos.push(new Date(data))
    data.setDate(data.getDate() - 7)
  }

  return domingos.reverse()
}

/**
 * Formata uma data para exibição como "Domingo, 15 de Fevereiro de 2026"
 */
export function formatarDomingo(data: Date | string): string {
  const dataObj = typeof data === 'string' ? parseISO(data) : data
  return format(dataObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/**
 * Formata uma data para exibição curta como "15/02/2026"
 */
export function formatarDataCurta(data: Date | string): string {
  const dataObj = typeof data === 'string' ? parseISO(data) : data
  return format(dataObj, 'dd/MM/yyyy')
}

/**
 * Converte uma data para o formato ISO (YYYY-MM-DD) para input de data
 */
export function converterParaISO(data: Date): string {
  return format(data, 'yyyy-MM-dd')
}

/**
 * Verifica se uma data é domingo
 */
export function isDomingo(data: Date | string): boolean {
  const dataObj = typeof data === 'string' ? parseISO(data) : data
  return isSunday(dataObj)
}

/**
 * Calcula o número de presenças consecutivas de um visitante
 * a partir dos últimos 3 domingos
 */
export function calcularPresencasSeguidas(historico: { data: string; presente: boolean | null }[]): number {
  const ultimosDomingos = getUltimosDomingos(3).map(d => converterParaISO(d))
  let presencasSeguidas = 0

  // Verificar os últimos 3 domingos em ordem reversa (do mais recente para o mais antigo)
  for (let i = ultimosDomingos.length - 1; i >= 0; i--) {
    const domingo = ultimosDomingos[i]
    const registro = historico.find(h => h.data === domingo)

    if (registro && registro.presente === true) {
      presencasSeguidas++
    } else {
      // Se não estiver presente ou não tiver registro, interrompe a contagem
      break
    }
  }

  return presencasSeguidas
}

/**
 * Retorna o ícone/emoji apropriado para o status de presença
 */
export function getIconePresenca(presente: boolean | null): string {
  if (presente === true) return '✓'
  if (presente === false) return '✗'
  return '○'
}

/**
 * Retorna a classe CSS apropriada para o status de presença
 */
export function getClassePresenca(presente: boolean | null): string {
  if (presente === true) return 'text-green-500'
  if (presente === false) return 'text-red-500'
  return 'text-gray-400'
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Salva cargo eclesiástico em qualquer tabela (alunos, turmas). Ignora erros silenciosamente. */
export async function salvarCargo(db: any, tabela: string, id: string, cargo: string) {
  await db.from(tabela).update({ cargo: cargo || null }).eq('id', id)
}

/** Calcula idade em anos a partir de data de nascimento ISO (YYYY-MM-DD). Retorna null se inválido. */
export function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  if (isNaN(nasc.getTime())) return null
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

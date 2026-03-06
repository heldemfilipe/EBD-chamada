import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Salva cargo eclesiástico em qualquer tabela (alunos, turmas). Ignora erros silenciosamente. */
export async function salvarCargo(db: any, tabela: string, id: string, cargo: string) {
  await db.from(tabela).update({ cargo: cargo || null }).eq('id', id)
}

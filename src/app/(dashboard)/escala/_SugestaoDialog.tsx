"use client"

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Sparkles, Link2, Save } from 'lucide-react'

interface Professor { id: string; nome: string }
interface Turma { id: string; nome: string; cor: string; sala?: string | null }

const TRIMESTRES_SHORT = ['1º Trim', '2º Trim', '3º Trim', '4º Trim']

function getDomingosTrimestre(trimestre: number, ano: number) {
  const [mesInicio, mesFim] = [[0, 2], [3, 5], [6, 8], [9, 11]][trimestre - 1]
  const fim = new Date(ano, mesFim + 1, 0)
  const cursor = new Date(ano, mesInicio, 1)
  while (cursor.getDay() !== 0) cursor.setDate(cursor.getDate() + 1)
  const domingos: { aula: number; data: string; label: string }[] = []
  let aula = 1
  while (cursor <= fim) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    domingos.push({
      aula,
      data: iso,
      label: `Aula ${aula} — ${cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
    })
    cursor.setDate(cursor.getDate() + 7)
    aula++
  }
  return domingos
}

function is2ndSunday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDate() >= 8 && d.getDate() <= 14
}

function fmtDataCurta(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function ordemTurma(sala: string | null | undefined, nome?: string): number {
  if (sala) {
    const m = sala.match(/\d+/)
    if (m) return parseInt(m[0])
  }
  if (nome) {
    const n = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (n.includes('cordeirinho'))              return 1
    if (n.includes('guerreiro'))               return 2
    if (n.includes('valente'))                 return 3
    if (n.includes('dynamo'))                  return 4
    if (n.includes('shekinah'))                return 5
    if (n.includes('filha'))                   return 6
    if (n.includes('hero') || n.includes('heroi')) return 7
  }
  return 99
}

interface SugestaoDialogProps {
  open: boolean
  onClose: () => void
  sugestaoEntradas: Array<{ data: string; turmaId: string; professorId: string }>
  onUpdateCell: (data: string, turmaId: string, professorId: string) => void
  isSalvando: boolean
  onSalvar: () => void
  professores: Professor[]
  turmas: Turma[]
  filtroTrim: string
  filtroAno: string
  proximaData: string | null
  salasUnidasConfig: Record<string, string>
  profTurmasMap: Record<string, string[]>
}

export function SugestaoDialog({
  open, onClose, sugestaoEntradas, onUpdateCell, isSalvando, onSalvar,
  professores, turmas, filtroTrim, filtroAno, proximaData, salasUnidasConfig, profTurmasMap,
}: SugestaoDialogProps) {
  const domingos = getDomingosTrimestre(parseInt(filtroTrim), parseInt(filtroAno))
  const turmasGen = [...turmas].sort((a, b) => ordemTurma(a.sala, a.nome) - ordemTurma(b.sala, b.nome))

  const getProfNome = (id: string) => professores.find(p => p.id === id)?.nome ?? '—'
  const unidaChave = (turmaId: string, data: string) => `${turmaId}::${data}`
  const unidaComIdEmData = (turmaId: string, data: string) => salasUnidasConfig[unidaChave(turmaId, data)] ?? ''
  const unidaComNomeEmData = (turmaId: string, data: string) => {
    const uid = unidaComIdEmData(turmaId, data)
    return uid ? (turmas.find(t => t.id === uid)?.nome ?? '') : ''
  }

  const totalComProfessor = sugestaoEntradas.filter(e => e.professorId !== '').length

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Sugestão de Escala — {TRIMESTRES_SHORT[parseInt(filtroTrim) - 1]} {filtroAno}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {totalComProfessor} atribuições geradas · clique em qualquer célula para ajustar o professor.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Legenda das restrições */}
        <div className="px-5 py-2 bg-muted/30 border-b flex-shrink-0 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />Viviana / Livys: paridade configurável</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Eder / Heldem / Leandro: sem 2º domingo nem 1ª aula</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Leandro: 1 aula no Dynamo</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Sem domingos consecutivos</span>
        </div>

        {/* Tabela da sugestão */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card border-b">
              <tr>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-10 border-r">L#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-14 border-r">Data</th>
                {turmasGen.map(t => (
                  <th key={t.id} className="px-3 py-0 text-left font-semibold min-w-[140px]">
                    <div className={`h-1 -mx-3 mb-1.5 ${t.cor}`} />
                    <div className="flex items-center gap-1 pb-1.5 flex-wrap">
                      <span className="text-[11px] font-bold">{t.nome}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domingos.map(dom => {
                const is2nd = is2ndSunday(dom.data)
                const isProx = dom.data === proximaData
                return (
                  <tr
                    key={dom.data}
                    className={`border-b last:border-0 ${
                      isProx ? 'bg-primary/5' : is2nd ? 'bg-amber-50/40 dark:bg-amber-950/10' : 'hover:bg-muted/20'
                    }`}
                  >
                    <td className="px-3 py-2 text-center border-r">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isProx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>{dom.aula}</span>
                      {is2nd && <div className="text-[9px] text-amber-500 font-bold text-center leading-none mt-0.5">★</div>}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium border-r whitespace-nowrap">
                      {fmtDataCurta(dom.data)}
                    </td>
                    {turmasGen.map(t => {
                      const unidaNomeSug = unidaComNomeEmData(t.id, dom.data)
                      if (unidaNomeSug) {
                        return (
                          <td key={t.id} className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 italic">
                              <Link2 className="h-3 w-3 flex-shrink-0" />{unidaNomeSug}
                            </span>
                          </td>
                        )
                      }
                      const entrada = sugestaoEntradas.find(e => e.data === dom.data && e.turmaId === t.id)
                      const pool = profTurmasMap[t.id] ?? []
                      return (
                        <td key={t.id} className="px-2 py-1.5">
                          <select
                            value={entrada?.professorId ?? ''}
                            onChange={e => onUpdateCell(dom.data, t.id, e.target.value)}
                            className="text-xs w-full min-w-[110px] rounded border border-input bg-background px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">— sem professor</option>
                            {pool.map(pid => (
                              <option key={pid} value={pid}>{getProfNome(pid)}</option>
                            ))}
                          </select>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t flex-shrink-0 flex justify-between items-center gap-3 bg-card">
          <p className="text-xs text-muted-foreground">
            ★ 2º domingo do mês · use os selects para ajustar professores antes de salvar
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={onSalvar} disabled={isSalvando || totalComProfessor === 0}>
              <Save className="h-4 w-4 mr-2" />
              {isSalvando ? 'Salvando...' : `Salvar ${totalComProfessor} escalas`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

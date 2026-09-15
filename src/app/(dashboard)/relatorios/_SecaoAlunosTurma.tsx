"use client"

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LayoutGrid, Table2 } from 'lucide-react'
import { badgePresenca, corPresenca, labelPresenca } from '@/lib/presence'
import { cn } from '@/lib/utils'

export interface AlunoTurmaStats {
  id: string; nome: string; cargo: string
  presentes: number; faltas: number; total: number; pct: number | null
  biblias: number; revistas: number
  /** chamadaId → presente (true) / falta (false); ausente = sem registro */
  celulas: Record<string, boolean>
}

type Ordenacao = 'pct' | 'nome' | 'faltas'

export function SecaoAlunosTurma({
  turmaNome, labelPeriodo, alunos, chamadas,
}: {
  turmaNome: string
  labelPeriodo: string
  alunos: AlunoTurmaStats[]
  chamadas: { id: string; data: string }[]
}) {
  const [visao, setVisao] = useState<'tabela' | 'mapa'>('tabela')
  const [ordem, setOrdem] = useState<Ordenacao>('pct')

  const ordenados = useMemo(() => {
    const lista = [...alunos]
    if (ordem === 'nome') return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    if (ordem === 'faltas') return lista.sort((a, b) => b.faltas - a.faltas || a.nome.localeCompare(b.nome, 'pt-BR'))
    return lista.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.presentes - a.presentes || a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [alunos, ordem])

  const totalPresentes = alunos.reduce((s, a) => s + a.presentes, 0)
  const totalRegistros = alunos.reduce((s, a) => s + a.total, 0)
  const media = totalRegistros ? Math.round((totalPresentes / totalRegistros) * 100) : null

  return (
    <div id="section-alunosTurma">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Alunos — {turmaNome}</CardTitle>
              <CardDescription>{labelPeriodo} · presença = presenças ÷ aulas registradas do aluno</CardDescription>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/40 self-start" data-no-print>
              <button onClick={() => setVisao('tabela')} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium', visao === 'tabela' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                <Table2 className="h-3.5 w-3.5" />Tabela
              </button>
              <button onClick={() => setVisao('mapa')} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium', visao === 'mapa' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                <LayoutGrid className="h-3.5 w-3.5" />Mapa de presença
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold">{alunos.length}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Matriculados</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold" style={media !== null ? { color: corPresenca(media) } : undefined}>{media !== null ? `${media}%` : '—'}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Presença da turma</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold text-green-600">{totalPresentes}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Presenças</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold text-red-600">{totalRegistros - totalPresentes}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Faltas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap" data-no-print>
            <span className="text-xs text-muted-foreground">Ordenar:</span>
            {([['pct', 'Presença'], ['nome', 'Nome'], ['faltas', 'Faltas']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setOrdem(val)}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium border transition-all', ordem === val ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:bg-muted border-border')}>
                {label}
              </button>
            ))}
          </div>

          {visao === 'tabela' ? (
            <div className="rounded-lg border overflow-x-auto">
              <table className="min-w-[520px] w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-3 w-8 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aluno</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Presença</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Faltas</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Bíblias</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Revistas</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Avaliação</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((a, i) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-center text-muted-foreground text-xs font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{a.nome}</p>
                        {a.cargo && <p className="text-[11px] text-muted-foreground">{a.cargo}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.pct === null ? <span className="text-xs text-muted-foreground">—</span> : (
                          <>
                            <span className="text-xs font-bold" style={{ color: corPresenca(a.pct) }}>{a.pct}%</span>
                            <p className="text-[10px] text-muted-foreground">{a.presentes}/{a.total}</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('text-sm font-semibold', a.faltas === 0 ? 'text-green-600' : 'text-red-500')}>{a.faltas}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-purple-600 hidden md:table-cell">{a.biblias}</td>
                      <td className="px-4 py-3 text-center text-orange-600 hidden md:table-cell">{a.revistas}</td>
                      <td className="px-4 py-3">
                        {a.pct === null
                          ? <Badge variant="outline" className="text-xs text-muted-foreground">Sem registros</Badge>
                          : <Badge className={cn('text-xs border', badgePresenca(a.pct))}>{labelPresenca(a.pct)}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : chamadas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma chamada no período.</p>
          ) : (
            <div className="space-y-2">
              <div className="rounded-lg border overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="sticky left-0 z-10 bg-muted text-left px-3 py-2 font-medium text-muted-foreground min-w-[160px]">Aluno</th>
                      {chamadas.map(c => (
                        <th key={c.id} className="px-1 py-2 font-medium text-muted-foreground whitespace-nowrap">
                          <span className="inline-block [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">{format(parseISO(c.data), 'dd/MM')}</span>
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenados.map(a => (
                      <tr key={a.id} className="border-t">
                        <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium whitespace-nowrap">{a.nome}</td>
                        {chamadas.map(c => {
                          const v = a.celulas[c.id]
                          return (
                            <td key={c.id} className="px-1 py-1.5 text-center">
                              <span
                                title={`${format(parseISO(c.data), 'dd/MM')}: ${v === undefined ? 'sem registro' : v ? 'presente' : 'falta'}`}
                                className={cn('inline-block w-4 h-4 rounded-sm', v === undefined ? 'bg-muted' : v ? 'bg-green-500' : 'bg-red-400')}
                              />
                            </td>
                          )
                        })}
                        <td className="px-3 py-1.5 text-center font-semibold" style={a.pct !== null ? { color: corPresenca(a.pct) } : undefined}>
                          {a.pct === null ? '—' : `${a.pct}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" />Presente</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400" />Falta</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-muted border" />Sem registro (ainda não estava na turma)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

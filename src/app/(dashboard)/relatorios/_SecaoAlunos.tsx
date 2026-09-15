"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trophy, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { badgePresenca } from '@/lib/presence'
import { cn } from '@/lib/utils'

export interface AlunoFrequente {
  id: string; nome: string; sala: string; presentes: number; total: number; pct: number; faltas: number
  posicao?: number; empatado?: boolean
}

export const MIN_AULAS_ATENCAO = 3

const corPosicao = (p: number) => p === 1 ? 'text-yellow-500' : p === 2 ? 'text-slate-400' : p === 3 ? 'text-orange-600' : 'text-muted-foreground'

export function SecaoAlunos({ topAlunos, alunosAtencao }: { topAlunos: AlunoFrequente[]; alunosAtencao: AlunoFrequente[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div id="section-topAlunos">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />Top 10 mais frequentes
            </CardTitle>
            <CardDescription>Maior presença no período · empates dividem a posição</CardDescription>
          </CardHeader>
          <CardContent>
            {topAlunos.length === 0 ? (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table className="min-w-[340px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="text-center">Presença</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Faltas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAlunos.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className={cn('font-bold text-center', corPosicao(a.posicao ?? 0))}>{a.posicao}º</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{a.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{a.sala}{a.empatado ? ' · empate' : ''}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', badgePresenca(a.pct))}>{a.pct}%</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{a.presentes}/{a.total}</p>
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <span className={cn('text-sm font-semibold', a.faltas === 0 ? 'text-green-600' : 'text-red-500')}>{a.faltas}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="section-atencao">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />Presença crítica
            </CardTitle>
            <CardDescription>Abaixo de 50% no período (com pelo menos {MIN_AULAS_ATENCAO} aulas registradas)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alunosAtencao.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum aluno com presença crítica no período.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {alunosAtencao.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-red-500/5 border-red-500/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{a.nome}</span>
                        <span className="text-xs font-bold text-red-600 ml-2">{a.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${a.pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground truncate">{a.sala}</span>
                        <span className="text-[11px] text-red-500 flex-shrink-0">{a.presentes}/{a.total} · {a.faltas} falta{a.faltas !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trophy, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlunoFrequente { nome: string; sala: string; presentes: number; total: number; pct: number; faltas: number }

interface SecaoAlunosProps {
  topAlunos: AlunoFrequente[]
  alunosAtencao: AlunoFrequente[]
}

export function SecaoAlunos({ topAlunos, alunosAtencao }: SecaoAlunosProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div id="section-topAlunos">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />Top 10 Mais Frequentes
            </CardTitle>
            <CardDescription>Alunos com maior presença no período</CardDescription>
          </CardHeader>
          <CardContent>
            {topAlunos.length === 0 ? (
              <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
            ) : (
              <>
                <div className="sm:hidden space-y-2">
                  {topAlunos.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <span className={`w-7 text-center font-bold flex-shrink-0 text-sm ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}º`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{a.nome}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{a.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', a.pct === 100 ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary')}>{a.pct}%</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{a.presentes}/{a.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block rounded-lg border overflow-x-auto">
                  <Table className="min-w-[340px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Aluno</TableHead>
                        <TableHead className="hidden sm:table-cell">Sala</TableHead>
                        <TableHead className="text-center">Presença</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">Faltas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topAlunos.map((a, i) => (
                        <TableRow key={i}>
                          <TableCell className={`font-bold text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}º`}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {a.nome}
                            <p className="text-[11px] text-muted-foreground sm:hidden">{a.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell"><span className="text-xs text-muted-foreground">{a.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</span></TableCell>
                          <TableCell className="text-center">
                            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', a.pct === 100 ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary')}>{a.pct}%</span>
                            <p className="text-[10px] text-muted-foreground">{a.presentes}/{a.total}</p>
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <span className={cn('text-sm font-semibold', a.faltas === 0 ? 'text-green-600' : 'text-red-500')}>{a.faltas}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="section-atencao">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />Alunos que Precisam de Atenção
            </CardTitle>
            <CardDescription>Presença abaixo de 50% no período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alunosAtencao.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum aluno com presença crítica no período.</p>
              </div>
            ) : (
              alunosAtencao.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-red-500/5 border-red-500/20">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{a.nome}</span>
                      <span className="text-xs font-bold text-red-600 ml-2">{a.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${a.pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{a.sala}</span>
                      <span className="text-[11px] text-red-500">{a.faltas} falta{a.faltas !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

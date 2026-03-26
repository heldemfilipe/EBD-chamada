"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Star } from 'lucide-react'
import { corPresenca, badgePresenca, labelPresenca } from '@/lib/presence'
import { cn } from '@/lib/utils'

interface ProfessorDesempenho { nome: string; turmas: string[]; aulas: number; presMedia: number; biblias: number }

interface SecaoProfessoresProps {
  professores: ProfessorDesempenho[]
}

export function SecaoProfessores({ professores }: SecaoProfessoresProps) {
  return (
    <div id="section-professores">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-orange-500" />Desempenho dos Professores
          </CardTitle>
          <CardDescription>Aulas ministradas e presença pessoal de cada professor no período</CardDescription>
        </CardHeader>
        <CardContent>
          {professores.length === 0 ? (
            <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
          ) : (
            <>
              <div className="sm:hidden space-y-3">
                {professores.map((p, i) => (
                  <div key={i} className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-3">
                      <p className="font-semibold text-sm">{p.nome}</p>
                      {p.turmas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.turmas.map((t, j) => <Badge key={j} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 divide-x border-t bg-muted/30">
                      <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold">{p.aulas}</span><span className="text-[10px] text-muted-foreground">Aulas</span></div>
                      <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold" style={{ color: corPresenca(p.presMedia) }}>{p.presMedia}%</span><span className="text-[10px] text-muted-foreground">Presença</span></div>
                      <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold text-purple-600">{p.biblias}%</span><span className="text-[10px] text-muted-foreground">Bíblias</span></div>
                    </div>
                    <div className="px-4 py-2 border-t flex items-center justify-end">
                      <Badge className={cn('text-xs border', p.aulas > 0 ? badgePresenca(p.presMedia) : 'bg-muted text-muted-foreground border-muted')}>
                        {p.aulas > 0 ? labelPresenca(p.presMedia) : 'Sem aulas'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block rounded-lg border overflow-x-auto">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Professor</TableHead>
                      <TableHead className="hidden sm:table-cell">Turmas</TableHead>
                      <TableHead className="text-center">Aulas</TableHead>
                      <TableHead className="text-center">Presença</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Bíblias %</TableHead>
                      <TableHead>Avaliação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professores.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {p.nome}
                          <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5">
                            {p.turmas.map((t, j) => <span key={j} className="text-[11px] text-muted-foreground">{t}</span>)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-col gap-0.5">
                            {p.turmas.length > 0
                              ? p.turmas.map((t, j) => <span key={j} className="text-xs text-muted-foreground">{t}</span>)
                              : <span className="text-xs text-muted-foreground">Sem turma</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{p.aulas}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div className="h-full rounded-full" style={{ width: `${p.presMedia}%`, backgroundColor: corPresenca(p.presMedia) }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: corPresenca(p.presMedia) }}>{p.presMedia}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <span className="text-xs font-semibold text-purple-600">{p.biblias}%</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs border', p.aulas > 0 ? badgePresenca(p.presMedia) : 'bg-muted text-muted-foreground border-muted')}>
                            {p.aulas > 0 ? labelPresenca(p.presMedia) : 'Sem aulas'}
                          </Badge>
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
  )
}

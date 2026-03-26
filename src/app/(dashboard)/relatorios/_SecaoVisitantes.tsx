"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus } from 'lucide-react'
import { corPresenca, badgePresenca, labelPresenca } from '@/lib/presence'
import { cn } from '@/lib/utils'

interface VisitanteRelatorio {
  id: string; nome: string; telefone: string; convertido: boolean
  visitas: { data: string; presente: boolean; trouxe_biblia: boolean; trouxe_revista: boolean }[]
  presentes: number; pct: number; biblias: number; revistas: number
}

interface SecaoVisitantesProps {
  visitantes: VisitanteRelatorio[]
  visitantesOrdenados: VisitanteRelatorio[]
  sort: 'visitas' | 'nome' | 'pct'
  onSort: (s: 'visitas' | 'nome' | 'pct') => void
  labelRelatorio: string
}

export function SecaoVisitantes({ visitantes, visitantesOrdenados, sort, onSort, labelRelatorio }: SecaoVisitantesProps) {
  const visitantesConvertidos = visitantes.filter(v => v.convertido).length

  return (
    <div id="section-visitantesRel">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-500" />Visitantes no Período
          </CardTitle>
          <CardDescription>{labelRelatorio}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visitantes.length === 0 ? (
            <EmptyState message="Nenhum visitante registrado no período" minHeight="h-[100px]" />
          ) : (
            <>
              {/* Resumo rápido */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xl font-bold text-blue-600">{visitantes.length}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Visitantes únicos</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xl font-bold">{visitantes.reduce((s, v) => s + v.visitas.length, 0)}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Total de visitas</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{visitantes.reduce((s, v) => s + v.presentes, 0)}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Presenças</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xl font-bold text-emerald-600">{visitantesConvertidos}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Convertidos</p>
                </div>
              </div>

              {/* Sort chips */}
              <div className="flex items-center gap-2 flex-wrap" data-no-print>
                <span className="text-xs text-muted-foreground">Ordenar:</span>
                {([['visitas', 'Visitas'], ['pct', 'Presença'], ['nome', 'Nome']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => onSort(val)}
                    className={cn('px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                      sort === val ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:bg-muted border-border')}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Mobile: cards */}
              <div className="sm:hidden space-y-2">
                {visitantesOrdenados.map((v) => (
                  <div key={v.id} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-start justify-between px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{v.nome}</p>
                          {v.convertido && <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">Convertido</Badge>}
                        </div>
                        {v.telefone && <p className="text-[11px] text-muted-foreground">{v.telefone}</p>}
                      </div>
                      <div className="flex-shrink-0 ml-2 text-right">
                        <span className="text-xs font-bold" style={{ color: corPresenca(v.pct) }}>{v.pct}%</span>
                        <p className="text-[10px] text-muted-foreground">{v.presentes}/{v.visitas.length} pres.</p>
                      </div>
                    </div>
                    <div className="px-4 pb-3">
                      <div className="flex flex-wrap gap-1">
                        {v.visitas.map((vis, j) => (
                          <span key={j} className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium',
                            vis.presente ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30')}>
                            {vis.data}
                          </span>
                        ))}
                      </div>
                    </div>
                    {(v.biblias > 0 || v.revistas > 0) && (
                      <div className="grid grid-cols-2 divide-x border-t bg-muted/20">
                        <div className="flex flex-col items-center py-2"><span className="text-xs font-bold text-purple-600">{v.biblias}</span><span className="text-[10px] text-muted-foreground">Bíblias</span></div>
                        <div className="flex flex-col items-center py-2"><span className="text-xs font-bold text-orange-600">{v.revistas}</span><span className="text-[10px] text-muted-foreground">Revistas</span></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden sm:block rounded-lg border overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Visitante</TableHead>
                      <TableHead className="hidden md:table-cell">Telefone</TableHead>
                      <TableHead>Dias visitados</TableHead>
                      <TableHead className="text-center">Pres.</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Bíblias</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Revistas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitantesOrdenados.map((v, i) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-center text-muted-foreground text-xs font-medium">{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-sm">{v.nome}</p>
                              {v.telefone && <p className="text-[11px] text-muted-foreground md:hidden">{v.telefone}</p>}
                            </div>
                            {v.convertido && <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border flex-shrink-0">Convertido</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{v.telefone || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {v.visitas.map((vis, j) => (
                              <span key={j} className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium',
                                vis.presente ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30')}>
                                {vis.data}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div className="h-full rounded-full" style={{ width: `${v.pct}%`, backgroundColor: corPresenca(v.pct) }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: corPresenca(v.pct) }}>{v.pct}%</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{v.presentes}/{v.visitas.length}</p>
                        </TableCell>
                        <TableCell className="text-center text-purple-600 hidden md:table-cell">{v.biblias}</TableCell>
                        <TableCell className="text-center text-orange-600 hidden md:table-cell">{v.revistas}</TableCell>
                        <TableCell>
                          {v.convertido
                            ? <Badge className="text-xs bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">Convertido</Badge>
                            : <Badge className={cn('text-xs border', badgePresenca(v.pct))}>{labelPresenca(v.pct)}</Badge>
                          }
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

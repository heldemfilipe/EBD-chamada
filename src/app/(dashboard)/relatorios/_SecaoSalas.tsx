"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { corPresenca, badgePresenca, labelPresenca } from '@/lib/presence'
import { cn } from '@/lib/utils'

interface DadosSala {
  sala: string; cor: string; matriculados: number; presencaMedia: number
  presentes: number; faltas: number; visitantes: number; biblias: number; revistas: number; oferta: number
}

interface SecaoSalasProps {
  dados: DadosSala[]
}

export function SecaoSalas({ dados }: SecaoSalasProps) {
  return (
    <div id="section-porSala">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Presença por Sala</CardTitle>
          <CardDescription>Detalhamento por turma no período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dados.length === 0 ? (
            <EmptyState message="Sem dados para o período selecionado" />
          ) : (
            <>
              <div className="h-[180px] sm:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dados} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                    <XAxis dataKey="sala" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.replace('Crianças - ', '').replace('Adultos - ', '')} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Presença']} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                    <Bar dataKey="presencaMedia" radius={[8, 8, 0, 0]} animationDuration={600}>
                      {dados.map((e, i) => <Cell key={i} fill={e.cor} />)}
                      <LabelList dataKey="presencaMedia" position="top" fontSize={11} formatter={(v: number) => `${v}%`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="sm:hidden space-y-3">
                {dados.map((s, i) => (
                  <div key={i} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.cor }} />
                        <span className="font-semibold text-sm truncate">{s.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</span>
                      </div>
                      <Badge className={cn('text-xs border flex-shrink-0 ml-2', badgePresenca(s.presencaMedia))}>{s.presencaMedia}%</Badge>
                    </div>
                    <div className="px-4 pb-2">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.presencaMedia}%`, backgroundColor: s.cor }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 divide-x border-t">
                      <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold text-green-600">{s.presentes}</span><span className="text-[10px] text-muted-foreground">Pres.</span></div>
                      <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold text-red-600">{s.faltas}</span><span className="text-[10px] text-muted-foreground">Faltas</span></div>
                      <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold text-blue-600">{s.visitantes}</span><span className="text-[10px] text-muted-foreground">Visit.</span></div>
                      <div className="flex flex-col items-center py-2.5"><span className="text-sm font-bold">{s.matriculados}</span><span className="text-[10px] text-muted-foreground">Mat.</span></div>
                    </div>
                    <div className="grid grid-cols-3 divide-x border-t bg-muted/30">
                      <div className="flex flex-col items-center py-2"><span className="text-xs font-semibold text-purple-600">{s.biblias}</span><span className="text-[10px] text-muted-foreground">Bíblias</span></div>
                      <div className="flex flex-col items-center py-2"><span className="text-xs font-semibold text-orange-600">{s.revistas}</span><span className="text-[10px] text-muted-foreground">Revistas</span></div>
                      <div className="flex flex-col items-center py-2"><span className="text-xs font-semibold text-emerald-600">{s.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span className="text-[10px] text-muted-foreground">Oferta R$</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block rounded-lg border overflow-x-auto">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Sala</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Mat.</TableHead>
                      <TableHead className="text-center">Pres.</TableHead>
                      <TableHead className="text-center">Faltas</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Visit.</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Bíblias</TableHead>
                      <TableHead className="text-center hidden lg:table-cell">Revistas</TableHead>
                      <TableHead className="text-center hidden lg:table-cell">Oferta</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dados.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.cor }} />
                            <span className="font-medium text-sm">{s.sala.replace('Crianças - ', '').replace('Adultos - ', '')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{s.matriculados}</TableCell>
                        <TableCell className="text-center text-green-600 font-semibold">{s.presentes}</TableCell>
                        <TableCell className="text-center text-red-600 font-semibold">{s.faltas}</TableCell>
                        <TableCell className="text-center text-blue-600 hidden md:table-cell">{s.visitantes}</TableCell>
                        <TableCell className="text-center text-purple-600 hidden md:table-cell">{s.biblias}</TableCell>
                        <TableCell className="text-center text-orange-600 hidden lg:table-cell">{s.revistas}</TableCell>
                        <TableCell className="text-center text-emerald-600 hidden lg:table-cell">R$ {s.oferta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div className="h-full rounded-full" style={{ width: `${s.presencaMedia}%`, backgroundColor: corPresenca(s.presencaMedia) }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: corPresenca(s.presencaMedia) }}>{s.presencaMedia}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={cn('text-xs border', badgePresenca(s.presencaMedia))}>{labelPresenca(s.presencaMedia)}</Badge>
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

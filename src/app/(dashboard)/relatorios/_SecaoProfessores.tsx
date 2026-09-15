"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Star } from 'lucide-react'
import { corPresenca } from '@/lib/presence'

export interface ProfessorDesempenho {
  id: string
  nome: string
  /** Turmas às quais o professor está vinculado */
  turmas: string[]
  /** Aulas em que foi escalado no período */
  aulas: number
  /** Turmas em que deu aula no período (pela escala) */
  turmasEscaladas: string[]
  /** Presença do professor como aluno (null = não está cadastrado como aluno ou sem registros) */
  presentes: number
  registros: number
  presenca: number | null
  biblias: number | null
}

function Presenca({ p }: { p: ProfessorDesempenho }) {
  if (p.presenca === null) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
          <div className="h-full rounded-full" style={{ width: `${p.presenca}%`, backgroundColor: corPresenca(p.presenca) }} />
        </div>
        <span className="text-xs font-bold" style={{ color: corPresenca(p.presenca) }}>{p.presenca}%</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{p.presentes}/{p.registros}</span>
    </div>
  )
}

export function SecaoProfessores({ professores }: { professores: ProfessorDesempenho[] }) {
  return (
    <div id="section-professores">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-orange-500" />Professores
          </CardTitle>
          <CardDescription>
            Aulas dadas = vezes em que foi escalado no período · presença = frequência do professor como aluno na EBD
          </CardDescription>
        </CardHeader>
        <CardContent>
          {professores.length === 0 ? (
            <EmptyState message="Sem dados para o período selecionado" minHeight="h-[100px]" />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Professor</TableHead>
                    <TableHead className="hidden md:table-cell">Turmas vinculadas</TableHead>
                    <TableHead className="text-center">Aulas dadas</TableHead>
                    <TableHead className="text-center">Presença como aluno</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Bíblias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professores.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{p.nome}</p>
                        {p.turmasEscaladas.length > 0 && (
                          <p className="text-[11px] text-muted-foreground">Deu aula em: {p.turmasEscaladas.join(', ')}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {p.turmas.length > 0
                            ? p.turmas.map(t => <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>)
                            : <span className="text-xs text-muted-foreground">Sem turma</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={p.aulas > 0 ? 'font-semibold' : 'text-muted-foreground'}>{p.aulas}</span>
                      </TableCell>
                      <TableCell className="text-center"><Presenca p={p} /></TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {p.biblias === null ? <span className="text-xs text-muted-foreground">—</span> : <span className="text-xs font-semibold text-purple-600">{p.biblias}%</span>}
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
  )
}

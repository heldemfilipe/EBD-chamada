"use client"

import React, { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Book, BookOpen, GraduationCap } from 'lucide-react'
import { getCargo } from '@/lib/constants'

interface AlunoPresenca {
  aluno_id: string
  nome: string
  presente: 'presente' | 'ausente' | 'pendente'
  trouxe_biblia: boolean
  trouxe_revista: boolean
  justificativa: string
  isProfessor: boolean
  professorId: string | null
  cargo: string
  dadoAula: boolean
  turmaDaAulaId: string | null
  turmaDaAulaNome: string | null
}

interface AlunoRowProps {
  aluno: AlunoPresenca
  index: number
  turmaId: string
  onPresenca: (alunoId: string, status: 'presente' | 'ausente') => void
  onBiblia: (alunoId: string) => void
  onRevista: (alunoId: string) => void
  onJustificativa: (alunoId: string, justificativa: string) => void
}

export const AlunoRow = memo(function AlunoRow({
  aluno,
  index,
  turmaId,
  onPresenca,
  onBiblia,
  onRevista,
  onJustificativa,
}: AlunoRowProps) {
  const cargoInfo = getCargo(aluno.cargo)

  return (
    <div
      className={`p-4 border rounded-lg space-y-3 ${aluno.dadoAula ? 'border-red-500/60 bg-red-500/5' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium flex-shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{aluno.nome}</span>
              {aluno.isProfessor && (
                <Badge variant="outline" className="text-xs border-blue-400 text-blue-400 px-1.5 py-0">
                  Professor
                </Badge>
              )}
              {cargoInfo && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}
                >
                  {cargoInfo.label}
                </span>
              )}
            </div>
            {aluno.dadoAula && (
              <div className="flex items-center gap-1 mt-0.5">
                <GraduationCap className="h-3 w-3 text-red-400" />
                <span className="text-[11px] font-semibold text-red-400">
                  {aluno.turmaDaAulaId === turmaId
                    ? 'Lecionando hoje nesta turma'
                    : `Lecionando hoje em: ${aluno.turmaDaAulaNome}`}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={aluno.presente === 'presente' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPresenca(aluno.aluno_id, 'presente')}
            className={aluno.presente === 'presente' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            Presente
          </Button>
          <Button
            variant={aluno.presente === 'ausente' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPresenca(aluno.aluno_id, 'ausente')}
            className={aluno.presente === 'ausente' ? 'bg-red-500 hover:bg-red-600' : ''}
          >
            Ausente
          </Button>
          {aluno.presente === 'pendente' && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Pendente
            </Badge>
          )}
        </div>
      </div>
      {aluno.presente === 'presente' && (
        <div className="flex flex-wrap gap-4 sm:gap-6 ml-8 sm:ml-11">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`biblia-${aluno.aluno_id}`}
              checked={aluno.trouxe_biblia}
              onCheckedChange={() => onBiblia(aluno.aluno_id)}
            />
            <label htmlFor={`biblia-${aluno.aluno_id}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
              <Book className="h-4 w-4" /> Trouxe Bíblia
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`revista-${aluno.aluno_id}`}
              checked={aluno.trouxe_revista}
              onCheckedChange={() => onRevista(aluno.aluno_id)}
            />
            <label htmlFor={`revista-${aluno.aluno_id}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
              <BookOpen className="h-4 w-4" /> Trouxe Revista
            </label>
          </div>
        </div>
      )}
      {aluno.presente === 'ausente' && (
        <div className="ml-8 sm:ml-11 space-y-2">
          <Label htmlFor={`justificativa-${aluno.aluno_id}`} className="text-xs text-muted-foreground">
            Justificativa (opcional)
          </Label>
          <Input
            id={`justificativa-${aluno.aluno_id}`}
            placeholder="Ex: Viagem, doente..."
            value={aluno.justificativa}
            onChange={(e) => onJustificativa(aluno.aluno_id, e.target.value)}
            className="text-sm"
          />
        </div>
      )}
    </div>
  )
})

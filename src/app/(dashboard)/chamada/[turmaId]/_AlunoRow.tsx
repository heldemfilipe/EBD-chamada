"use client"

import React, { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Book, BookOpen, GraduationCap, CheckCircle2, XCircle } from 'lucide-react'
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
  const isPresente = aluno.presente === 'presente'
  const isAusente = aluno.presente === 'ausente'

  return (
    <div
      className={`p-3 border rounded-lg transition-colors ${
        aluno.dadoAula ? 'border-red-500/50 bg-red-500/5' :
        isPresente ? 'border-green-500/20 bg-green-500/[0.02]' :
        isAusente ? 'border-red-500/20 bg-red-500/[0.02]' : ''
      }`}
    >
      {/* Nome (linha 1) */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
          isPresente ? 'bg-green-500/15 text-green-600' :
          isAusente ? 'bg-red-500/15 text-red-600' :
          'bg-muted text-muted-foreground'
        }`}>
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm">{aluno.nome}</span>
            {aluno.isProfessor && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-400 text-blue-400">
                Prof.
              </Badge>
            )}
            {cargoInfo && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0 rounded-full border"
                style={{ backgroundColor: cargoInfo.bg, color: cargoInfo.color, borderColor: cargoInfo.border }}
              >
                {cargoInfo.label}
              </span>
            )}
          </div>
          {aluno.dadoAula && (
            <div className="flex items-center gap-1 mt-0.5">
              <GraduationCap className="h-2.5 w-2.5 text-red-400" />
              <span className="text-[10px] font-semibold text-red-400">
                {aluno.turmaDaAulaId === turmaId
                  ? 'Lecionando hoje'
                  : `Lecionando em: ${aluno.turmaDaAulaNome}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Botões de presença (linha 2) */}
      <div className="flex gap-2 ml-9">
        <button
          onClick={() => onPresenca(aluno.aluno_id, 'presente')}
          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-all ${
            isPresente
              ? 'bg-green-500 text-white border-green-500 shadow-sm'
              : 'border-border hover:border-green-400 hover:bg-green-500/10 text-muted-foreground hover:text-green-600'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Presente
        </button>
        <button
          onClick={() => onPresenca(aluno.aluno_id, 'ausente')}
          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-all ${
            isAusente
              ? 'bg-red-500 text-white border-red-500 shadow-sm'
              : 'border-border hover:border-red-400 hover:bg-red-500/10 text-muted-foreground hover:text-red-600'
          }`}
        >
          <XCircle className="h-4 w-4" />
          Ausente
        </button>
      </div>

      {/* Bíblia e Revista — aparece só quando presente */}
      {isPresente && (
        <div className="flex flex-wrap gap-3 mt-2 ml-9">
          <div className="flex items-center space-x-1.5">
            <Checkbox
              id={`biblia-${aluno.aluno_id}`}
              checked={aluno.trouxe_biblia}
              onCheckedChange={() => onBiblia(aluno.aluno_id)}
            />
            <label htmlFor={`biblia-${aluno.aluno_id}`} className="text-xs font-medium flex items-center gap-1 cursor-pointer">
              <Book className="h-3.5 w-3.5" /> Bíblia
            </label>
          </div>
          <div className="flex items-center space-x-1.5">
            <Checkbox
              id={`revista-${aluno.aluno_id}`}
              checked={aluno.trouxe_revista}
              onCheckedChange={() => onRevista(aluno.aluno_id)}
            />
            <label htmlFor={`revista-${aluno.aluno_id}`} className="text-xs font-medium flex items-center gap-1 cursor-pointer">
              <BookOpen className="h-3.5 w-3.5" /> Revista
            </label>
          </div>
        </div>
      )}

      {/* Justificativa — aparece só quando ausente */}
      {isAusente && (
        <div className="mt-2 ml-9">
          <Input
            placeholder="Justificativa (opcional)"
            value={aluno.justificativa}
            onChange={(e) => onJustificativa(aluno.aluno_id, e.target.value)}
            className="text-xs h-8"
          />
        </div>
      )}
    </div>
  )
})

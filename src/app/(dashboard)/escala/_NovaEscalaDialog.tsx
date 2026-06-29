"use client"

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar, BookOpen, Link2, RotateCcw } from 'lucide-react'
import { ANOS_DISPONIVEIS, getTemaRevista, getLicaoTema } from '@/lib/constants'

interface Professor { id: string; nome: string }
interface Turma { id: string; nome: string; cor: string; sala?: string | null }

const TRIMESTRES_LABEL = [
  '1º Trimestre (Jan–Mar)',
  '2º Trimestre (Abr–Jun)',
  '3º Trimestre (Jul–Set)',
  '4º Trimestre (Out–Dez)',
]
const TRIMESTRES_SHORT = ['1º Trim', '2º Trim', '3º Trim', '4º Trim']

interface FormData {
  ano: string
  trimestre: string
  aulaIdx: string
  turmaId: string
  professorId: string
  observacao: string
  tituloAula: string
}

interface NovaEscalaDialogProps {
  open: boolean
  onClose: () => void
  formData: FormData
  onChange: (data: FormData) => void
  onSave: () => void
  professores: Professor[]
  turmas: Turma[]
  isSaving: boolean
  editMode: boolean
  domingosTrimForm: { aula: number; data: string; label: string }[]
  dataComputada: string
  salasUnidasConfig: Record<string, string>
  onSalvarSalasUnidas: (config: Record<string, string>) => void
  profTurmasMap: Record<string, string[]>
}

function fmtDataLonga(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
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

export function NovaEscalaDialog({
  open, onClose, formData, onChange, onSave, professores, turmas,
  isSaving, editMode, domingosTrimForm, dataComputada, salasUnidasConfig, onSalvarSalasUnidas,
  profTurmasMap,
}: NovaEscalaDialogProps) {
  const turmasOrdenadas = [...turmas].sort((a, b) => ordemTurma(a.sala, a.nome) - ordemTurma(b.sala, b.nome))
  const getTurmaNome = (id: string) => turmas.find(t => t.id === id)?.nome ?? '—'
  const unidaChave = (turmaId: string, data: string) => `${turmaId}::${data}`

  // Sugestão de título da revista para a combinação turma+aula atual
  const turmaNomeAtual  = formData.turmaId ? getTurmaNome(formData.turmaId) : ''
  const tituloSugerido  = turmaNomeAtual
    ? getLicaoTema(turmaNomeAtual, formData.ano, parseInt(formData.trimestre), parseInt(formData.aulaIdx))
    : null

  // Auto-preenche o título quando o usuário seleciona turma ou aula, mas apenas se o campo estiver vazio
  const prevKey = useRef('')
  useEffect(() => {
    const key = `${formData.turmaId}::${formData.aulaIdx}::${formData.trimestre}::${formData.ano}`
    if (key !== prevKey.current && !formData.tituloAula && tituloSugerido) {
      onChange({ ...formData, tituloAula: tituloSugerido })
    }
    prevKey.current = key
  }, [formData.turmaId, formData.aulaIdx, formData.trimestre, formData.ano]) // eslint-disable-line

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Editar Escala' : 'Nova Escala'}</DialogTitle>
          <DialogDescription>
            {editMode ? 'Atualize a escala selecionada.' : 'Defina o domingo, turma e professor.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seletor de Aula */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />Domingo / Aula
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Select value={formData.ano} onValueChange={v => onChange({ ...formData, ano: v, aulaIdx: '1' })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANOS_DISPONIVEIS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Trimestre</Label>
                <Select value={formData.trimestre} onValueChange={v => onChange({ ...formData, trimestre: v, aulaIdx: '1' })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIMESTRES_LABEL.map((t, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{TRIMESTRES_SHORT[i]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Aula</Label>
              <Select value={formData.aulaIdx} onValueChange={v => onChange({ ...formData, aulaIdx: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {domingosTrimForm.map(d => (
                    <SelectItem key={d.aula} value={String(d.aula)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dataComputada && (
              <p className="text-xs text-muted-foreground capitalize">
                {fmtDataLonga(dataComputada)} de {new Date(dataComputada + 'T12:00:00').getFullYear()}
              </p>
            )}
          </div>

          {/* Turma */}
          <div className="space-y-1.5">
            <Label className="text-sm">Turma *</Label>
            <Select value={formData.turmaId} onValueChange={v => onChange({ ...formData, turmaId: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
              <SelectContent>
                {turmasOrdenadas.map(t => {
                  const tema = getTemaRevista(t.nome, formData.ano, parseInt(formData.trimestre))
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.cor}`} />
                        <span>{t.nome}</span>
                        {tema && <span className="text-muted-foreground text-xs truncate max-w-[120px]">— {tema}</span>}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {formData.turmaId && (() => {
              const nome      = getTurmaNome(formData.turmaId)
              const aulaNum   = parseInt(formData.aulaIdx)
              const temaLicao = getLicaoTema(nome, formData.ano, parseInt(formData.trimestre), aulaNum)
              const temaRev   = getTemaRevista(nome, formData.ano, parseInt(formData.trimestre))
              return (temaLicao || temaRev) ? (
                <div className="rounded-md bg-muted/40 border px-3 py-2 mt-1.5 flex items-start gap-2">
                  <BookOpen className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0">
                    {temaLicao && (
                      <p className="text-xs font-medium leading-snug">{temaLicao}</p>
                    )}
                    {temaRev && (
                      <p className="text-[11px] text-muted-foreground leading-snug">{temaRev}</p>
                    )}
                  </div>
                </div>
              ) : null
            })()}
          </div>

          {/* Sala Unida — configurado por aula específica */}
          {formData.turmaId && dataComputada && (() => {
            const chave        = unidaChave(formData.turmaId, dataComputada)
            const isUnidaAtual = chave in salasUnidasConfig
            const unidaComId   = salasUnidasConfig[chave] ?? ''
            const outrasTurmas = turmasOrdenadas.filter(t => t.id !== formData.turmaId)
            return (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />Sala unida nesta aula
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...salasUnidasConfig }
                      if (isUnidaAtual) {
                        delete next[chave]
                      } else {
                        next[chave] = outrasTurmas[0]?.id ?? ''
                      }
                      onSalvarSalasUnidas(next)
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      isUnidaAtual ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${
                      isUnidaAtual ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {isUnidaAtual && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Unida com:</p>
                    <Select
                      value={unidaComId}
                      onValueChange={v => onSalvarSalasUnidas({ ...salasUnidasConfig, [chave]: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {outrasTurmas.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${t.cor}`} />
                              {t.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Professor */}
          <div className="space-y-1.5">
            <Label className="text-sm">Professor *</Label>
            <Select value={formData.professorId} onValueChange={v => onChange({ ...formData, professorId: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o professor" /></SelectTrigger>
              <SelectContent>
                {(formData.turmaId && profTurmasMap[formData.turmaId]?.length
                  ? professores.filter(p => profTurmasMap[formData.turmaId].includes(p.id))
                  : professores
                ).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Título da Aula */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Título da Aula</Label>
              {tituloSugerido && formData.tituloAula !== tituloSugerido && (
                <button
                  type="button"
                  onClick={() => onChange({ ...formData, tituloAula: tituloSugerido })}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  title="Usar título da revista CPAD"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  usar título da revista
                </button>
              )}
            </div>
            <Input
              value={formData.tituloAula}
              onChange={e => onChange({ ...formData, tituloAula: e.target.value })}
              placeholder={tituloSugerido ?? 'Título personalizado da aula...'}
              className="h-9"
            />
            {tituloSugerido && formData.tituloAula && formData.tituloAula !== tituloSugerido && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3 flex-shrink-0" />
                Revista: {tituloSugerido}
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-sm">Observações</Label>
            <Input
              value={formData.observacao}
              onChange={e => onChange({ ...formData, observacao: e.target.value })}
              placeholder="Alguma observação sobre esta aula..."
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : editMode ? 'Salvar Alterações' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

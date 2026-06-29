"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export interface ConfigSugestao {
  profParidade: string[]
  paridadePorTrim: Record<string, 'par' | 'impar' | 'todos'>
  semSegundoDomingo: string[]
  semPrimeiraAula: string[]
}

export const CONFIG_PADRAO: ConfigSugestao = {
  profParidade: ['viviana', 'livys'],
  paridadePorTrim: { '1': 'par', '2': 'par', '3': 'par', '4': 'par' },
  semSegundoDomingo: ['eder', 'heldem', 'leandro'],
  semPrimeiraAula: ['eder', 'heldem', 'leandro'],
}

const LS_KEY = 'ebd-config-sugestao'

export function carregarConfig(): ConfigSugestao {
  if (typeof window === 'undefined') return CONFIG_PADRAO
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return CONFIG_PADRAO
    return { ...CONFIG_PADRAO, ...JSON.parse(raw) }
  } catch {
    return CONFIG_PADRAO
  }
}

export function salvarConfig(cfg: ConfigSugestao) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg))
}

const TRIM_LABELS = ['1º Trim', '2º Trim', '3º Trim', '4º Trim']
const PARIDADE_OPTS: { value: 'par' | 'impar' | 'todos'; label: string }[] = [
  { value: 'par',    label: 'Aulas pares' },
  { value: 'impar',  label: 'Aulas ímpares' },
  { value: 'todos',  label: 'Todas as aulas' },
]

interface Props {
  open: boolean
  onClose: () => void
  config: ConfigSugestao
  onSave: (cfg: ConfigSugestao) => void
}

function listToInput(arr: string[]) { return arr.join(', ') }
function inputToList(s: string) {
  return s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
}

export function ConfigSugestaoDialog({ open, onClose, config, onSave }: Props) {
  const [draft, setDraft] = useState<ConfigSugestao>(config)

  function handleOpen() {
    setDraft(config)
  }

  function setPar(trim: string, v: 'par' | 'impar' | 'todos') {
    setDraft(d => ({ ...d, paridadePorTrim: { ...d.paridadePorTrim, [trim]: v } }))
  }

  function handleSave() {
    salvarConfig(draft)
    onSave(draft)
    onClose()
  }

  function handleReset() {
    setDraft(CONFIG_PADRAO)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); else handleOpen() }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Restrições da Sugestão</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* Paridade de aulas */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Paridade de aulas</Label>
            <div className="space-y-2">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Professores (nomes parciais, separados por vírgula)</Label>
                <Input
                  value={listToInput(draft.profParidade)}
                  onChange={e => setDraft(d => ({ ...d, profParidade: inputToList(e.target.value) }))}
                  placeholder="viviana, livys"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['1','2','3','4'] as const).map((t, i) => (
                  <div key={t} className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">{TRIM_LABELS[i]}</Label>
                    <Select
                      value={draft.paridadePorTrim[t] ?? 'par'}
                      onValueChange={v => setPar(t, v as 'par' | 'impar' | 'todos')}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PARIDADE_OPTS.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sem 2º domingo */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Não escalar no 2º domingo do mês</Label>
            <Label className="text-xs text-muted-foreground block">Professores (nomes parciais, separados por vírgula)</Label>
            <Input
              value={listToInput(draft.semSegundoDomingo)}
              onChange={e => setDraft(d => ({ ...d, semSegundoDomingo: inputToList(e.target.value) }))}
              placeholder="eder, heldem, leandro"
            />
          </div>

          {/* Sem 1ª aula */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Não escalar na 1ª aula do trimestre</Label>
            <Label className="text-xs text-muted-foreground block">Professores (nomes parciais, separados por vírgula)</Label>
            <Input
              value={listToInput(draft.semPrimeiraAula)}
              onChange={e => setDraft(d => ({ ...d, semPrimeiraAula: inputToList(e.target.value) }))}
              placeholder="eder, heldem, leandro"
            />
          </div>

        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="sm:mr-auto">
            Restaurar padrão
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

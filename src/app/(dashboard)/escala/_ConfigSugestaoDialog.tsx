"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, X, Eye } from 'lucide-react'
import { salvarConfigSugestao } from '@/actions/escala'
import {
  CONFIG_SUGESTAO_VAZIA, type ConfigSugestao, type Paridade, type Trimestre,
} from '@/lib/escala-sugestao'
import { toast } from '@/lib/toast'

export type { ConfigSugestao }

interface Professor { id: string; nome: string }
interface Turma { id: string; nome: string }

const TRIM_LABELS = ['1º Trim', '2º Trim', '3º Trim', '4º Trim']
const PARIDADE_OPTS: { value: Paridade; label: string }[] = [
  { value: 'par',   label: 'Aulas pares' },
  { value: 'impar', label: 'Aulas ímpares' },
  { value: 'todos', label: 'Todas as aulas' },
]

const selectNativo = 'text-xs w-full rounded-md border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60'

// ─── Seletor de vários itens (chips + lista para adicionar) ───────────────────
function SeletorMultiplo({
  itens, selecionados, onChange, placeholder, disabled,
}: {
  itens: { id: string; nome: string }[]
  selecionados: string[]
  onChange: (ids: string[]) => void
  placeholder: string
  disabled?: boolean
}) {
  const disponiveis = itens.filter(i => !selecionados.includes(i.id))
  const nome = (id: string) => itens.find(i => i.id === id)?.nome ?? '—'

  return (
    <div className="space-y-2">
      {selecionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selecionados.map(id => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
              {nome(id)}
              {!disabled && (
                <button type="button" onClick={() => onChange(selecionados.filter(s => s !== id))} className="hover:text-destructive" aria-label={`Remover ${nome(id)}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && disponiveis.length > 0 && (
        <select
          value=""
          onChange={e => { if (e.target.value) onChange([...selecionados, e.target.value]) }}
          className={selectNativo}
        >
          <option value="">{placeholder}</option>
          {disponiveis.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </select>
      )}
      {selecionados.length === 0 && (disabled || disponiveis.length === 0) && (
        <p className="text-xs text-muted-foreground italic">Nenhum selecionado.</p>
      )}
    </div>
  )
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div>
        <Label className="text-sm font-semibold">{titulo}</Label>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
      {children}
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  config: ConfigSugestao
  onSave: (cfg: ConfigSugestao) => void
  professores: Professor[]
  turmas: Turma[]
  congregacaoNome?: string | null
  somenteLeitura?: boolean
}

export function ConfigSugestaoDialog({ open, onClose, config, onSave, professores, turmas, congregacaoNome, somenteLeitura }: Props) {
  const [draft, setDraft] = useState<ConfigSugestao>(config)
  const [salvando, setSalvando] = useState(false)

  // Ao abrir, parte sempre da configuração salva
  useEffect(() => { if (open) setDraft(config) }, [open, config])

  const nomeProf = (id: string) => professores.find(p => p.id === id)?.nome ?? '—'
  const nomeTurma = (id: string) => turmas.find(t => t.id === id)?.nome ?? '—'

  function setPar(trim: Trimestre, v: Paridade) {
    setDraft(d => ({ ...d, paridadePorTrimestre: { ...d.paridadePorTrimestre, [trim]: v } }))
  }

  async function handleSave() {
    setSalvando(true)
    const res = await salvarConfigSugestao(draft)
    setSalvando(false)
    if (!res.success || !res.config) {
      toast(res.error ?? 'Erro ao salvar as regras.', 'error')
      return
    }
    toast('Regras da sugestão salvas.', 'success')
    onSave(res.config)
    onClose()
  }

  // Formulários de "limite por turma" e "pares"
  const [novoLimite, setNovoLimite] = useState({ professorId: '', turmaId: '', maxAulas: '1' })
  const [novoPar, setNovoPar] = useState({ a: '', b: '' })

  function adicionarLimite() {
    if (!novoLimite.professorId || !novoLimite.turmaId) return
    const max = Math.max(0, parseInt(novoLimite.maxAulas) || 0)
    setDraft(d => ({
      ...d,
      limitesPorTurma: [
        ...d.limitesPorTurma.filter(l => !(l.professorId === novoLimite.professorId && l.turmaId === novoLimite.turmaId)),
        { professorId: novoLimite.professorId, turmaId: novoLimite.turmaId, maxAulas: max },
      ],
    }))
    setNovoLimite({ professorId: '', turmaId: '', maxAulas: '1' })
  }

  function adicionarPar() {
    if (!novoPar.a || !novoPar.b || novoPar.a === novoPar.b) return
    const existe = draft.paresIncompativeis.some(p =>
      (p.a === novoPar.a && p.b === novoPar.b) || (p.a === novoPar.b && p.b === novoPar.a))
    if (!existe) setDraft(d => ({ ...d, paresIncompativeis: [...d.paresIncompativeis, { a: novoPar.a, b: novoPar.b }] }))
    setNovoPar({ a: '', b: '' })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regras da Sugestão de Escala</DialogTitle>
          <DialogDescription>
            {congregacaoNome ? <>Regras exclusivas da congregação <strong>{congregacaoNome}</strong>. </> : null}
            Usadas pelo botão &quot;Gerar Sugestão&quot;.
          </DialogDescription>
        </DialogHeader>

        {somenteLeitura && (
          <p className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 rounded-md px-3 py-2">
            <Eye className="h-3.5 w-3.5" />Você tem acesso somente de visualização à escala.
          </p>
        )}

        <div className="space-y-3 py-1">
          <Secao titulo="Regras gerais" descricao="Aplicadas a todos os professores.">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Evitar domingos seguidos para o mesmo professor</span>
              <Switch
                checked={draft.semDomingosSeguidos}
                disabled={somenteLeitura}
                onCheckedChange={v => setDraft(d => ({ ...d, semDomingosSeguidos: v }))}
              />
            </label>
            <div className="space-y-1 pt-1">
              <Label className="text-xs text-muted-foreground">Turmas fora da geração automática</Label>
              <SeletorMultiplo
                itens={turmas}
                selecionados={draft.turmasExcluidas}
                onChange={ids => setDraft(d => ({ ...d, turmasExcluidas: ids }))}
                placeholder="+ Adicionar turma"
                disabled={somenteLeitura}
              />
            </div>
          </Secao>

          <Secao titulo="Paridade de aulas" descricao="Estes professores só são escalados em aulas pares ou ímpares, conforme o trimestre.">
            <SeletorMultiplo
              itens={professores}
              selecionados={draft.paridadeProfessores}
              onChange={ids => setDraft(d => ({ ...d, paridadeProfessores: ids }))}
              placeholder="+ Adicionar professor"
              disabled={somenteLeitura}
            />
            {draft.paridadeProfessores.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['1', '2', '3', '4'] as Trimestre[]).map((t, i) => (
                  <div key={t} className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">{TRIM_LABELS[i]}</Label>
                    <Select value={draft.paridadePorTrimestre[t]} onValueChange={v => setPar(t, v as Paridade)} disabled={somenteLeitura}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PARIDADE_OPTS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </Secao>

          <Secao titulo="Não escalar no 2º domingo do mês" descricao="Professores indisponíveis no segundo domingo.">
            <SeletorMultiplo
              itens={professores}
              selecionados={draft.semSegundoDomingo}
              onChange={ids => setDraft(d => ({ ...d, semSegundoDomingo: ids }))}
              placeholder="+ Adicionar professor"
              disabled={somenteLeitura}
            />
          </Secao>

          <Secao titulo="Não escalar na 1ª aula do trimestre" descricao="Professores indisponíveis na primeira aula.">
            <SeletorMultiplo
              itens={professores}
              selecionados={draft.semPrimeiraAula}
              onChange={ids => setDraft(d => ({ ...d, semPrimeiraAula: ids }))}
              placeholder="+ Adicionar professor"
              disabled={somenteLeitura}
            />
          </Secao>

          <Secao titulo="Limite de aulas por turma" descricao="Máximo de aulas no trimestre de um professor em determinada turma.">
            {draft.limitesPorTurma.length > 0 && (
              <ul className="space-y-1">
                {draft.limitesPorTurma.map(l => (
                  <li key={`${l.professorId}-${l.turmaId}`} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                    <span><strong>{nomeProf(l.professorId)}</strong> · {nomeTurma(l.turmaId)} · máx. {l.maxAulas} aula(s)</span>
                    {!somenteLeitura && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDraft(d => ({ ...d, limitesPorTurma: d.limitesPorTurma.filter(x => x !== l) }))}
                        aria-label="Remover limite"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!somenteLeitura && (
              <div className="grid grid-cols-[1fr_1fr_4rem_auto] gap-1.5 items-center">
                <select value={novoLimite.professorId} onChange={e => setNovoLimite(n => ({ ...n, professorId: e.target.value }))} className={selectNativo}>
                  <option value="">Professor</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <select value={novoLimite.turmaId} onChange={e => setNovoLimite(n => ({ ...n, turmaId: e.target.value }))} className={selectNativo}>
                  <option value="">Turma</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                <Input
                  type="number" min={0} max={20}
                  value={novoLimite.maxAulas}
                  onChange={e => setNovoLimite(n => ({ ...n, maxAulas: e.target.value }))}
                  className="h-8 text-xs"
                  aria-label="Máximo de aulas"
                />
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={adicionarLimite} disabled={!novoLimite.professorId || !novoLimite.turmaId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Secao>

          <Secao titulo="Não escalar juntos no mesmo domingo" descricao="Pares de professores que não devem dar aula no mesmo dia (ex.: casais que cuidam dos filhos).">
            {draft.paresIncompativeis.length > 0 && (
              <ul className="space-y-1">
                {draft.paresIncompativeis.map(p => (
                  <li key={`${p.a}-${p.b}`} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                    <span><strong>{nomeProf(p.a)}</strong> e <strong>{nomeProf(p.b)}</strong></span>
                    {!somenteLeitura && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDraft(d => ({ ...d, paresIncompativeis: d.paresIncompativeis.filter(x => x !== p) }))}
                        aria-label="Remover par"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!somenteLeitura && (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
                <select value={novoPar.a} onChange={e => setNovoPar(n => ({ ...n, a: e.target.value }))} className={selectNativo}>
                  <option value="">Professor</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <select value={novoPar.b} onChange={e => setNovoPar(n => ({ ...n, b: e.target.value }))} className={selectNativo}>
                  <option value="">Professor</option>
                  {professores.filter(p => p.id !== novoPar.a).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={adicionarPar} disabled={!novoPar.a || !novoPar.b}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Secao>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          {!somenteLeitura && (
            <Button variant="ghost" size="sm" onClick={() => setDraft(CONFIG_SUGESTAO_VAZIA)} className="sm:mr-auto">
              Limpar regras
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={salvando}>{somenteLeitura ? 'Fechar' : 'Cancelar'}</Button>
          {!somenteLeitura && (
            <Button onClick={handleSave} disabled={salvando}>
              {salvando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

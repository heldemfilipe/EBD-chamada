"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, Clock, Loader2, MessageCircle, PhoneOff, RotateCcw, Send, Undo2 } from 'lucide-react'
import { salvarMensagensWhatsApp } from '@/actions/escala'
import {
  MENSAGENS_PADRAO, VARIAVEIS_MENSAGEM, DIAS_PARA_REENVIO,
  calcularStatusLembrete, linkWhatsApp, montarMensagem, segundaDaSemana, telefoneWhatsApp,
  type MensagensWhatsApp, type VariaveisMensagem,
} from '@/lib/lembrete-whatsapp'
import { toast } from '@/lib/toast'

export interface EscalaLembrete {
  id: string
  data: string
  confirmado: boolean
  lembreteEnviadoEm: string | null
  lembreteReenviadoEm: string | null
}

const fmtDiaMes = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

// ─── Status + ações na linha da escala ────────────────────────────────────────
export function AcoesLembrete({
  escala, telefone, podeEditar, onEnviar, onConfirmar, compacto,
}: {
  escala: EscalaLembrete
  telefone: string | null
  podeEditar: boolean
  onEnviar: (tipo: 'lembrete' | 'reenvio') => void
  onConfirmar: (confirmado: boolean) => void
  compacto?: boolean
}) {
  const status = calcularStatusLembrete(escala)
  const tel = telefoneWhatsApp(telefone)
  const texto = compacto ? 'hidden' : 'hidden sm:inline'

  if (status.tipo === 'confirmado') {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-600 px-2 py-0.5 text-[11px] font-medium" title="Professor confirmou">
          <CheckCircle2 className="h-3 w-3" /><span className={texto}>Confirmado</span>
        </span>
        {podeEditar && (
          <button
            type="button"
            onClick={() => onConfirmar(false)}
            title="Desfazer confirmação"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Undo2 className="h-3 w-3" />
          </button>
        )}
      </span>
    )
  }

  if (status.tipo === 'encerrado') return null
  if (!podeEditar) {
    if (status.tipo === 'pendente') return null
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px]">
        <Clock className="h-3 w-3" /><span className={texto}>Aguardando</span>
      </span>
    )
  }

  if (!tel) {
    return (
      <span title="Cadastre o telefone do professor para enviar pelo WhatsApp" className="p-1 text-muted-foreground/40">
        <PhoneOff className="h-3.5 w-3.5" />
      </span>
    )
  }

  const botaoConfirmar = (
    <button
      type="button"
      onClick={() => onConfirmar(true)}
      title="Marcar como confirmado"
      className="p-1 rounded text-muted-foreground hover:text-green-600 hover:bg-green-500/10"
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
    </button>
  )

  if (status.tipo === 'pendente') {
    return (
      <span className="inline-flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onEnviar('lembrete')}
          title={status.recomendado
            ? 'Enviar lembrete pelo WhatsApp'
            : `Enviar lembrete (recomendado a partir de segunda, ${fmtDiaMes(segundaDaSemana(escala.data))})`}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
            status.recomendado
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'text-muted-foreground hover:text-green-600 hover:bg-green-500/10'
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" /><span className={status.recomendado ? texto : 'hidden'}>Enviar</span>
        </button>
        {botaoConfirmar}
      </span>
    )
  }

  if (status.tipo === 'sem_resposta') {
    return (
      <span className="inline-flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onEnviar('reenvio')}
          title={`Sem resposta há ${status.dias} dias — reenviar`}
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 px-2 py-0.5 text-[11px] font-medium hover:bg-amber-500/25"
        >
          <RotateCcw className="h-3 w-3" /><span className={texto}>Sem resposta há {status.dias}d · Reenviar</span>
        </button>
        {botaoConfirmar}
      </span>
    )
  }

  // aguardando
  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onEnviar('lembrete')}
        title="Lembrete enviado — aguardando resposta (clique para enviar de novo)"
        className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5 text-[11px] font-medium hover:bg-blue-500/20"
      >
        <Clock className="h-3 w-3" /><span className={texto}>Aguardando</span>
      </button>
      {botaoConfirmar}
    </span>
  )
}

// ─── Janela de envio (mensagem pronta e editável) ────────────────────────────
export function EnviarLembreteDialog({
  open, onClose, tipo, variaveis, telefone, mensagens, onEnviado,
}: {
  open: boolean
  onClose: () => void
  tipo: 'lembrete' | 'reenvio'
  variaveis: VariaveisMensagem | null
  telefone: string | null
  mensagens: MensagensWhatsApp
  onEnviado: () => void
}) {
  const [texto, setTexto] = useState('')
  const tel = telefoneWhatsApp(telefone)

  useEffect(() => {
    if (open && variaveis) {
      setTexto(montarMensagem(tipo === 'reenvio' ? mensagens.reenvio : mensagens.lembrete, variaveis))
    }
  }, [open, tipo, variaveis, mensagens])

  function abrirWhatsApp() {
    if (!tel || !texto.trim()) return
    window.open(linkWhatsApp(tel, texto.trim()), '_blank', 'noopener,noreferrer')
    onEnviado()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            {tipo === 'reenvio' ? 'Reenviar lembrete' : 'Enviar lembrete'}
          </DialogTitle>
          <DialogDescription>
            {variaveis?.professor} · {tel ? `+${tel}` : 'sem telefone'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="msg-lembrete">Mensagem (pode editar antes de enviar)</Label>
          <Textarea id="msg-lembrete" rows={9} value={texto} onChange={e => setTexto(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            O WhatsApp abre com o texto pronto — confira e toque em enviar por lá. O envio fica registrado aqui
            {tipo === 'lembrete' ? ` e, sem confirmação em ${DIAS_PARA_REENVIO} dias, o card sugere reenviar.` : '.'}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={abrirWhatsApp} disabled={!tel || !texto.trim()} className="bg-green-600 hover:bg-green-700 text-white">
            <Send className="h-4 w-4 mr-2" />Abrir no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modelos de mensagem da congregação ───────────────────────────────────────
const EXEMPLO: VariaveisMensagem = {
  professor: 'Maria da Silva',
  turma: 'Dynamo',
  data: '2026-09-20',
  aula: 12,
  licao: 'Cuidado com o ego e suas ambições',
}

export function MensagensWhatsAppDialog({
  open, onClose, mensagens, onSalvo, congregacaoNome, somenteLeitura,
}: {
  open: boolean
  onClose: () => void
  mensagens: MensagensWhatsApp
  onSalvo: (m: MensagensWhatsApp) => void
  congregacaoNome?: string | null
  somenteLeitura?: boolean
}) {
  const [draft, setDraft] = useState<MensagensWhatsApp>(mensagens)
  const [aba, setAba] = useState<'lembrete' | 'reenvio'>('lembrete')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { if (open) setDraft(mensagens) }, [open, mensagens])

  function inserirVariavel(chave: string) {
    setDraft(d => ({ ...d, [aba]: `${d[aba]}${d[aba].endsWith(' ') || !d[aba] ? '' : ' '}${chave}` }))
  }

  async function salvar() {
    setSalvando(true)
    const res = await salvarMensagensWhatsApp(draft)
    setSalvando(false)
    if (!res.success) { toast(res.error ?? 'Erro ao salvar mensagens.', 'error'); return }
    toast('Mensagens salvas.', 'success')
    onSalvo({ lembrete: draft.lembrete.trim(), reenvio: draft.reenvio.trim() })
    onClose()
  }

  const campo = (tipo: 'lembrete' | 'reenvio') => (
    <div className="space-y-3">
      <Textarea
        rows={8}
        value={draft[tipo]}
        disabled={somenteLeitura}
        onChange={e => setDraft(d => ({ ...d, [tipo]: e.target.value }))}
      />
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-[11px] font-semibold text-muted-foreground mb-1">Pré-visualização</p>
        <p className="text-xs whitespace-pre-wrap">{montarMensagem(draft[tipo], EXEMPLO)}</p>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mensagens de lembrete</DialogTitle>
          <DialogDescription>
            {congregacaoNome ? <>Modelos da congregação <strong>{congregacaoNome}</strong>. </> : null}
            Usados no botão de WhatsApp de cada professor escalado.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={aba} onValueChange={v => setAba(v as 'lembrete' | 'reenvio')}>
          <TabsList className="w-full">
            <TabsTrigger value="lembrete" className="flex-1">Lembrete (segunda)</TabsTrigger>
            <TabsTrigger value="reenvio" className="flex-1">Reenvio (sem resposta)</TabsTrigger>
          </TabsList>
          <TabsContent value="lembrete" className="mt-3">{campo('lembrete')}</TabsContent>
          <TabsContent value="reenvio" className="mt-3">{campo('reenvio')}</TabsContent>
        </Tabs>

        {!somenteLeitura && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Clique para inserir no texto</Label>
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS_MENSAGEM.map(v => (
                <button
                  key={v.chave}
                  type="button"
                  title={v.descricao}
                  onClick={() => inserirVariavel(v.chave)}
                  className="rounded-md border px-2 py-0.5 text-[11px] font-mono hover:bg-muted"
                >
                  {v.chave}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Use *texto* para negrito no WhatsApp.</p>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          {!somenteLeitura && (
            <Button variant="ghost" size="sm" className="sm:mr-auto" onClick={() => setDraft(d => ({ ...d, [aba]: MENSAGENS_PADRAO[aba] }))}>
              Restaurar padrão
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={salvando}>{somenteLeitura ? 'Fechar' : 'Cancelar'}</Button>
          {!somenteLeitura && (
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

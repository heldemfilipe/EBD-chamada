"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Badge }    from '@/components/ui/badge'
import { Switch }   from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Bell, Settings, CheckCircle2, XCircle, Loader2, Send, Phone, User,
  ChevronLeft, ChevronRight, VolumeX, Volume2, Pencil, RefreshCw,
  Clock, CalendarDays, MessageSquare, AlertCircle, History, Eye,
  ExternalLink, Wifi, WifiOff, Zap,
} from 'lucide-react'
import { toast } from '@/lib/toast'

// ─── Constantes ───────────────────────────────────────────────────────────────
const DIAS_SEMANA = [
  { value: 0, label: 'Domingo'      },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira'  },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira'  },
  { value: 6, label: 'Sábado'       },
]

const DIAS_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

const TEMPLATE_PADRAO =
  `Paz do Senhor, *{professor}*! Tudo bem? 🙏\n\nLembrete: você está escalado para a *Aula {aula}* no *{dia_semana} ({data})* na sala *{sala}*.\nTema da lição: {tema}\n\nPode contar com você? 😊`

const VARIAVEIS = [
  { var: '{professor}', desc: 'Nome do professor'   },
  { var: '{aula}',      desc: 'Número da aula'      },
  { var: '{sala}',      desc: 'Nome da turma/sala'  },
  { var: '{data}',      desc: 'Data no formato dd/MM' },
  { var: '{dia_semana}', desc: 'Dia da semana por extenso' },
  { var: '{tema}',      desc: 'Tema/título da lição' },
]

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface NotifConfig {
  id?: string
  ativo: boolean
  dia_envio: number
  horario_envio: string
  dia_aula: number
  template: string
  // Z-API
  zapi_instance_id: string
  zapi_token: string
  // Meta Cloud API
  provedor: 'zapi' | 'meta'
  meta_access_token: string
  meta_phone_number_id: string
  meta_template_name: string
  meta_template_language: string
}

interface Notificacao {
  professorId: string
  turmaId: string
  professorNome: string
  turmaNome: string
  turmaCor: string
  telefone: string | null
  telefoneMascarado: string | null
  silenciado: boolean
  mensagemPersonalizada: string | null
  mensagem: string
  aulaNum: number
  dataAula: string
}

interface LogEntry {
  id: string
  professor_id: string
  turma_id: string
  data_aula: string
  numero_telefone: string | null
  mensagem: string | null
  status: 'enviado' | 'erro' | 'silenciado' | 'sem_telefone'
  erro: string | null
  criado_em: string
  professores?: { nome: string }
  turmas?: { nome: string; cor: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function proximaDomingo(diaAula = 0): string {
  const hoje = new Date()
  const dia  = hoje.getDay()
  const diff = (diaAula - dia + 7) % 7 || 7
  const prox = new Date(hoje)
  prox.setDate(hoje.getDate() + diff)
  return prox.toISOString().split('T')[0]
}

function adicionarSemana(data: string, semanas: number): string {
  const d = new Date(data + 'T12:00:00')
  d.setDate(d.getDate() + semanas * 7)
  return d.toISOString().split('T')[0]
}

function fmtDataExtenso(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

function fmtDataCurta(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function NotificacoesPage() {

  // ── Config ──────────────────────────────────────────────────────────────────
  const [config, setConfig]               = useState<NotifConfig>({
    ativo: false, dia_envio: 1, horario_envio: '09:00', dia_aula: 0,
    template: TEMPLATE_PADRAO,
    provedor: 'zapi', zapi_instance_id: '', zapi_token: '',
    meta_access_token: '', meta_phone_number_id: '',
    meta_template_name: '', meta_template_language: 'pt_BR',
  })
  const [configCarregando, setConfigCarregando] = useState(true)
  const [salvandoConfig,   setSalvandoConfig]   = useState(false)
  const [mostrarToken,     setMostrarToken]      = useState(false)

  // ── Status Z-API ────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<'verificando' | 'conectado' | 'desconectado' | 'sem_config' | null>(null)
  const [verificandoStatus, setVerificandoStatus] = useState(false)

  // ── Preview ─────────────────────────────────────────────────────────────────
  const [dataAulaSelecionada, setDataAulaSelecionada] = useState<string>('')
  const [notificacoes,        setNotificacoes]        = useState<Notificacao[]>([])
  const [previewCarregando,   setPreviewCarregando]   = useState(false)
  const [disparando,          setDisparando]          = useState(false)
  const [resultadoDisparo,    setResultadoDisparo]    = useState<{ enviados: number; erros: number; silenciados: number } | null>(null)

  // ── Editor de mensagem personalizada ───────────────────────────────────────
  const [editDialogOpen,     setEditDialogOpen]     = useState(false)
  const [editNotif,          setEditNotif]          = useState<Notificacao | null>(null)
  const [editMensagem,       setEditMensagem]       = useState('')
  const [salvandoEdit,       setSalvandoEdit]       = useState(false)

  // ── Preview mensagem ────────────────────────────────────────────────────────
  const [previewMsgDialogOpen, setPreviewMsgDialogOpen] = useState(false)
  const [previewMsgNotif,      setPreviewMsgNotif]      = useState<Notificacao | null>(null)

  // ── Histórico ───────────────────────────────────────────────────────────────
  const [logs,          setLogs]          = useState<LogEntry[]>([])
  const [logsCarregando, setLogsCarregando] = useState(false)
  const [logExpandido,  setLogExpandido]  = useState<string | null>(null)

  // ── Aba ativa ───────────────────────────────────────────────────────────────
  const [aba, setAba] = useState('config')

  // ─── Carga inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    carregarConfig()
  }, [])

  useEffect(() => {
    if (aba === 'proximas' && !dataAulaSelecionada) {
      setDataAulaSelecionada(proximaDomingo(config.dia_aula))
    }
    if (aba === 'historico' && logs.length === 0) {
      carregarLogs()
    }
  }, [aba])

  useEffect(() => {
    if (dataAulaSelecionada) carregarPreview(dataAulaSelecionada)
  }, [dataAulaSelecionada])

  // ─── Funções de carga ────────────────────────────────────────────────────────
  async function carregarConfig() {
    setConfigCarregando(true)
    try {
      const resp = await fetch('/api/notificacoes/config')
      const data = await resp.json()
      if (data && !data.error) setConfig(data)
    } catch {
      toast('Erro ao carregar configurações', 'error')
    } finally {
      setConfigCarregando(false)
    }
  }

  async function verificarConexao() {
    setVerificandoStatus(true)
    setStatus('verificando')
    try {
      const resp = await fetch('/api/notificacoes/status')
      const data = await resp.json()
      const semConfig = config.provedor === 'meta'
        ? (!config.meta_access_token || !config.meta_phone_number_id)
        : (!config.zapi_instance_id || !config.zapi_token)
      if (semConfig) {
        setStatus('sem_config')
      } else {
        setStatus(data.conectado ? 'conectado' : 'desconectado')
      }
    } catch {
      setStatus('desconectado')
    } finally {
      setVerificandoStatus(false)
    }
  }

  async function carregarPreview(data: string) {
    setPreviewCarregando(true)
    setResultadoDisparo(null)
    try {
      const resp = await fetch(`/api/notificacoes/preview?data=${data}`)
      const json = await resp.json()
      if (json.error) { toast(json.error, 'error'); return }
      setNotificacoes(json.notificacoes ?? [])
    } catch {
      toast('Erro ao carregar preview', 'error')
    } finally {
      setPreviewCarregando(false)
    }
  }

  async function carregarLogs() {
    setLogsCarregando(true)
    try {
      const resp = await fetch('/api/notificacoes/log?limite=80')
      const data = await resp.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch {
      toast('Erro ao carregar histórico', 'error')
    } finally {
      setLogsCarregando(false)
    }
  }

  // ─── Salvar config ───────────────────────────────────────────────────────────
  async function salvarConfig() {
    setSalvandoConfig(true)
    try {
      const resp = await fetch('/api/notificacoes/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await resp.json()
      if (data.error) { toast(data.error, 'error'); return }
      setConfig(data)
      toast('Configurações salvas!')
    } catch {
      toast('Erro ao salvar configurações', 'error')
    } finally {
      setSalvandoConfig(false)
    }
  }

  // ─── Toggle silêncio ─────────────────────────────────────────────────────────
  const toggleSilencio = useCallback(async (n: Notificacao) => {
    const novoValor = !n.silenciado
    // Otimista
    setNotificacoes(prev => prev.map(item =>
      item.professorId === n.professorId && item.turmaId === n.turmaId
        ? { ...item, silenciado: novoValor }
        : item
    ))
    try {
      await fetch('/api/notificacoes/semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_aula: n.dataAula, professor_id: n.professorId, turma_id: n.turmaId,
          silenciado: novoValor, mensagem_personalizada: n.mensagemPersonalizada,
        }),
      })
    } catch {
      // Reverte
      setNotificacoes(prev => prev.map(item =>
        item.professorId === n.professorId && item.turmaId === n.turmaId
          ? { ...item, silenciado: n.silenciado }
          : item
      ))
      toast('Erro ao atualizar', 'error')
    }
  }, [])

  // ─── Salvar mensagem personalizada ───────────────────────────────────────────
  async function salvarMensagemPersonalizada() {
    if (!editNotif) return
    setSalvandoEdit(true)
    try {
      const resp = await fetch('/api/notificacoes/semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_aula: editNotif.dataAula,
          professor_id: editNotif.professorId,
          turma_id: editNotif.turmaId,
          silenciado: editNotif.silenciado,
          mensagem_personalizada: editMensagem.trim() || null,
        }),
      })
      const data = await resp.json()
      if (data.error) { toast(data.error, 'error'); return }
      // Atualiza localmente
      setNotificacoes(prev => prev.map(item =>
        item.professorId === editNotif.professorId && item.turmaId === editNotif.turmaId
          ? { ...item, mensagemPersonalizada: editMensagem.trim() || null, mensagem: editMensagem.trim() || item.mensagem }
          : item
      ))
      setEditDialogOpen(false)
      toast('Mensagem personalizada salva!')
    } catch {
      toast('Erro ao salvar mensagem', 'error')
    } finally {
      setSalvandoEdit(false)
    }
  }

  // ─── Disparar notificações ───────────────────────────────────────────────────
  async function dispararNotificacoes(somenteEsta?: Notificacao) {
    setDisparando(true)
    setResultadoDisparo(null)
    try {
      const body: any = { skip_auth: true, data: dataAulaSelecionada }
      const resp = await fetch('/api/notificacoes/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (data.error) { toast(data.error, 'error'); return }
      setResultadoDisparo({ enviados: data.enviados, erros: data.erros, silenciados: data.silenciados })
      toast(`${data.enviados} mensagens enviadas!`)
      carregarPreview(dataAulaSelecionada)
      if (aba === 'historico') carregarLogs()
    } catch {
      toast('Erro ao disparar notificações', 'error')
    } finally {
      setDisparando(false)
    }
  }

  // ─── Render preview mensagem ─────────────────────────────────────────────────
  const mensagemPreview = config.template
    .replace(/\{professor\}/gi, 'Nathielly')
    .replace(/\{aula\}/gi, '5')
    .replace(/\{sala\}/gi, 'Cordeirinhos de Cristo')
    .replace(/\{data\}/gi, '05/05')
    .replace(/\{dia_semana\}/gi, DIAS_PT[config.dia_aula] ?? 'domingo')

  // ─── Status badge ────────────────────────────────────────────────────────────
  function StatusBadge() {
    if (!status) return null
    const map = {
      verificando:   { icon: Loader2,       cor: 'text-muted-foreground', bg: 'bg-muted',              label: 'Verificando...' },
      conectado:     { icon: CheckCircle2,  cor: 'text-emerald-600',      bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'Conectado' },
      desconectado:  { icon: WifiOff,       cor: 'text-destructive',      bg: 'bg-destructive/10',     label: 'Desconectado' },
      sem_config:    { icon: AlertCircle,   cor: 'text-amber-600',        bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Sem credenciais' },
    }
    const s = map[status]
    const Icon = s.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.cor} ${s.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${status === 'verificando' ? 'animate-spin' : ''}`} />
        {s.label}
      </span>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (configCarregando) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="h-12 w-full bg-muted rounded-xl" />
        <div className="h-64 w-full bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notificações WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Envio automático de lembretes para professores escalados
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card text-sm">
            <span className={`w-2 h-2 rounded-full ${config.ativo ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
            <span className="text-xs font-medium">{config.ativo ? 'Ativo' : 'Inativo'}</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="config"    className="flex-1 sm:flex-none gap-1.5"><Settings className="h-3.5 w-3.5" />Configuração</TabsTrigger>
          <TabsTrigger value="proximas"  className="flex-1 sm:flex-none gap-1.5"><Bell className="h-3.5 w-3.5" />Próximas</TabsTrigger>
          <TabsTrigger value="historico" className="flex-1 sm:flex-none gap-1.5"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA: CONFIGURAÇÃO                                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="config" className="space-y-4">

          {/* Card: Conexão WhatsApp */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                  <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Conexão WhatsApp</p>
                  <p className="text-[11px] text-muted-foreground">
                    {config.provedor === 'meta' ? 'Meta Cloud API (oficial)' : 'Z-API (WhatsApp pessoal)'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge />
                <Button variant="outline" size="sm" onClick={verificarConexao} disabled={verificandoStatus} className="h-8 gap-1.5">
                  <RefreshCw className={`h-3.5 w-3.5 ${verificandoStatus ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Verificar</span>
                </Button>
              </div>
            </div>

            {/* Seletor de provedor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Provedor</Label>
              <div className="flex gap-2">
                {(['zapi', 'meta'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, provedor: p }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      config.provedor === p
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {p === 'zapi' ? 'Z-API' : 'Meta Cloud API'}
                  </button>
                ))}
              </div>
            </div>

            {/* Z-API */}
            {config.provedor === 'zapi' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Instance ID</Label>
                    <Input
                      value={config.zapi_instance_id}
                      onChange={e => setConfig(c => ({ ...c, zapi_instance_id: e.target.value }))}
                      placeholder="Ex: 3DC14A2B95B3..."
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Token</Label>
                    <div className="relative">
                      <Input
                        type={mostrarToken ? 'text' : 'password'}
                        value={config.zapi_token}
                        onChange={e => setConfig(c => ({ ...c, zapi_token: e.target.value }))}
                        placeholder="Token da instância"
                        className="h-9 font-mono text-sm pr-10"
                      />
                      <button
                        onClick={() => setMostrarToken(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Crie sua instância em{' '}
                    <a href="https://z-api.io" target="_blank" rel="noreferrer" className="underline text-primary">z-api.io</a>
                    , escaneie o QR Code com seu celular e cole as credenciais acima.
                  </span>
                </div>
              </>
            )}

            {/* Meta Cloud API */}
            {config.provedor === 'meta' && (
              <>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Access Token</Label>
                    <div className="relative">
                      <Input
                        type={mostrarToken ? 'text' : 'password'}
                        value={config.meta_access_token}
                        onChange={e => setConfig(c => ({ ...c, meta_access_token: e.target.value }))}
                        placeholder="Token permanente do Meta for Developers"
                        className="h-9 font-mono text-sm pr-10"
                      />
                      <button
                        onClick={() => setMostrarToken(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone Number ID</Label>
                    <Input
                      value={config.meta_phone_number_id}
                      onChange={e => setConfig(c => ({ ...c, meta_phone_number_id: e.target.value }))}
                      placeholder="Ex: 123456789012345"
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do Template <span className="text-muted-foreground">(opcional)</span></Label>
                      <Input
                        value={config.meta_template_name}
                        onChange={e => setConfig(c => ({ ...c, meta_template_name: e.target.value }))}
                        placeholder="Ex: ebd_lembrete"
                        className="h-9 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Idioma do Template</Label>
                      <Input
                        value={config.meta_template_language}
                        onChange={e => setConfig(c => ({ ...c, meta_template_language: e.target.value }))}
                        placeholder="pt_BR"
                        className="h-9 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Como obter as credenciais</p>
                    <p>1. Acesse <span className="font-mono">developers.facebook.com</span> → seu app → WhatsApp → Configuração de API</p>
                    <p>2. Copie o <strong>Token de acesso permanente</strong> e o <strong>ID do número de telefone</strong></p>
                    <p className="mt-1 font-medium">Template (recomendado para notificações proativas)</p>
                    <p>Crie um template no Meta Business Manager com variáveis <span className="font-mono">{`{{1}}`}</span>–<span className="font-mono">{`{{5}}`}</span> para: professor, nº da aula, data, turma, tema.</p>
                    <p>Se não informar o template, envia texto livre (requer janela de 24h do destinatário).</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Card: Agendamento */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Agendamento</p>
                  <p className="text-[11px] text-muted-foreground">Quando enviar os lembretes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="toggle-ativo" className="text-xs text-muted-foreground">
                  {config.ativo ? 'Ativado' : 'Desativado'}
                </Label>
                <Switch
                  id="toggle-ativo"
                  checked={config.ativo}
                  onCheckedChange={v => setConfig(c => ({ ...c, ativo: v }))}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Dia de envio</Label>
                <Select value={String(config.dia_envio)} onValueChange={v => setConfig(c => ({ ...c, dia_envio: parseInt(v) }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Horário de envio</Label>
                <Input
                  type="time"
                  value={config.horario_envio}
                  onChange={e => setConfig(c => ({ ...c, horario_envio: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dia da aula</Label>
                <Select value={String(config.dia_aula)} onValueChange={v => setConfig(c => ({ ...c, dia_aula: parseInt(v) }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {config.ativo && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                Toda <strong>{DIAS_SEMANA.find(d => d.value === config.dia_envio)?.label}</strong> às{' '}
                <strong>{config.horario_envio}</strong>, os professores escalados para o próximo{' '}
                <strong>{DIAS_SEMANA.find(d => d.value === config.dia_aula)?.label}</strong> receberão o lembrete.
              </div>
            )}
          </div>

          {/* Card: Template */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Template da Mensagem</p>
                <p className="text-[11px] text-muted-foreground">Personalize o texto enviado</p>
              </div>
            </div>

            {/* Variáveis disponíveis */}
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS.map(v => (
                <button
                  key={v.var}
                  onClick={() => setConfig(c => ({ ...c, template: c.template + v.var }))}
                  title={`Inserir: ${v.desc}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-[11px] font-mono border cursor-pointer"
                >
                  {v.var}
                </button>
              ))}
              <span className="text-[11px] text-muted-foreground self-center ml-1">← clique para inserir</span>
            </div>

            {/* Editor e preview lado a lado */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Editar mensagem</Label>
                <textarea
                  value={config.template}
                  onChange={e => setConfig(c => ({ ...c, template: e.target.value }))}
                  rows={7}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder={TEMPLATE_PADRAO}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preview (exemplo)</Label>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 min-h-[140px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">N</div>
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">WhatsApp</span>
                  </div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: mensagemPreview
                        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                        .replace(/_(.*?)_/g, '<em>$1</em>')
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
              Use <code className="mx-1 px-1 bg-background rounded font-mono">*texto*</code> para negrito e
              <code className="mx-1 px-1 bg-background rounded font-mono">_texto_</code> para itálico no WhatsApp.
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={salvarConfig} disabled={salvandoConfig} className="gap-2">
              {salvandoConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {salvandoConfig ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA: PRÓXIMAS NOTIFICAÇÕES                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="proximas" className="space-y-4">

          {/* Navegação de semana */}
          <div className="flex items-center justify-between rounded-xl border bg-card p-3">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setDataAulaSelecionada(adicionarSemana(dataAulaSelecionada, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Aula do dia</p>
              <p className="font-semibold text-sm capitalize">{dataAulaSelecionada ? fmtDataExtenso(dataAulaSelecionada) : '—'}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setDataAulaSelecionada(adicionarSemana(dataAulaSelecionada, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Resumo */}
          {notificacoes.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border bg-card p-2.5">
                <p className="text-lg font-bold text-primary">{notificacoes.filter(n => !n.silenciado && n.telefone).length}</p>
                <p className="text-[11px] text-muted-foreground">A enviar</p>
              </div>
              <div className="rounded-xl border bg-card p-2.5">
                <p className="text-lg font-bold text-amber-500">{notificacoes.filter(n => n.silenciado).length}</p>
                <p className="text-[11px] text-muted-foreground">Silenciados</p>
              </div>
              <div className="rounded-xl border bg-card p-2.5">
                <p className="text-lg font-bold text-destructive">{notificacoes.filter(n => !n.telefone).length}</p>
                <p className="text-[11px] text-muted-foreground">Sem telefone</p>
              </div>
            </div>
          )}

          {/* Resultado do disparo */}
          {resultadoDisparo && (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 p-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{resultadoDisparo.enviados} mensagens enviadas</span>
                {resultadoDisparo.erros > 0 && <span className="text-destructive ml-2">· {resultadoDisparo.erros} erros</span>}
                {resultadoDisparo.silenciados > 0 && <span className="text-muted-foreground ml-2">· {resultadoDisparo.silenciados} silenciados</span>}
              </div>
            </div>
          )}

          {/* Lista de notificações */}
          {previewCarregando ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border bg-card">
              <CalendarDays className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-sm">Nenhuma escala para este dia</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione escalas na página de Escala de Professores</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notificacoes.map(n => (
                <div
                  key={`${n.professorId}-${n.turmaId}`}
                  className={`rounded-xl border bg-card p-3.5 transition-opacity ${n.silenciado ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {n.professorNome.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-sm">{n.professorNome}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${n.turmaCor} text-white`}>
                          Aula {n.aulaNum} · {n.turmaNome}
                        </span>
                        {n.mensagemPersonalizada && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-violet-400 text-violet-600 dark:text-violet-400">
                            Mensagem personalizada
                          </Badge>
                        )}
                      </div>
                      {n.telefone ? (
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />{n.telefoneMascarado}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 text-[11px] text-destructive mt-0.5">
                          <AlertCircle className="h-3 w-3" />Sem telefone cadastrado
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Preview mensagem */}
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver mensagem"
                        onClick={() => { setPreviewMsgNotif(n); setPreviewMsgDialogOpen(true) }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* Editar mensagem */}
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Personalizar mensagem"
                        onClick={() => { setEditNotif(n); setEditMensagem(n.mensagemPersonalizada ?? config.template); setEditDialogOpen(true) }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* Silenciar */}
                      <Button
                        variant="ghost" size="icon"
                        className={`h-8 w-8 ${n.silenciado ? 'text-amber-500' : 'text-muted-foreground'}`}
                        title={n.silenciado ? 'Reativar notificação' : 'Silenciar esta semana'}
                        onClick={() => toggleSilencio(n)}
                      >
                        {n.silenciado ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão Enviar Tudo */}
          {notificacoes.length > 0 && (
            <div className="pt-1">
              <Button
                className="w-full gap-2" size="lg"
                disabled={disparando || notificacoes.filter(n => !n.silenciado && n.telefone).length === 0}
                onClick={() => dispararNotificacoes()}
              >
                {disparando
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                  : <><Send className="h-4 w-4" />Enviar {notificacoes.filter(n => !n.silenciado && n.telefone).length} notificações agora</>
                }
              </Button>
              <p className="text-[11px] text-center text-muted-foreground mt-1.5">
                As mensagens serão enviadas via {config.provedor === 'meta' ? 'Meta Cloud API (WhatsApp Business)' : 'Z-API'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA: HISTÓRICO                                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="historico" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{logs.length} registros mais recentes</p>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={carregarLogs} disabled={logsCarregando}>
              <RefreshCw className={`h-3.5 w-3.5 ${logsCarregando ? 'animate-spin' : ''}`} />Atualizar
            </Button>
          </div>

          {logsCarregando ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border bg-card">
              <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-sm">Nenhum envio registrado</p>
              <p className="text-xs text-muted-foreground mt-1">O histórico aparecerá aqui após os primeiros envios</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              {logs.map((log, idx) => {
                const statusMap = {
                  enviado:     { label: 'Enviado',         bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
                  erro:        { label: 'Erro',            bg: 'bg-destructive/10',                     text: 'text-destructive',                       icon: XCircle      },
                  silenciado:  { label: 'Silenciado',      bg: 'bg-amber-100 dark:bg-amber-950/40',     text: 'text-amber-700 dark:text-amber-400',     icon: VolumeX      },
                  sem_telefone:{ label: 'Sem telefone',    bg: 'bg-muted',                              text: 'text-muted-foreground',                  icon: Phone        },
                }
                const s = statusMap[log.status] ?? statusMap.erro
                const Icon = s.icon
                const isOpen = logExpandido === log.id
                return (
                  <div key={log.id} className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                      onClick={() => setLogExpandido(isOpen ? null : log.id)}
                    >
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text} flex-shrink-0`}>
                        <Icon className="h-3 w-3" />{s.label}
                      </span>
                      <span className="flex-1 min-w-0 text-xs">
                        <span className="font-medium">{log.professores?.nome ?? '—'}</span>
                        <span className="text-muted-foreground ml-2">{log.turmas?.nome ?? '—'}</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {log.data_aula ? fmtDataCurta(log.data_aula) : '—'}
                        {log.criado_em && <span className="ml-2 opacity-70">{fmtDataHora(log.criado_em)}</span>}
                      </span>
                    </button>
                    {isOpen && (log.mensagem || log.erro) && (
                      <div className="px-4 pb-3">
                        {log.mensagem && (
                          <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] whitespace-pre-wrap leading-relaxed font-mono">
                            {log.mensagem}
                          </div>
                        )}
                        {log.erro && (
                          <p className="mt-1.5 text-[11px] text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />{log.erro}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Editar mensagem personalizada ─────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Mensagem para {editNotif?.professorNome}
            </DialogTitle>
            <DialogDescription>
              Somente para esta semana ({editNotif?.dataAula ? fmtDataCurta(editNotif.dataAula) : ''}).
              Deixe em branco para usar o template padrão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Variáveis */}
            <div className="flex flex-wrap gap-1">
              {VARIAVEIS.map(v => (
                <button
                  key={v.var}
                  onClick={() => setEditMensagem(m => m + v.var)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors font-mono border"
                >
                  {v.var}
                </button>
              ))}
            </div>
            <textarea
              value={editMensagem}
              onChange={e => setEditMensagem(e.target.value)}
              rows={6}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder={config.template}
            />
            <button
              className="text-xs text-muted-foreground underline"
              onClick={() => setEditMensagem('')}
            >
              Limpar e usar template padrão
            </button>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvarMensagemPersonalizada} disabled={salvandoEdit} className="gap-1.5">
              {salvandoEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Preview mensagem ───────────────────────────────────────── */}
      <Dialog open={previewMsgDialogOpen} onOpenChange={setPreviewMsgDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Mensagem para {previewMsgNotif?.professorNome}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3.5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-[11px] text-white font-bold">
                {previewMsgNotif?.professorNome.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">WhatsApp</span>
              {previewMsgNotif?.telefoneMascarado && (
                <span className="text-[10px] text-muted-foreground ml-auto">{previewMsgNotif.telefoneMascarado}</span>
              )}
            </div>
            <p
              className="text-sm whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: (previewMsgNotif?.mensagem ?? '')
                  .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                  .replace(/_(.*?)_/g, '<em>$1</em>')
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setPreviewMsgDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

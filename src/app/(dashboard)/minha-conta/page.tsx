"use client"

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  UserCircle, Shield, ShieldCheck, UserCheck, Lock, KeyRound, Loader2, Check, Pencil, Church, Layers,
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck, CalendarDays, BarChart3, UserCog, Eye,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { buscarMinhaConta, atualizarMeuNome, type MinhaConta } from '@/actions/minha-conta'
import { FormTrocaSenha } from '@/components/auth/FormTrocaSenha'
import { toast } from '@/lib/toast'

const MODULOS_INFO: Record<string, { label: string; icon: typeof Users }> = {
  dashboard:   { label: 'Dashboard',   icon: LayoutDashboard },
  alunos:      { label: 'Alunos',      icon: Users },
  professores: { label: 'Professores', icon: GraduationCap },
  turmas:      { label: 'Turmas',      icon: BookOpen },
  chamada:     { label: 'Chamada',     icon: ClipboardCheck },
  escala:      { label: 'Escala',      icon: CalendarDays },
  relatorios:  { label: 'Relatórios',  icon: BarChart3 },
  usuarios:    { label: 'Usuários',    icon: UserCog },
}

function formatarData(iso: string | null, comHora = false): string | null {
  if (!iso) return null
  try {
    return format(parseISO(iso), comHora ? "dd/MM/yyyy 'às' HH:mm" : 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return null
  }
}

export default function MinhaContaPage() {
  const { recarregarPerfil } = useAuth()

  const [conta, setConta] = useState<MinhaConta | null>(null)
  const [carregando, setCarregando] = useState(true)

  const [editandoNome, setEditandoNome] = useState(false)
  const [nome, setNome] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

  async function carregar() {
    try {
      const dados = await buscarMinhaConta()
      setConta(dados)
      setNome(dados.nome)
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao carregar seus dados.', 'error')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function salvarNome() {
    const limpo = nome.trim()
    if (!limpo) { toast('O nome não pode ficar em branco.', 'error'); return }
    if (limpo === conta?.nome) { setEditandoNome(false); return }
    setSalvandoNome(true)
    const res = await atualizarMeuNome(limpo)
    setSalvandoNome(false)
    if (!res.success) { toast(res.error ?? 'Erro ao salvar.', 'error'); return }
    setConta(c => c ? { ...c, nome: limpo } : c)
    setEditandoNome(false)
    toast('Nome atualizado!', 'success')
    recarregarPerfil() // atualiza o nome exibido na sidebar
  }

  function cancelarNome() {
    setEditandoNome(false)
    setNome(conta?.nome ?? '')
  }

  if (carregando) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }
  if (!conta) return null

  const iniciais = conta.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const funcao = conta.adminGeral
    ? { label: 'Administrador geral', icon: ShieldCheck, desc: 'Acesso total a todas as congregações.' }
    : conta.role === 'admin'
      ? { label: 'Administrador da congregação', icon: Shield, desc: 'Acesso total à sua congregação.' }
      : { label: 'Colaborador', icon: UserCheck, desc: 'Acesso aos módulos liberados abaixo.' }
  const FuncaoIcon = funcao.icon
  const senhaAlterada = formatarData(conta.senhaAlteradaEm, true)
  const criadoEm = formatarData(conta.criadoEm)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle className="h-7 w-7" />
          Minha Conta
        </h1>
        <p className="text-muted-foreground mt-1">Seus dados, acessos e segurança</p>
      </div>

      {/* ─── Dados da conta ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados da conta</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
              {iniciais}
            </div>
            <div className="min-w-0 space-y-1">
              <Badge className="gap-1" variant={conta.role === 'admin' ? 'default' : 'secondary'}>
                <FuncaoIcon className="h-3 w-3" />{funcao.label}
              </Badge>
              <p className="text-xs text-muted-foreground">{funcao.desc}</p>
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="mc-nome">Nome</Label>
            {editandoNome ? (
              <div className="flex gap-2">
                <Input
                  id="mc-nome"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  autoFocus
                  maxLength={120}
                  onKeyDown={e => {
                    if (e.key === 'Enter') salvarNome()
                    if (e.key === 'Escape') cancelarNome()
                  }}
                />
                <Button onClick={salvarNome} disabled={salvandoNome} size="icon" className="flex-shrink-0" aria-label="Salvar nome">
                  {salvandoNome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" className="flex-shrink-0 h-10" onClick={cancelarNome} disabled={salvandoNome}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{conta.nome}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditandoNome(true)} aria-label="Editar nome">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* E-mail */}
          <div className="space-y-2">
            <Label>E-mail (login)</Label>
            <div className="h-10 px-3 rounded-md border border-input bg-muted flex items-center gap-2 text-sm min-w-0">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{conta.email || '—'}</span>
            </div>
            <p className="text-xs text-muted-foreground">Para alterar o e-mail, peça a um administrador.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Church className="h-3.5 w-3.5" />Congregação</Label>
              <p className="text-sm">{conta.adminGeral ? 'Todas as congregações' : conta.congregacaoNome ?? '—'}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />Perfil de acesso</Label>
              <p className="text-sm">
                {conta.role === 'admin' ? 'Acesso total' : conta.perfilAcessoNome ?? 'Permissões personalizadas'}
              </p>
            </div>
          </div>

          {criadoEm && <p className="text-xs text-muted-foreground">Conta criada em {criadoEm}</p>}
        </CardContent>
      </Card>

      {/* ─── Acessos ─── */}
      {conta.role !== 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meus acessos</CardTitle>
            <p className="text-xs text-muted-foreground">Definidos por quem gerencia os usuários da sua congregação.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Módulos</Label>
              {conta.modulos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum módulo liberado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {conta.modulos.map(m => {
                    const info = MODULOS_INFO[m.modulo]
                    if (!info) return null
                    const Icon = info.icon
                    return (
                      <div key={m.modulo} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4 text-muted-foreground" />{info.label}
                        </span>
                        {m.nivel === 'ver' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded px-2 py-0.5 bg-amber-500/15 text-amber-600">
                            <Eye className="h-3 w-3" />Visualizar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded px-2 py-0.5 bg-green-500/15 text-green-600">
                            <Pencil className="h-3 w-3" />Editar
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {conta.modulos.some(m => m.modulo === 'chamada') && (
              <div className="space-y-2">
                <Label>Turmas liberadas na chamada</Label>
                {conta.turmas && conta.turmas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {conta.turmas.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma turma liberada.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Segurança ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Alterar senha
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {senhaAlterada ? `Última alteração em ${senhaAlterada}.` : 'Confirme a senha atual e escolha uma nova.'}
          </p>
        </CardHeader>
        <CardContent className="max-w-md">
          <FormTrocaSenha
            autoFocus={false}
            onSucesso={() => {
              toast('Senha alterada com sucesso!', 'success')
              setConta(c => c ? { ...c, senhaAlteradaEm: new Date().toISOString() } : c)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

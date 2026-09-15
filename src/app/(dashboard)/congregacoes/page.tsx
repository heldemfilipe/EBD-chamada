"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import {
  Plus, Church, Edit, Power, Trash2, Loader2, MapPin, BookOpen, Users, GraduationCap, UserCog, ArrowRightLeft,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  listarCongregacoes, salvarCongregacao, definirAtivaCongregacao, excluirCongregacao,
  type CongregacaoDetalhe,
} from '@/actions/congregacoes'
import { toast } from '@/lib/toast'

const FORM_VAZIO = { id: '', nome: '', cidade: '', observacoes: '' }

export default function CongregacoesPage() {
  const { isAdminGeral, congregacaoAtiva, trocarCongregacao, recarregarPerfil } = useAuth()

  const [lista, setLista] = useState<CongregacaoDetalhe[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [excluir, setExcluir] = useState<CongregacaoDetalhe | null>(null)

  useEffect(() => {
    if (isAdminGeral) carregar()
  }, [isAdminGeral])

  async function carregar() {
    setLoading(true)
    try {
      setLista(await listarCongregacoes())
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao carregar congregações.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function abrirNova() {
    setForm(FORM_VAZIO)
    setDialogOpen(true)
  }

  function abrirEditar(c: CongregacaoDetalhe) {
    setForm({ id: c.id, nome: c.nome, cidade: c.cidade ?? '', observacoes: c.observacoes ?? '' })
    setDialogOpen(true)
  }

  async function handleSalvar() {
    if (!form.nome.trim()) { toast('Informe o nome da congregação.', 'error'); return }
    setSaving(true)
    const res = await salvarCongregacao({
      id: form.id || undefined, nome: form.nome, cidade: form.cidade, observacoes: form.observacoes,
    })
    setSaving(false)
    if (!res.success) { toast(res.error ?? 'Erro ao salvar.', 'error'); return }
    toast(form.id ? 'Congregação atualizada.' : 'Congregação cadastrada.', 'success')
    setDialogOpen(false)
    await carregar()
    // Atualiza nomes/lista do seletor da sidebar (e define a ativa se era a primeira)
    await recarregarPerfil()
  }

  async function handleToggleAtiva(c: CongregacaoDetalhe) {
    const msg = c.ativa
      ? `Desativar "${c.nome}"? Todos os usuários desta congregação perderão o acesso até ela ser reativada.`
      : `Reativar "${c.nome}"?`
    if (!confirm(msg)) return
    const res = await definirAtivaCongregacao(c.id, !c.ativa)
    if (!res.success) { toast(res.error ?? 'Erro ao alterar status.', 'error'); return }
    await carregar()
    await recarregarPerfil()
  }

  async function handleExcluir() {
    if (!excluir) return
    const res = await excluirCongregacao(excluir.id)
    setExcluir(null)
    if (!res.success) { toast(res.error ?? 'Erro ao excluir.', 'error'); return }
    toast('Congregação excluída.', 'success')
    await carregar()
    await recarregarPerfil()
  }

  if (!isAdminGeral) return null

  const ativas = lista.filter(c => c.ativa).length
  const totalAlunos = lista.reduce((s, c) => s + c.total_alunos, 0)
  const totalUsuarios = lista.reduce((s, c) => s + c.total_usuarios, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Congregações</h1>
          <p className="text-muted-foreground mt-1">
            Cada congregação é um ambiente separado, com turmas, alunos, chamadas e usuários próprios.
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Congregação
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard title="Congregações ativas" value={ativas} icon={Church} description={`${lista.length} cadastrada(s)`} />
        <StatCard title="Alunos (todas)" value={totalAlunos} icon={Users} description="Alunos ativos" />
        <StatCard title="Usuários vinculados" value={totalUsuarios} icon={UserCog} description="Sem contar admins gerais" className="col-span-2 lg:col-span-1" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : lista.length === 0 ? (
        <Card><CardContent><EmptyState icon={Church} message="Nenhuma congregação cadastrada ainda." /></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map(c => {
            const selecionada = congregacaoAtiva?.id === c.id
            return (
              <Card key={c.id} className={`${!c.ativa ? 'opacity-60' : ''} ${selecionada ? 'border-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Church className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{c.nome}</span>
                      </CardTitle>
                      {c.cidade && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{c.cidade}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {c.ativa
                        ? <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">Ativa</Badge>
                        : <Badge variant="outline" className="text-xs text-muted-foreground">Inativa</Badge>}
                      {selecionada && <Badge variant="secondary" className="text-[10px]">Visualizando</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { icon: BookOpen, label: 'Turmas', valor: c.total_turmas },
                      { icon: Users, label: 'Alunos', valor: c.total_alunos },
                      { icon: GraduationCap, label: 'Prof.', valor: c.total_professores },
                      { icon: UserCog, label: 'Usuários', valor: c.total_usuarios },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg bg-muted/50 py-2">
                        <item.icon className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                        <p className="text-sm font-bold mt-0.5">{item.valor}</p>
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  {c.observacoes && <p className="text-xs text-muted-foreground line-clamp-2">{c.observacoes}</p>}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selecionada}
                      onClick={() => trocarCongregacao(c.id)}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                      {selecionada ? 'Selecionada' : 'Acessar'}
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEditar(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        title={c.ativa ? 'Desativar' : 'Reativar'}
                        className={c.ativa ? 'hover:text-destructive' : 'hover:text-green-600'}
                        onClick={() => handleToggleAtiva(c)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" className="hover:text-destructive" onClick={() => setExcluir(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Criar / editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar Congregação' : 'Nova Congregação'}</DialogTitle>
            <DialogDescription>
              {form.id ? 'Atualize os dados da congregação.' : 'A nova congregação começa sem dados — cadastre depois as turmas e os usuários dela.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Congregação Vila Nova" />
            </div>
            <div className="space-y-2">
              <Label>Cidade / Bairro</Label>
              <Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={v => { if (!v) setExcluir(null) }}
        title="Excluir Congregação"
        description={<>Excluir <strong>{excluir?.nome}</strong>? Só é possível excluir congregações sem nenhum dado vinculado; caso contrário, desative-a.</>}
        onConfirm={handleExcluir}
      />
    </div>
  )
}

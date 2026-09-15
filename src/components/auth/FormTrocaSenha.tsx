"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react'

/** Formulário de troca da própria senha (usado na tela obrigatória e em Minha Conta). */
export function FormTrocaSenha({ onSucesso, rodape, autoFocus = true }: { onSucesso: () => void; rodape?: React.ReactNode; autoFocus?: boolean }) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!senhaAtual) { setErro('Informe a senha atual.'); return }
    if (novaSenha.length < 6) { setErro('A nova senha deve ter pelo menos 6 caracteres.'); return }
    if (novaSenha !== confirmar) { setErro('A confirmação não confere com a nova senha.'); return }
    if (novaSenha === senhaAtual) { setErro('A nova senha deve ser diferente da senha atual.'); return }

    setSalvando(true)
    try {
      const res = await fetch('/api/auth/trocar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(data.error || 'Não foi possível alterar a senha.')
        return
      }
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('')
      onSucesso()
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ts-atual">Senha atual</Label>
        <Input
          id="ts-atual"
          type={mostrar ? 'text' : 'password'}
          value={senhaAtual}
          onChange={e => setSenhaAtual(e.target.value)}
          placeholder="A senha que você usou para entrar"
          autoComplete="current-password"
          autoFocus={autoFocus}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ts-nova">Nova senha</Label>
        <div className="relative">
          <Input
            id="ts-nova"
            type={mostrar ? 'text' : 'password'}
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setMostrar(m => !m)}
            tabIndex={-1}
            aria-label={mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ts-conf">Confirmar nova senha</Label>
        <Input
          id="ts-conf"
          type={mostrar ? 'text' : 'password'}
          value={confirmar}
          onChange={e => setConfirmar(e.target.value)}
          placeholder="Repita a nova senha"
          autoComplete="new-password"
        />
      </div>

      {erro && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <Button type="submit" disabled={salvando} className="w-full">
        {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
        {salvando ? 'Salvando...' : 'Salvar nova senha'}
      </Button>

      {rodape}
    </form>
  )
}

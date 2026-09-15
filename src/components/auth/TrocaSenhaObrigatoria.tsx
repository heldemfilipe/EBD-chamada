"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/lib/toast'
import { FormTrocaSenha } from './FormTrocaSenha'

/**
 * Tela bloqueante exibida quando o usuário deve definir uma nova senha
 * (`perfis.deve_trocar_senha`). Ele não acessa o sistema até trocar ou sair.
 */
export function TrocaSenhaObrigatoria() {
  const { perfil, concluirTrocaSenha, signOut } = useAuth()
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)

  async function sair() {
    setSaindo(true)
    try {
      await signOut()
    } finally {
      router.replace('/login')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Defina uma nova senha</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {perfil?.nome ? `Olá, ${perfil.nome.split(' ')[0]}! ` : ''}
              Por segurança, troque a senha que você recebeu antes de continuar.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-xl shadow-black/10 p-6 sm:p-8">
          <FormTrocaSenha
            onSucesso={() => {
              toast('Senha alterada com sucesso!', 'success')
              concluirTrocaSenha()
            }}
            rodape={
              <button
                type="button"
                onClick={sair}
                disabled={saindo}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1 disabled:opacity-50"
              >
                {saindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                Sair
              </button>
            }
          />
        </div>
      </div>
    </div>
  )
}

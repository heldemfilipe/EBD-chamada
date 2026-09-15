"use client"

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { FormTrocaSenha } from './FormTrocaSenha'

/** Troca voluntária da própria senha (menu do usuário na sidebar). */
export function AlterarSenhaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>Confirme a senha atual e escolha uma nova.</DialogDescription>
        </DialogHeader>
        {open && (
          <FormTrocaSenha
            onSucesso={() => {
              toast('Senha alterada com sucesso!', 'success')
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

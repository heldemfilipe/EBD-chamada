"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NovoVisitante {
  nome: string
  telefone: string
  observacao: string
}

interface AdicionarVisitanteDialogProps {
  open: boolean
  onClose: () => void
  novoVisitante: NovoVisitante
  onChange: (dados: NovoVisitante) => void
  onAdicionar: () => void
}

export function AdicionarVisitanteDialog({
  open,
  onClose,
  novoVisitante,
  onChange,
  onAdicionar,
}: AdicionarVisitanteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Visitante</DialogTitle>
          <DialogDescription>Preencha os dados do visitante</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome-visitante">Nome *</Label>
            <Input
              id="nome-visitante"
              placeholder="Nome completo"
              value={novoVisitante.nome}
              onChange={(e) => onChange({ ...novoVisitante, nome: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone-visitante">Telefone</Label>
            <Input
              id="telefone-visitante"
              placeholder="(00) 00000-0000"
              value={novoVisitante.telefone}
              onChange={(e) => onChange({ ...novoVisitante, telefone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao-visitante">Observação</Label>
            <Textarea
              id="observacao-visitante"
              placeholder="Ex: Convidado por..."
              rows={3}
              value={novoVisitante.observacao}
              onChange={(e) => onChange({ ...novoVisitante, observacao: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onAdicionar}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

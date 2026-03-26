"use client"

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Download, FileText, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

type FormatoExport = 'pdf' | 'excel' | 'csv'

interface ExportSecoes {
  resumo: boolean; grafico: boolean; porSala: boolean
  alunosTurma: boolean; topAlunos: boolean; atencao: boolean; professores: boolean; visitantesRelatorio: boolean
}
interface ExportCampos {
  presenca: boolean; faltas: boolean; visitantes: boolean
  biblias: boolean; revistas: boolean; oferta: boolean
}

interface ExportDialogProps {
  open: boolean
  onClose: (open: boolean) => void
  formato: FormatoExport
  setFormato: (f: FormatoExport) => void
  secoes: ExportSecoes
  setSecoes: (fn: (s: ExportSecoes) => ExportSecoes) => void
  campos: ExportCampos
  setCampos: (fn: (c: ExportCampos) => ExportCampos) => void
  onExportar: () => void
  labelRelatorio: string
  turmaFiltro: string
}

export function ExportDialog({
  open, onClose, formato, setFormato, secoes, setSecoes, campos, setCampos, onExportar, labelRelatorio, turmaFiltro,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar Relatório</DialogTitle>
          <DialogDescription>{labelRelatorio}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Formato */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Formato</p>
            <div className="flex gap-2">
              {([
                ['pdf',   'PDF',        <FileText key="pdf" className="h-4 w-4" />],
                ['excel', 'Excel .xlsx', <BarChart3 key="excel" className="h-4 w-4" />],
                ['csv',   'CSV',         <Download key="csv" className="h-4 w-4" />],
              ] as const).map(([val, label, icon]) => (
                <button
                  key={val}
                  onClick={() => setFormato(val)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all flex-1 justify-center',
                    formato === val
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground hover:bg-muted border-border'
                  )}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
            {formato === 'pdf' && (
              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                <span className="mt-0.5 text-blue-500">ℹ</span>
                O PDF imprime as seções selecionadas abaixo. Abre o diálogo de impressão do sistema.
              </p>
            )}
          </div>

          {/* Seções */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Seções incluídas</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['resumo',     'Resumo / KPIs'],
                ['grafico',    'Gráfico de evolução'],
                ['porSala',    'Presença por sala'],
                ...(turmaFiltro !== 'all' ? [['alunosTurma', 'Lista de alunos da turma'] as const] : []),
                ['topAlunos',  'Top 10 alunos'],
                ['atencao',    'Alunos em atenção'],
                ['professores','Desempenho professores'],
                ['visitantesRelatorio', 'Visitantes'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSecoes(s => ({ ...s, [key]: !s[key] }))}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left',
                    secoes[key]
                      ? 'bg-primary/10 text-primary border-primary/40 font-medium'
                      : 'text-muted-foreground hover:bg-muted border-border'
                  )}
                >
                  <span className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    secoes[key] ? 'bg-primary border-primary' : 'border-muted-foreground/40')}>
                    {secoes[key] && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Campos (Excel/CSV apenas) */}
          {formato !== 'pdf' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Campos incluídos
              </p>
              <div className="flex flex-wrap gap-2">
                {([
                  ['presenca',   'Presença %'],
                  ['faltas',     'Faltas'],
                  ['visitantes', 'Visitantes'],
                  ['biblias',    'Bíblias'],
                  ['revistas',   'Revistas'],
                  ['oferta',     'Oferta R$'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setCampos(s => ({ ...s, [key]: !s[key] }))}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                      campos[key]
                        ? 'bg-primary/10 text-primary border-primary/40'
                        : 'text-muted-foreground hover:bg-muted border-border line-through opacity-60'
                    )}
                  >
                    {campos[key] && <span className="text-primary text-[10px]">✓</span>}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
          <Button
            onClick={onExportar}
            disabled={!Object.values(secoes).some(Boolean)}
          >
            {formato === 'pdf'   && <><FileText className="h-4 w-4 mr-2" />Imprimir PDF</>}
            {formato === 'excel' && <><BarChart3 className="h-4 w-4 mr-2" />Gerar Excel</>}
            {formato === 'csv'   && <><Download className="h-4 w-4 mr-2" />Baixar CSV</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

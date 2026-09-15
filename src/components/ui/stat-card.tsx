import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type LucideIcon, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  description?: string
  className?: string
  valueClassName?: string
  /** Variação em relação ao período anterior (ex.: pontos percentuais) */
  tendencia?: { valor: number; sufixo?: string; referencia: string } | null
}

export function StatCard({ title, value, icon: Icon, description, className, valueClassName, tendencia }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={`text-xl sm:text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
        {tendencia ? (
          <p className={cn(
            'text-xs flex items-center gap-0.5',
            tendencia.valor > 0 ? 'text-green-600' : tendencia.valor < 0 ? 'text-red-600' : 'text-muted-foreground',
          )}>
            {tendencia.valor > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : tendencia.valor < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {tendencia.valor > 0 ? '+' : ''}{tendencia.valor}{tendencia.sufixo ?? ''}
            <span className="text-muted-foreground ml-1">vs {tendencia.referencia}</span>
          </p>
        ) : description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

import { corBarraPresenca } from '@/lib/presence'
import { cn } from '@/lib/utils'

interface PresenceBarProps {
  pct: number
  presentes?: number
  total?: number
  showLabel?: boolean
  className?: string
}

export function PresenceBar({ pct, presentes, total, showLabel = false, className }: PresenceBarProps) {
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-primary">{pct}%</span>
          {presentes !== undefined && total !== undefined && (
            <span className="text-[10px] text-muted-foreground">{presentes}/{total}</span>
          )}
        </div>
      )}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', corBarraPresenca(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

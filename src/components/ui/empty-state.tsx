import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  message: string
  icon?: LucideIcon
  className?: string
  minHeight?: string
}

export function EmptyState({ message, icon: Icon, className, minHeight = 'h-[200px]' }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm', minHeight, className)}>
      {Icon && <Icon className="h-8 w-8 opacity-40" />}
      <span>{message}</span>
    </div>
  )
}

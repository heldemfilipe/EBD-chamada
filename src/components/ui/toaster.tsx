"use client"

import { useEffect, useState } from 'react'
import { ToastItem, dismissToast, subscribeToasts } from '@/lib/toast'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 w-full max-w-[340px] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl pointer-events-auto',
            'animate-in slide-in-from-right-4 fade-in duration-300',
            t.type === 'success' && 'bg-card border-green-500/40 text-green-600 dark:text-green-400',
            t.type === 'error'   && 'bg-card border-red-500/40 text-red-600 dark:text-red-400',
            t.type === 'info'    && 'bg-card border-blue-500/40 text-blue-600 dark:text-blue-400',
          )}
        >
          {t.type === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />}
          {t.type === 'error'   && <XCircle       className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />}
          {t.type === 'info'    && <Info           className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />}
          <span className="text-sm font-medium flex-1 text-foreground">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

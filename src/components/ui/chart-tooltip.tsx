'use client'

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number | string; color: string }>
  label?: string
  /** Se true, adiciona sufixo "%" em valores numéricos de campos com "%" no nome */
  formatPct?: boolean
  /** Se true, adiciona prefixo "R$ " em valores numéricos de campos com "R$" no nome */
  formatCurrency?: boolean
}

/**
 * Tooltip reutilizável para gráficos Recharts.
 * Uso: <Tooltip content={<ChartTooltip />} />
 */
export function ChartTooltip({ active, payload, label, formatPct = true, formatCurrency = true }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-popover border rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
      {label && <p className="font-semibold mb-2 border-b pb-1">{label}</p>}
      {payload.map((p) => {
        let displayValue: string = String(p.value)
        if (typeof p.value === 'number') {
          if (formatPct && p.name.includes('%')) displayValue = `${p.value}%`
          else if (formatCurrency && p.name.includes('R$')) displayValue = `R$ ${p.value.toFixed(2)}`
          else displayValue = String(p.value)
        }
        return (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-bold">{displayValue}</span>
          </div>
        )
      })}
    </div>
  )
}

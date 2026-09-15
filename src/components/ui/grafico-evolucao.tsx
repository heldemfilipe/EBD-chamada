'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { EmptyState } from '@/components/ui/empty-state'
import type { PontoEvolucao } from '@/lib/relatorio-utils'

// Evolução de presença: barras = quantidade de presentes (eixo esquerdo),
// linha = % de presença (eixo direito, 0–100). Pontos sem chamada ficam em branco.

function TooltipEvolucao({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload as PontoEvolucao
  return (
    <div className="bg-popover border rounded-xl shadow-lg px-4 py-3 text-sm min-w-[170px]">
      <p className="font-semibold mb-2 border-b pb-1">{label}</p>
      {p.total > 0 ? (
        <>
          <div className="flex justify-between gap-4"><span className="text-indigo-500">Presentes</span><span className="font-bold">{p.presentes} de {p.total}</span></div>
          <div className="flex justify-between gap-4"><span className="text-green-600">Presença</span><span className="font-bold">{p.pct}%</span></div>
        </>
      ) : (
        <p className="text-muted-foreground">Sem chamada</p>
      )}
    </div>
  )
}

export function GraficoEvolucao({ dados, altura = 'h-[220px] sm:h-[280px] xl:h-[320px]' }: { dados: PontoEvolucao[]; altura?: string }) {
  if (dados.length === 0 || dados.every(d => d.total === 0)) {
    return <EmptyState message="Sem dados para o período selecionado" minHeight={altura} />
  }
  return (
    <div className={altura}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
          <XAxis dataKey="periodo" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="qtd" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip content={<TooltipEvolucao />} cursor={{ fill: 'currentColor', fillOpacity: 0.04 }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar yAxisId="qtd" dataKey="presentes" name="Presentes" fill="#6366f1" fillOpacity={0.75} radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={600} />
          <Line yAxisId="pct" type="monotone" dataKey="pct" name="Presença %" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 5 }} connectNulls={false} animationDuration={600} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

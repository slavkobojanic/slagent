import { Area, AreaChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts"
import type { UsageCumulative } from "@shared/types"
import { formatCost } from "@/lib/format"

export type SpendChartProps = {
  points: UsageCumulative[]
}

// Lifetime spend as a cumulative area line.
export function SpendChart({ points }: SpendChartProps) {
  // Recharts freezes its data through redux-toolkit/immer, and MobX observables cannot be frozen.
  const data = points.map((point) => ({ day: point.day, cost: point.cost }))
  return (
    <div className="h-40 w-full" role="img" aria-label="Cumulative spend over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="day" tickFormatter={monthLabel} tickLine={false} axisLine={false} minTickGap={48} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatCost} tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11 }} />
          <ChartTooltip formatter={(value) => [formatCost(Number(value)), "Spent to date"]} labelFormatter={(day) => String(day)} />
          <Area type="monotone" dataKey="cost" stroke="var(--color-info)" fill="var(--color-info)" fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function monthLabel(day: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const month = Number(day.slice(5, 7))
  return months[month - 1] ?? day
}
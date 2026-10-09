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
          <ChartTooltip
            cursor={{ stroke: "var(--color-border)" }}
            content={ChartTooltipContent}
          />
          <Area type="monotone" dataKey="cost" stroke="var(--color-info)" fill="var(--color-info)" fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function monthLabel(day: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const month = Number(day.slice(5, 7))
  return `${months[month - 1] ?? ""} ${Number(day.slice(8, 10))}, ${day.slice(0, 4)}`
}

// The shadcn tooltip look (no border); recharts needs a content renderer to get there.
function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: readonly { value?: unknown }[]; label?: string | number }) {
  if (!active || !payload?.[0]) return null
  const value = payload[0].value
  const cost = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0
  return (
    <div className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background">
      <p className="font-medium">{monthLabel(String(label))}</p>
      <p className="text-background/80">Spent to date: {formatCost(cost)}</p>
    </div>
  )
}
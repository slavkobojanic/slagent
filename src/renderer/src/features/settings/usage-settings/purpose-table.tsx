import type { UsageStats } from "@shared/types"
import { formatCost, formatTokens } from "@/lib/format"

type UsagePurpose = UsageStats["purposes"][number]["purpose"]

const PURPOSE_LABELS: Record<UsagePurpose, string> = {
  agent: "Agent coding",
  naming: "Chat naming",
  labels: "Step labels",
  commit: "Commit messages",
  skill: "Skill drafts",
}

export type PurposeTableProps = {
  purposes: UsageStats["purposes"]
  totalCost: number
}

export function PurposeTable({ purposes, totalCost }: PurposeTableProps) {
  const rows = purposes.filter((row) => row.turns > 0)
  if (rows.length === 0) return <p className="text-xs text-white/50">Nothing recorded yet.</p>
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-white/40">
          <th className="py-1 font-normal">Purpose</th>
          <th className="py-1 text-right font-normal">Tokens</th>
          <th className="py-1 text-right font-normal">Cost</th>
          <th className="py-1 text-right font-normal">Turns</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.purpose} className="border-t border-white/5">
            <td className="py-1 text-white/80">
              {PURPOSE_LABELS[row.purpose] ?? row.purpose}
              {totalCost > 0 ? <span className="text-white/40"> · {Math.round((row.cost / totalCost) * 100)}%</span> : null}
            </td>
            <td className="py-1 text-right text-white/60">{formatTokens(row.tokens)}</td>
            <td className="py-1 text-right text-white/80">{formatCost(row.cost)}</td>
            <td className="py-1 text-right text-white/60">{row.turns}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

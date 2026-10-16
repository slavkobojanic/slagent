import type { MuseSubscriptionUsage } from "@shared/types"

// The Muse subscription's rolling usage windows. Meta reports percentages, not
// dollars, so the bars show quota burn; over-quota values above 100 are valid.
function windowLabel(mins?: number): string {
  if (!mins) return "current window"
  const hours = mins / 60
  return hours === 1 ? "1 hour window" : `${Math.round(hours)} hour window`
}

function resetsAt(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function Bar({ label, usedPercent, resetsAtMs, suffix }: { label: string; usedPercent: number; resetsAtMs: number; suffix?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-white/70">
          {label}
          {suffix ? <span className="text-white/40"> · {suffix}</span> : null}
        </span>
        <span className="tabular-nums text-white/60">
          {Math.round(usedPercent)}% · resets {resetsAt(resetsAtMs)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={usedPercent >= 100 ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-muse-brand"}
          style={{ width: `${Math.min(100, usedPercent)}%` }}
        />
      </div>
    </div>
  )
}

export function MuseUsage({ usage }: { usage: MuseSubscriptionUsage }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">Muse subscription</h3>
        <span className="text-xs text-white/40" title={new Date(usage.observedAtMs).toLocaleString()}>
          as of {new Date(usage.observedAtMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
      <p className="text-xs text-white/50">Tier: {usage.tier}. The subscription pays, so Muse chats add no cost.</p>
      <Bar label="Weekly block" usedPercent={usage.weekly.usedPercent} resetsAtMs={usage.weekly.resetsAtMs} />
      <Bar
        label={windowLabel(usage.window.windowDurationMins)}
        usedPercent={usage.window.usedPercent}
        resetsAtMs={usage.window.resetsAtMs}
      />
    </section>
  )
}

import { makeAutoObservable } from "mobx"
import { formatCost, formatTokens } from "@/lib/format"
import type { UsageState, UsageTotals } from "@shared/types"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"

export type UsageLevel = "normal" | "warning" | "critical"

export type UsageModel = {
  ringPercent: number
  level: UsageLevel
  percentText: string
  costText: string | null
  ariaLabel: string
  contextText: string
  thisChatText: string
  tokensText: string
  allChatsText: string | null
  canCompact: boolean
}

export class UsageMeterStore {
  error: string | null = null

  constructor(
    private readonly run: RunStore,
    private readonly meta: MetaStore,
  ) {
    makeAutoObservable(this)
  }

  get visible(): boolean {
    return this.run.usage !== null
  }

  // Summarizing rewrites the chat, so it waits until the run that is writing it has ended.
  get canCompact(): boolean {
    return !this.run.streaming
  }

  get model(): UsageModel | null {
    const usage = this.run.usage
    if (usage === null) {
      return null
    }
    return toModel(usage, this.meta.meta?.usageTotals ?? null, this.canCompact)
  }

  setError(message: string | null) {
    this.error = message
  }
}

function toModel(usage: UsageState, totals: UsageTotals | null, canCompact: boolean): UsageModel {
  const contextText = contextLabel(usage)
  return {
    ringPercent: Math.min(usage.percent ?? 0, 100),
    level: levelFor(usage.percent ?? 0),
    percentText: percentLabel(usage.percent),
    costText: usage.cost > 0 ? formatCost(usage.cost) : null,
    ariaLabel: `${contextText}, ${formatCost(usage.cost)} spent`,
    contextText,
    thisChatText: `This chat: ${formatTokens(usage.totalTokens)} tokens · ${formatCost(usage.cost)}`,
    tokensText: `${formatTokens(usage.inputTokens)} in · ${formatTokens(usage.outputTokens)} out · ${formatTokens(usage.cacheTokens)} cached`,
    allChatsText: allChatsLabel(totals),
    canCompact,
  }
}

function levelFor(percent: number): UsageLevel {
  if (percent >= 90) {
    return "critical"
  }
  if (percent >= 70) {
    return "warning"
  }
  return "normal"
}

function percentLabel(percent: number | null): string {
  if (percent === null) {
    return "–"
  }
  return `${Math.round(percent)}%`
}

function contextLabel(usage: UsageState): string {
  if (usage.contextTokens === null) {
    return "Context not measured yet"
  }
  return `${formatTokens(usage.contextTokens)} of ${formatTokens(usage.contextWindow)} context`
}

function allChatsLabel(totals: UsageTotals | null): string | null {
  if (totals === null || totals.chats <= 0) {
    return null
  }
  return `All chats: ${formatTokens(totals.tokens)} tokens · ${formatCost(totals.cost)}`
}


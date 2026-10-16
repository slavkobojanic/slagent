import type { Usage } from "@earendil-works/pi-ai"
import type { TokenUsage } from "@muse-code/sdk/dist/src/msp.js"

const ZERO: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
}

// The Muse subscription pays per month, not per token, so the cost legs stay 0
// and only the token counters are meaningful.
export function turnUsage(usage: TokenUsage | undefined): Usage {
  if (!usage) return { ...ZERO, cost: { ...ZERO.cost } }
  const input = usage.inputTokens ?? 0
  const output = usage.outputTokens ?? 0
  const cacheRead = usage.cacheReadTokens ?? usage.cachedTokens ?? 0
  const cacheWrite = usage.cacheWriteTokens ?? 0
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    ...(usage.reasoningTokens ? { reasoning: usage.reasoningTokens } : {}),
    totalTokens: input + output + cacheRead + cacheWrite,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  }
}

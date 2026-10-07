import type { AppMeta, OpenRouterStatus } from "@shared/types"

const EMPTY_STATUS: OpenRouterStatus = { configured: false, source: null, type: null, envKey: false }

export function openRouterStatusOf(meta: AppMeta | null): OpenRouterStatus {
  return meta?.openRouter ?? EMPTY_STATUS
}

// A key from the environment belongs to the user's shell, so it cannot be removed.
export function canRemoveSavedKey(status: OpenRouterStatus): boolean {
  if (!status.configured || status.source === "OPENROUTER_API_KEY") {
    return false
  }
  return true
}

export function authFilePath(agentDir: string | undefined): string {
  return `${agentDir ?? ""}/auth.json`
}

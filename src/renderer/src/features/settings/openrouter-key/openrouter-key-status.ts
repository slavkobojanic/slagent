import type { OpenRouterStatus } from "@shared/types"

// A saved key can be removed. A key from the environment belongs to the user's shell, so it cannot.
export function canRemoveSavedKey(status: OpenRouterStatus): boolean {
  if (!status.configured || status.source === "OPENROUTER_API_KEY") {
    return false
  }
  return true
}

// Where Pi keeps its credentials. The form shows this path under the key field.
export function authFilePath(agentDir: string | undefined): string {
  return `${agentDir ?? ""}/auth.json`
}

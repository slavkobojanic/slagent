import type { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"

const KEY = "slagent:prompt-history"

// Loads and saves sent prompts in localStorage. History is a convenience, so a full or blocked store is fine.
export class PromptHistoryPresenter {
  constructor(
    private readonly store: PromptHistoryStore,
    private readonly storage: Pick<Storage, "getItem" | "setItem">,
  ) {}

  start = () => {
    this.store.replace(this.load())
  }

  remember = (text: string) => {
    if (!this.store.remember(text)) {
      return
    }
    this.persist()
  }

  private load = (): string[] => {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(KEY) ?? "[]")
      if (!Array.isArray(parsed)) {
        return []
      }
      return parsed.filter((item): item is string => typeof item === "string")
    } catch {
      return []
    }
  }

  private persist = () => {
    try {
      this.storage.setItem(KEY, JSON.stringify(this.store.items))
    } catch {
      // History is a convenience; a full or blocked store is fine.
    }
  }
}

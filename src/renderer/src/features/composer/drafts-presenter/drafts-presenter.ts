import type { DraftsStore } from "@/features/composer/drafts-store/drafts-store"

const KEY = "slagent:composer-drafts"

// Loads and saves unsent prompts in localStorage. Drafts are a convenience, so a full or blocked store is fine.
export class DraftsPresenter {
  constructor(
    private readonly store: DraftsStore,
    private readonly storage: Pick<Storage, "getItem" | "setItem">,
  ) {}

  start = () => {
    this.store.replace(this.load())
  }

  save = (key: string, text: string) => {
    if (!this.store.write(key, text)) {
      return
    }
    this.persist()
  }

  clear = (key: string) => {
    this.save(key, "")
  }

  private load = (): Record<string, string> => {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(KEY) ?? "{}")
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {}
      }
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    } catch {
      return {}
    }
  }

  private persist = () => {
    try {
      this.storage.setItem(KEY, JSON.stringify(this.store.drafts))
    } catch {
      // Drafts are a convenience; a full or blocked store is fine.
    }
  }
}

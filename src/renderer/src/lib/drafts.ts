// Per-chat composer drafts, so an unfinished prompt survives navigation
// between chats and projects.
const KEY = "slagent:composer-drafts"
const LIMIT = 100

let cache: Record<string, string> | null = null

function load(): Record<string, string> {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}")
    cache = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, string>) : {}
  } catch {
    cache = {}
  }
  return cache
}

function store(drafts: Record<string, string>): void {
  cache = drafts
  try {
    localStorage.setItem(KEY, JSON.stringify(drafts))
  } catch {
    // Drafts are a convenience; a full or blocked store is fine.
  }
}

export function readDraft(key: string): string {
  const draft = load()[key]
  return typeof draft === "string" ? draft : ""
}

export function saveDraft(key: string, text: string): void {
  const drafts = load()
  if (!text.trim()) {
    if (key in drafts) {
      delete drafts[key]
      store(drafts)
    }
    return
  }
  drafts[key] = text
  const keys = Object.keys(drafts)
  if (keys.length > LIMIT) {
    for (const stale of keys.slice(0, keys.length - LIMIT)) delete drafts[stale]
  }
  store(drafts)
}

export function clearDraft(key: string): void {
  saveDraft(key, "")
}

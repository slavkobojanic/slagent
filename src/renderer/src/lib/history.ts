const KEY = "slagent:prompt-history"
const LIMIT = 200

let cache: string[] | null = null

export function promptHistory(): string[] {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    if (Array.isArray(parsed)) cache = parsed.filter((item): item is string => typeof item === "string")
    else cache = []
  } catch {
    cache = []
  }
  return cache
}

// Newest last, without duplicates, so ↑ walks back from the end.
export function rememberPrompt(text: string): void {
  const trimmed = text.trim()
  if (!trimmed) return
  const next = promptHistory().filter((item) => item !== trimmed)
  next.push(trimmed)
  cache = next.slice(-LIMIT)
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // History is a convenience; a full or blocked store is fine.
  }
}

export function searchHistory(query: string): string[] {
  const needle = query.trim().toLowerCase()
  const items = [...promptHistory()].reverse()
  if (!needle) return items.slice(0, 50)
  return items.filter((item) => item.toLowerCase().includes(needle)).slice(0, 50)
}

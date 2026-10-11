import { EDITOR_PACKS } from "@shared/editor"

export type PackRow = {
  id: string
  label: string
  languages: string
  enabled: boolean
}

// The settings list: every known pack, in registry order, with whether it is switched on.
export function packRows(enabled: string[]): PackRow[] {
  const on = new Set(enabled)
  return EDITOR_PACKS.map((pack) => ({ id: pack.id, label: pack.label, languages: pack.languages, enabled: on.has(pack.id) }))
}

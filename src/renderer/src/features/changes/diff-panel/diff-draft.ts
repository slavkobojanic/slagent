import type { DiffComment } from "@shared/types"

export type DiffDraft = {
  path: string
  side: DiffComment["side"]
  line: number
}

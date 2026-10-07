import type { DiffComment } from "@shared/types"

// A comment box open under one line of a diff. It lives in the diff store until it is saved or cancelled.
export type DiffDraft = {
  path: string
  side: DiffComment["side"]
  line: number
}

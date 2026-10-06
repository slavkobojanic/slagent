import type { SlagentApi } from "@shared/types"

declare global {
  interface Window {
    slagent: SlagentApi
  }
}

export {}

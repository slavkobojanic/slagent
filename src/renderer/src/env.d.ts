import type { SlagentApi } from "@shared/types"

declare global {
  interface Window {
    slagent?: SlagentApi
    URL: typeof URL
    FileReader: typeof FileReader
    console: Console
  }
}

export {}

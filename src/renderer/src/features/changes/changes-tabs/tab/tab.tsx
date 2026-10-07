import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type TabProps = {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export function Tab({ active, onClick, children }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs", active ? "bg-white/10 text-white" : "text-white/60 hover:text-white")}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

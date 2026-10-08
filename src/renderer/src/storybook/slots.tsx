import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Slot props in this codebase are ComponentType values (e.g. `Menu: ComponentType<{ chat: ChatSummary }>`).
// A no-argument placeholder is assignable to any of them, so a story can pass `slot("Menu")`.
export function slot(label: string) {
  return function SlotPlaceholder() {
    return (
      <span className="inline-flex items-center rounded border border-dashed border-foreground/30 px-2 py-1 text-xs text-muted-foreground">
        {label}
      </span>
    )
  }
}

export function Slot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded border border-dashed border-foreground/30 px-2 py-1 text-xs text-muted-foreground", className)}>
      {children}
    </span>
  )
}

// A slot that fills its parent, for layout shells where a shrink-wrapped pill would distort the story.
export function fill(label: string) {
  return function FillPlaceholder() {
    return <div className="flex h-full min-h-32 w-full items-center justify-center border border-dashed border-foreground/20 text-xs text-muted-foreground">{label}</div>
  }
}

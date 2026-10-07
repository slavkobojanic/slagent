import type { ComponentType } from "react"

export type DiffFooterProps = {
  CommitMessage: ComponentType
  CommitActions: ComponentType
}

export function DiffFooter({ CommitMessage, CommitActions }: DiffFooterProps) {
  return (
    <footer className="shrink-0 space-y-2 border-t border-white/10 p-3">
      <CommitMessage />
      <CommitActions />
    </footer>
  )
}

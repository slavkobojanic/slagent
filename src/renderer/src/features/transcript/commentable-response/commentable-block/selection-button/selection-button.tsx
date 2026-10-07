import { MessageSquarePlusIcon } from "lucide-react"

export type SelectionButtonProps = {
  top: number
  left: number
  onClick: () => void
}

export function SelectionButton({ top, left, onClick }: SelectionButtonProps) {
  return (
    <button
      type="button"
      className="reply-pop absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground shadow-md hover:bg-accent"
      style={{ top: top - 6, left }}
      // Keeps the selection while the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onMouseUp={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      <MessageSquarePlusIcon className="size-3.5" />
      Comment
    </button>
  )
}

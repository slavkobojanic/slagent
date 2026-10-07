import { HighlighterIcon } from "lucide-react"

export type SelectionButtonProps = {
  top: number
  left: number
  onClick: () => void
}

export function SelectionButton({ top, left, onClick }: SelectionButtonProps) {
  return (
    <button
      type="button"
      aria-label="Comment on this part"
      title="Comment"
      className="reply-pop absolute z-20 flex size-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-md bg-input/40 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground dark:bg-input/30"
      style={{ top: top - 6, left }}
      // Keeps the selection while the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onMouseUp={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      <HighlighterIcon className="size-3.5" />
    </button>
  )
}
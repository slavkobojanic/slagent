import { HighlighterIcon } from "lucide-react"

export type GutterButtonProps = {
  onClick: () => void
}

export function GutterButton({ onClick }: GutterButtonProps) {
  return (
    <button
      type="button"
      aria-label="Comment on this part"
      title="Comment"
      className="absolute top-0.5 -left-6 flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/reply:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100"
      onClick={onClick}
    >
      <HighlighterIcon className="size-3.5" />
    </button>
  )
}

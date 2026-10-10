import type { StepLabel } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-facts"
import { Shimmer } from "@/components/ai-elements/shimmer"

export type ToolLabelProps = {
  label: StepLabel
  onOpenFile: (path: string) => void
}

// A described step fades in as plain text once the small model names it; while
// it is being written the step holds a quiet shimmering line instead of the
// raw fallback.
export function ToolLabel({ label, onOpenFile }: ToolLabelProps) {
  if (label.kind === "pending") {
    return (
      <Shimmer as="span" duration={1}>
        ···
      </Shimmer>
    )
  }
  if (label.kind === "text") {
    return <span className="animate-in fade-in-0 duration-500">{label.text}</span>
  }
  return (
    <span className="animate-in fade-in-0 duration-500">
      {label.name}{" "}
      <button
        type="button"
        className="text-left underline-offset-2 hover:text-foreground hover:underline"
        title="View file"
        onClick={(event) => {
          event.stopPropagation()
          onOpenFile(label.path)
        }}
      >
        {label.path}
      </button>
    </span>
  )
}

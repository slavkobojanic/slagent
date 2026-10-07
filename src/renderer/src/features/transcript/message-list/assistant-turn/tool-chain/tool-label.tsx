import type { StepLabel } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-facts"

export type ToolLabelProps = {
  label: StepLabel
  onOpenFile: (path: string) => void
}

export function ToolLabel({ label, onOpenFile }: ToolLabelProps) {
  if (label.kind === "text") {
    return <>{label.text}</>
  }
  return (
    <>
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
    </>
  )
}

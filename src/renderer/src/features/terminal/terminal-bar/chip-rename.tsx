import { Input } from "@/components/ui/input"

export type ChipRenameProps = {
  id: string
  draft: string
  onDraftChange: (value: string) => void
  onSave: (id: string) => void
  onCancel: () => void
}

export function ChipRename({
  id,
  draft,
  onDraftChange,
  onSave,
  onCancel,
}: ChipRenameProps) {
  return (
    <form
      className="flex shrink-0 px-1"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(id)
      }}
    >
      <Input
        value={draft}
        autoFocus
        aria-label="Terminal tab name"
        className="h-6 w-40 px-2 py-0 font-mono text-xs"
        onChange={(event) => onDraftChange(event.target.value)}
        onBlur={() => onSave(id)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel()
          }
        }}
      />
    </form>
  )
}

import "@/features/models/models.css"
import { ProviderLogo } from "@/components/provider-logo"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { ModelRow, ModelSection } from "@/features/models/model-dialog/model-groups"

export type ModelDialogProps = {
  open: boolean
  query: string
  canSelect: boolean
  sections: ModelSection[]
  overflowNotice: string | null
  error: string | null
  onOpenChange: (open: boolean) => void
  onQueryChange: (value: string) => void
  onSelect: (id: string) => void
}

// Pick the model for the next chat. A chat stays on the model it started with.
export function ModelDialog({
  open,
  query,
  canSelect,
  sections,
  overflowNotice,
  error,
  onOpenChange,
  onQueryChange,
  onSelect,
}: ModelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Model</DialogTitle>
          <DialogDescription>
            Claude Code models use your Claude Code login. The rest come from OpenRouter. A chat stays on one, so
            switching between them starts a new chat.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          autoFocus
          placeholder="Search models"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-border">
          <ModelList sections={sections} canSelect={canSelect} onSelect={onSelect} />
        </div>
        {overflowNotice === null ? null : <p className="mt-2 text-xs text-muted-foreground">{overflowNotice}</p>}
        {error === null ? null : (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

type ModelListProps = {
  sections: ModelSection[]
  canSelect: boolean
  onSelect: (id: string) => void
}

function ModelList({ sections, canSelect, onSelect }: ModelListProps) {
  if (sections.length === 0) {
    return <p className="px-3 py-6 text-sm text-muted-foreground">No matching models</p>
  }
  return (
    <>
      {sections.map((section) => (
        <ProviderGroup key={section.provider} section={section} canSelect={canSelect} onSelect={onSelect} />
      ))}
    </>
  )
}

type ProviderGroupProps = {
  section: ModelSection
  canSelect: boolean
  onSelect: (id: string) => void
}

function ProviderGroup({ section, canSelect, onSelect }: ProviderGroupProps) {
  return (
    <div>
      <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-border bg-background px-3 py-1.5">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ProviderLogo provider={section.provider} className="size-3" />
          {section.label}
        </span>
        <span className="truncate text-xs text-muted-foreground">{section.summary}</span>
      </div>
      {section.rows.map((row) => (
        <ModelRowButton key={row.id} row={row} canSelect={canSelect} onSelect={onSelect} />
      ))}
    </div>
  )
}

type ModelRowButtonProps = {
  row: ModelRow
  canSelect: boolean
  onSelect: (id: string) => void
}

// The selected row is styled from data-selected, so the class list never changes with state.
// The logo has no colour of its own (the Claude mark has one), so it takes the row's text colour.
function ModelRowButton({ row, canSelect, onSelect }: ModelRowButtonProps) {
  return (
    <button
      type="button"
      disabled={!canSelect}
      data-selected={row.selected}
      className="group flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-accent disabled:opacity-40 data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:hover:bg-primary"
      onClick={() => onSelect(row.id)}
    >
      <span className="flex w-full items-center gap-2 text-sm">
        <ProviderLogo provider={row.provider} />
        <span className="truncate">{row.name}</span>
      </span>
      <span className="pl-5.5 font-mono text-xs text-muted-foreground group-data-[selected=true]:text-primary-foreground/60">
        {row.detail}
      </span>
    </button>
  )
}

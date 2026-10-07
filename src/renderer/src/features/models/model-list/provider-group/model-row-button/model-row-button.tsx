import { ProviderLogo } from "@/components/provider-logo"
import type { ModelRow } from "@/features/models/model-groups"

export type ModelRowButtonProps = {
  row: ModelRow
  canSelect: boolean
  onSelect: (id: string) => void
}

// The logo has no colour of its own (the Claude mark has one), so it takes the row's text colour.
export function ModelRowButton({ row, canSelect, onSelect }: ModelRowButtonProps) {
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

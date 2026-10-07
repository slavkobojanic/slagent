import { ProviderLogo } from "@/components/provider-logo"
import type { ModelSection } from "@/features/models/model-groups"
import { ModelRowButton } from "./model-row-button/model-row-button"

export type ProviderGroupProps = {
  section: ModelSection
  canSelect: boolean
  onSelect: (id: string) => void
}

export function ProviderGroup({ section, canSelect, onSelect }: ProviderGroupProps) {
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

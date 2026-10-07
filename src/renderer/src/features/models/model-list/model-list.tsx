import type { ModelSection } from "@/features/models/model-groups"
import { ProviderGroup } from "./provider-group/provider-group"

export type ModelListProps = {
  sections: ModelSection[]
  canSelect: boolean
  onSelect: (id: string) => void
}

export function ModelList({ sections, canSelect, onSelect }: ModelListProps) {
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

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ModelSection } from "@/features/models/model-groups"
import { ProviderGroup } from "./provider-group/provider-group"

export type ModelListProps = {
  sections: ModelSection[]
  canSelect: boolean
  onSelect: (id: string) => void
}

export function ModelList({ sections, canSelect, onSelect }: ModelListProps) {
  const [customOpen, setCustomOpen] = useState(false)
  const [customModelId, setCustomModelId] = useState("")

  return (
    <>
      {sections.length === 0 ? (
        <p className="px-3 py-6 text-sm text-muted-foreground">No matching models</p>
      ) : (
        sections.map((section) => (
          <ProviderGroup key={section.provider} section={section} canSelect={canSelect} onSelect={onSelect} />
        ))
      )}
      <div className="border-t border-border">
        <button
          type="button"
          aria-expanded={customOpen}
          className="w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-40"
          disabled={!canSelect}
          onClick={() => setCustomOpen((open) => !open)}
        >
          Custom
        </button>
        {!customOpen ? null : (
          <form
            className="flex gap-2 px-3 pb-3"
            onSubmit={(event) => {
              event.preventDefault()
              const modelId = customModelId.trim()
              if (modelId) onSelect(modelId)
            }}
          >
            <Input
              aria-label="OpenRouter model tag"
              autoFocus
              value={customModelId}
              placeholder="google/gemini-4-argon"
              disabled={!canSelect}
              onChange={(event) => setCustomModelId(event.target.value)}
            />
            <Button type="submit" disabled={!canSelect || !customModelId.trim()}>
              Use model
            </Button>
          </form>
        )}
      </div>
    </>
  )
}

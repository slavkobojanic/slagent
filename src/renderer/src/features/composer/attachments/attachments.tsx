import { PromptInputHeader } from "@/components/ai-elements/prompt-input"
import { ImageChip } from "./image-chip/image-chip"
import { NameChip } from "./name-chip/name-chip"

export type AttachmentChipRow = { id: string; name: string; imageUrl: string | null }

export type AttachmentsProps = {
  items: AttachmentChipRow[]
  onRemove: (id: string) => void
}

export function Attachments({ items, onRemove }: AttachmentsProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <PromptInputHeader>
      {items.map((item) => {
        if (item.imageUrl !== null) {
          return <ImageChip key={item.id} name={item.name} url={item.imageUrl} onRemove={() => onRemove(item.id)} />
        }
        return <NameChip key={item.id} name={item.name} onRemove={() => onRemove(item.id)} />
      })}
    </PromptInputHeader>
  )
}

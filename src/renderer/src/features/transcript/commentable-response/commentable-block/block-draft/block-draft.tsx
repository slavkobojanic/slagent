import { CommentDraft } from "@/components/comment-draft"

export type BlockDraftProps = {
  initial: string
  saveLabel: string
  onSave: (text: string) => void
  onCancel: () => void
}

export function BlockDraft({ initial, saveLabel, onSave, onCancel }: BlockDraftProps) {
  return <CommentDraft className="mx-0 mt-2 mb-0" initial={initial} saveLabel={saveLabel} onSave={onSave} onCancel={onCancel} />
}

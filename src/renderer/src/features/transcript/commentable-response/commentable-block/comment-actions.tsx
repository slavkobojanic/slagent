import { PencilIcon, Trash2Icon } from "lucide-react"
import type { ReplyComment } from "@shared/types"
import { Button } from "@/components/ui/button"

export type CommentActionsProps = {
  comment: ReplyComment
  onEdit: (comment: ReplyComment) => void
  onDelete: (id: string) => void
}

export function CommentActions({ comment, onEdit, onDelete }: CommentActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="xs" onClick={() => onEdit(comment)}>
        <PencilIcon className="size-3" />
        Edit
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={() => onDelete(comment.id)}>
        <Trash2Icon className="size-3" />
        Delete
      </Button>
    </div>
  )
}

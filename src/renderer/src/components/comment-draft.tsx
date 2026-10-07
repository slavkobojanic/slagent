import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Pierre slots the annotation in after React mounts it, which drops autoFocus, so the field
// takes focus after two frames, once it is in place.
function focusWhenPlaced(field: HTMLTextAreaElement | null) {
  if (field === null) {
    return
  }
  const view = field.ownerDocument.defaultView
  if (view === null) {
    return
  }
  view.requestAnimationFrame(() => {
    view.requestAnimationFrame(() => {
      if (!field.isConnected) {
        return
      }
      field.focus()
      field.setSelectionRange(field.value.length, field.value.length)
    })
  })
}

// The text lives in the field, not in state, so the view takes no hooks. An empty field is
// marked invalid so the save button can look disabled.
function CommentDraft({
  initial = "",
  saveLabel = "Add comment",
  className,
  onSave,
  onCancel,
}: {
  initial?: string
  saveLabel?: string
  className?: string
  onSave: (text: string) => void
  onCancel: () => void
}) {
  return (
    <form
      noValidate
      className={cn("group/draft mx-3 my-1.5 space-y-1.5 rounded-2xl border-0 bg-input/40 p-2 font-sans shadow-none dark:bg-input/30", className)}
      onSubmit={(event) => {
        event.preventDefault()
        const text = String(new FormData(event.currentTarget).get("comment") ?? "").trim()
        if (text) {
          onSave(text)
        }
      }}
    >
      <Textarea
        ref={focusWhenPlaced}
        name="comment"
        required
        defaultValue={initial}
        aria-label="Comment"
        placeholder="Comment for the next message"
        className="min-h-14 resize-none border-0 bg-transparent px-1 py-0.5 text-xs shadow-none focus-visible:ring-0 dark:bg-transparent"
        onInput={(event) => {
          event.currentTarget.setCustomValidity(event.currentTarget.value.trim() ? "" : "Write a comment")
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            onCancel()
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }
        }}
      />
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="xs" className="group-invalid/draft:pointer-events-none group-invalid/draft:opacity-40">
          {saveLabel}
        </Button>
      </div>
    </form>
  )
}

export { CommentDraft }

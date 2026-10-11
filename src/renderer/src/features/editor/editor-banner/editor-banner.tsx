import type { CloseChoice, EditorBanner as Banner } from "@/features/editor/editor-types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type EditorBannerProps = {
  banner: Banner
  onAnswerClose: (choice: CloseChoice) => void
  onReload: () => void
  onOverwrite: () => void
  onDismiss: () => void
}

export function EditorBanner({ banner, onAnswerClose, onReload, onOverwrite, onDismiss }: EditorBannerProps) {
  return (
    <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 text-xs">
      {bannerBody({ banner, onAnswerClose, onReload, onOverwrite, onDismiss })}
    </div>
  )
}

// One body per banner kind; the frame above never changes.
function bannerBody({ banner, onAnswerClose, onReload, onOverwrite, onDismiss }: EditorBannerProps) {
  if (banner.kind === "closing") {
    return (
      <>
        <p className="min-w-0 flex-1 text-white/80">{`Save changes to ${banner.name} before closing?`}</p>
        <Button type="button" size="sm" onClick={() => onAnswerClose("save")}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onAnswerClose("discard")}>
          Discard
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onAnswerClose("cancel")}>
          Cancel
        </Button>
      </>
    )
  }
  if (banner.kind === "conflict") {
    return (
      <>
        <p className="min-w-0 flex-1 text-destructive">{`${banner.name} changed on disk since you opened it.`}</p>
        <Button type="button" size="sm" variant="ghost" onClick={onReload}>
          Reload from disk
        </Button>
        <Button type="button" size="sm" onClick={onOverwrite}>
          Overwrite
        </Button>
      </>
    )
  }
  return (
    <>
      <p className={cn("min-w-0 flex-1", banner.kind === "error" ? "text-destructive" : "text-white/80")}>{banner.message}</p>
      <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
        Dismiss
      </Button>
    </>
  )
}

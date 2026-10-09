import { useState } from "react"
import { Check } from "lucide-react"

// The remembered decision, mirroring LinkStore's preference.
export type LinkMenuProps = {
  url: string
  x: number
  y: number
  preference: "browser" | "copy" | null
  onOpen: (url: string, remember: boolean) => void
  onCopy: (url: string, remember: boolean) => void
  onAskEveryTime: () => void
}

const ITEM_CLASS =
  "flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"

// A plain positioned menu instead of a Radix dropdown: the presenter opens it
// from a document-level listener, so there is no trigger element to anchor to.
export function LinkMenu({ url, x, y, preference, onOpen, onCopy, onAskEveryTime }: LinkMenuProps) {
  // The checkbox starts unchecked on every open, so remembering stays an
  // explicit opt-in for the choice picked next.
  const [remember, setRemember] = useState(false)
  return (
    <div
      data-link-menu
      className="fixed z-50 min-w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: x, top: y }}
    >
      <button type="button" className={ITEM_CLASS} onClick={() => onOpen(url, remember)}>
        Open in browser
      </button>
      <button type="button" className={ITEM_CLASS} onClick={() => onCopy(url, remember)}>
        Copy link
      </button>
      <div className="-mx-1 my-1 h-px bg-border" />
      <button type="button" role="checkbox" aria-checked={remember} className={ITEM_CLASS} onClick={() => setRemember(!remember)}>
        <span className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-white/25 aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground">
          {remember ? <Check className="size-3" /> : null}
        </span>
        Remember this choice
      </button>
      {preference !== null && (
        <button type="button" className={ITEM_CLASS} onClick={onAskEveryTime}>
          Ask every time
        </button>
      )}
    </div>
  )
}

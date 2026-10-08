// The remembered decision, mirroring LinkStore's preference.
export type LinkMenuProps = {
  url: string
  x: number
  y: number
  preference: "browser" | "copy" | null
  onOpen: (url: string) => void
  onCopy: (url: string) => void
  onAlwaysOpen: (url: string) => void
  onAlwaysCopy: (url: string) => void
  onAskEveryTime: () => void
}

// A plain positioned menu instead of a Radix dropdown: the presenter opens it
// from a document-level listener, so there is no trigger element to anchor to.
export function LinkMenu({ url, x, y, preference, onOpen, onCopy, onAlwaysOpen, onAlwaysCopy, onAskEveryTime }: LinkMenuProps) {
  return (
    <div
      data-link-menu
      className="fixed z-50 min-w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: x, top: y }}
    >
      <button type="button" className="flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground" onClick={() => onOpen(url)}>
        Open in browser
      </button>
      <button type="button" className="flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground" onClick={() => onCopy(url)}>
        Copy link
      </button>
      <div className="-mx-1 my-1 h-px bg-border" />
      {preference !== "browser" && (
        <button type="button" className="flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground" onClick={() => onAlwaysOpen(url)}>
          Always open in browser
        </button>
      )}
      {preference !== "copy" && (
        <button type="button" className="flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground" onClick={() => onAlwaysCopy(url)}>
          Always copy link
        </button>
      )}
      {preference !== null && (
        <button type="button" className="flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground" onClick={onAskEveryTime}>
          Ask every time
        </button>
      )}
    </div>
  )
}
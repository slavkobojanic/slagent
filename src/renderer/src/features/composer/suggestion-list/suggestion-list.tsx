import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export type SuggestionRow = { key: string; label: string; detail: string }

export type SuggestionListMenu = {
  title: string | null
  empty: string | null
  items: SuggestionRow[]
}

export type SuggestionListProps = {
  menu: SuggestionListMenu | null
  active: number
  onHover: (index: number) => void
  onChoose: (index: number) => void
}

export function SuggestionList({ menu, active, onHover, onChoose }: SuggestionListProps) {
  // Arrow keys move the selection without a pointer, so keep the active row inside the list.
  const listRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const list = listRef.current
    const row = list?.children[active] as HTMLElement | undefined
    if (list === null || list === undefined || row === undefined) {
      return
    }
    const top = row.offsetTop
    if (top < list.scrollTop) {
      list.scrollTop = top
    } else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + row.offsetHeight - list.clientHeight
    }
  }, [active, menu])
  if (menu === null) {
    return null
  }
  return (
    <div className="absolute right-6 bottom-full left-6 z-20 mb-2 overflow-hidden rounded-md border border-white/15 bg-black">
      {menu.title ? <p className="truncate border-b border-white/10 px-3 py-1.5 text-xs text-white/50">{menu.title}</p> : null}
      {menu.items.length === 0 && menu.empty ? <p className="px-3 py-1.5 text-sm text-white/50">{menu.empty}</p> : null}
      <div ref={listRef} className="max-h-56 overflow-y-auto">
        {menu.items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={cn(
              "block w-full truncate px-3 py-1.5 text-left text-sm",
              index === 0 && "rounded-t-md",
              index === menu.items.length - 1 && "rounded-b-md",
              // Hovering moves the selection, so the chosen row carries exactly one style.
              index === active ? "bg-white text-black" : "hover:bg-white/10",
            )}
            // Keeps the caret in the prompt box while a row is clicked.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(index)}
            onClick={() => onChoose(index)}
          >
            <span>{item.label}</span>
            <span className="ml-2 text-xs opacity-60">{item.detail}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

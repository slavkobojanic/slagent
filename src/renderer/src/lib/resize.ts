import { useState, type PointerEvent as ReactPointerEvent } from "react"

function readWidth(key: string, fallback: number): number {
  try {
    const value = Number(localStorage.getItem(key))
    if (Number.isFinite(value) && value > 0) return value
  } catch {
    // Width is a convenience; storage may be unavailable.
  }
  return fallback
}

// A pane width the user drags, clamped and remembered across launches.
// direction is 1 when dragging right grows the pane, -1 when dragging left does.
export function useResizableWidth(key: string, fallback: number, min: number, max: () => number, direction: 1 | -1) {
  const [width, setWidth] = useState(() => readWidth(key, fallback))
  const [resizing, setResizing] = useState(false)

  function clamp(value: number) {
    return Math.round(Math.min(Math.max(value, min), Math.max(min, max())))
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth = width
    let latest = startWidth
    setResizing(true)
    document.body.classList.add("resizing")

    function move(next: PointerEvent) {
      latest = clamp(startWidth + (next.clientX - startX) * direction)
      setWidth(latest)
    }
    function up() {
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", up)
      handle.removeEventListener("pointercancel", up)
      document.body.classList.remove("resizing")
      setResizing(false)
      try {
        localStorage.setItem(key, String(latest))
      } catch {
        // See readWidth.
      }
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", up)
    handle.addEventListener("pointercancel", up)
  }

  function onDoubleClick() {
    setWidth(fallback)
    try {
      localStorage.removeItem(key)
    } catch {
      // See readWidth.
    }
  }

  return { width: clamp(width), resizing, onPointerDown, onDoubleClick }
}

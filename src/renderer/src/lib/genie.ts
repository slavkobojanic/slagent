// macOS-style genie warp for a dialog. The live element can't be bent with CSS,
// so for the length of the animation it's hidden and replaced by horizontal
// strips, each holding a DOM clone of it clipped to one band. Every strip gets
// its own translate + scaleX, which together trace a funnel from the dialog
// into the target element (or the bottom-centre of the window, like the Dock).

const OPEN_MS = 520
/** Must match the `dialog-genie-hold` duration in index.css. */
const CLOSE_MS = 460

type Strip = { el: HTMLDivElement; v: number; h: number }

type Run = {
  layer: HTMLDivElement
  strips: Strip[]
  rect: DOMRect
  target: { x: number; y: number; w: number }
  frame: number
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function smooth(n: number) {
  const t = clamp01(n)
  return t * t * (3 - 2 * t)
}

function easeInOut(n: number) {
  const t = clamp01(n)
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function targetOf(el: Element | null) {
  const rect = el?.getBoundingClientRect()
  if (rect && rect.width > 0 && rect.height > 0) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: Math.max(16, rect.width) }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight, w: 32 }
}

/** Clones keep form values and scroll offsets, which cloneNode drops. */
function cloneLive(node: HTMLElement) {
  const clone = node.cloneNode(true) as HTMLElement
  const from = node.querySelectorAll<HTMLElement>("*")
  const to = clone.querySelectorAll<HTMLElement>("*")
  const scrolled: [HTMLElement, number, number][] = []
  from.forEach((source, index) => {
    const copy = to[index]
    if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement || source instanceof HTMLSelectElement) {
      ;(copy as HTMLInputElement).value = source.value
      if (source instanceof HTMLInputElement) (copy as HTMLInputElement).checked = source.checked
    }
    if (source.scrollTop || source.scrollLeft) scrolled.push([copy, source.scrollTop, source.scrollLeft])
    copy.removeAttribute("id")
  })
  clone.removeAttribute("id")
  clone.removeAttribute("data-state")
  clone.setAttribute("aria-hidden", "true")
  clone.setAttribute("inert", "")
  clone.classList.remove("dialog-genie-warp")
  Object.assign(clone.style, {
    position: "absolute",
    left: "0",
    top: "0",
    margin: "0",
    translate: "none",
    transform: "none",
    opacity: "1",
    animation: "none",
  })
  return { clone, scrolled }
}

function build(node: HTMLElement, target: Element | null): Run {
  const rect = node.getBoundingClientRect()
  const layer = document.createElement("div")
  Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "60", pointerEvents: "none" })

  const count = Math.round(Math.min(48, Math.max(20, rect.height / 10)))
  const strips: Strip[] = []
  const scrolls: [HTMLElement, number, number][] = []
  for (let i = 0; i < count; i++) {
    const v = Math.floor((rect.height * i) / count)
    const h = Math.floor((rect.height * (i + 1)) / count) - v
    const el = document.createElement("div")
    Object.assign(el.style, {
      position: "absolute",
      left: `${rect.left}px`,
      top: `${rect.top + v}px`,
      width: `${rect.width}px`,
      // A hair of overlap hides seams between strips.
      height: `${h + 1}px`,
      overflow: "hidden",
      transformOrigin: "50% 50%",
      willChange: "transform",
    })
    const { clone, scrolled } = cloneLive(node)
    Object.assign(clone.style, { top: `${-v}px`, width: `${rect.width}px`, height: `${rect.height}px` })
    el.appendChild(clone)
    layer.appendChild(el)
    strips.push({ el, v, h })
    scrolls.push(...scrolled)
  }
  document.body.appendChild(layer)
  for (const [el, top, left] of scrolls) {
    el.scrollTop = top
    el.scrollLeft = left
  }
  return { layer, strips, rect, target: targetOf(target), frame: 0 }
}

/** p = 0 is the dialog at rest, p = 1 is fully sucked into the target. */
function paint(run: Run, p: number) {
  const { rect, target } = run
  const up = target.y < rect.top + rect.height / 2
  // Distance along the travel axis, measured from the dialog edge farthest
  // from the target. Mirroring this lets one funnel serve both directions.
  const far = up ? rect.bottom : rect.top
  const reach = Math.max(rect.height + 40, Math.abs(target.y - far))
  const bend = smooth(p / 0.45)
  const slide = easeInOut((p - 0.2) / 0.8)
  const centre = rect.left + rect.width / 2
  const tl = target.x - target.w / 2
  const tr = target.x + target.w / 2

  for (const strip of run.strips) {
    const mid = strip.v + strip.h / 2
    const along = (up ? rect.height - mid : mid) + slide * reach
    if (along >= reach) {
      strip.el.style.visibility = "hidden"
      continue
    }
    const s = smooth(along / reach) * bend
    const left = rect.left + (tl - rect.left) * s
    const right = rect.right + (tr - rect.right) * s
    const y = up ? far - along : far + along
    const tx = (left + right) / 2 - centre
    const ty = y - (rect.top + mid)
    strip.el.style.visibility = ""
    strip.el.style.transform = `translate(${tx}px, ${ty}px) scaleX(${(right - left) / rect.width})`
  }
  run.layer.style.opacity = String(1 - clamp01((p - 0.85) / 0.15))
}

/**
 * Drives the genie for one dialog node. `open()` and `close()` can interrupt
 * each other; each picks up from wherever the previous run left off.
 */
export function createGenie(node: HTMLElement, getTarget: () => Element | null) {
  let run: Run | null = null
  let p = 1

  function stop() {
    if (!run) return
    cancelAnimationFrame(run.frame)
    run.layer.remove()
    run = null
  }

  function animate(to: 0 | 1, onDone?: () => void) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      stop()
      p = to
      onDone?.()
      return
    }
    // An interrupted run keeps its strips; they're already the right content.
    if (!run) run = build(node, getTarget())
    node.style.opacity = "0"
    const from = p
    const duration = (to === 0 ? OPEN_MS : CLOSE_MS) * Math.abs(to - from)
    const start = performance.now()
    const current = run
    paint(current, from)
    const tick = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1
      p = from + (to - from) * t
      paint(current, p)
      if (t < 1) {
        current.frame = requestAnimationFrame(tick)
        return
      }
      stop()
      onDone?.()
    }
    current.frame = requestAnimationFrame(tick)
  }

  return {
    open() {
      animate(0, () => {
        node.style.opacity = ""
      })
    },
    close() {
      animate(1)
    },
  }
}

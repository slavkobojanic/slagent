import type { ResolvedTheme } from "@/state/theme/theme-store/theme-store"

// A sandboxed frame has an opaque origin, so the app cannot measure it from outside. The script
// inside posts the frame's height, tagged with the key the frame was built for.
function sizeScript(key: string): string {
  // JSON makes the key a valid literal. Escaping "<" keeps a label from closing the script tag.
  const literal = JSON.stringify(key).replace(/</g, "\\u003c")
  return `<script>
(() => {
  const key = ${literal}
  const send = () => parent.postMessage({ slagentFrameKey: key, slagentFrameHeight: document.documentElement.scrollHeight }, "*")
  new ResizeObserver(send).observe(document.documentElement)
  addEventListener("load", send)
  send()
})()
</script>`
}

function baseStyle(theme: ResolvedTheme): string {
  const color = theme === "light" ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.9)"
  return `<style>
:root { color-scheme: ${theme}; }
html, body { margin: 0; background: transparent; color: ${color}; font: 13px/1.5 system-ui, sans-serif; }
</style>`
}

// Scripts run, but in an opaque origin: the snippet cannot reach the app, its storage, or the page
// around it. A fragment is wrapped in a document. A full document keeps its own head, and the
// script goes just before its closing body.
export function frameDocument(html: string, theme: ResolvedTheme, key: string): string {
  const script = sizeScript(key)
  if (!/<html[\s>]/i.test(html)) {
    return `<!doctype html><html><head><meta charset="utf-8">${baseStyle(theme)}</head><body>${html}${script}</body></html>`
  }
  if (!/<\/body>/i.test(html)) {
    return `${html}${script}`
  }
  // A function replacement keeps "$" in the key from being read as a replacement pattern.
  return html.replace(/<\/body>/i, () => `${script}</body>`)
}

export type FrameReport = { key: string; height: number }

// Reads a height report from a frame. Other messages on the window are not the card's.
export function parseFrameReport(data: unknown): FrameReport | null {
  if (typeof data !== "object" || data === null) {
    return null
  }
  const { slagentFrameKey: key, slagentFrameHeight: height } = data as Record<string, unknown>
  if (typeof key !== "string" || typeof height !== "number" || !Number.isFinite(height)) {
    return null
  }
  return { key, height }
}

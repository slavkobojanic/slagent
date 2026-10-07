import { useEffect, useMemo, useRef, useState } from "react"
import type { QuestionMedia } from "@shared/types"
import { MessageResponse } from "@/components/ai-elements/message"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const MIN_HEIGHT = 48
const MAX_HEIGHT = 480

// The frame has no same-origin access, so it reports its own height.
const SIZE_SCRIPT = `<script>
(() => {
  const send = () => parent.postMessage({ slagentFrameHeight: document.documentElement.scrollHeight }, "*")
  new ResizeObserver(send).observe(document.documentElement)
  addEventListener("load", send)
  send()
})()
</script>`

const BASE_STYLE = `<style>
:root { color-scheme: dark; }
html, body { margin: 0; background: transparent; color: rgba(255, 255, 255, 0.9); font: 13px/1.5 system-ui, sans-serif; }
</style>`

function frameDocument(html: string): string {
  if (/<html[\s>]/i.test(html)) {
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${SIZE_SCRIPT}</body>`)
    return `${html}${SIZE_SCRIPT}`
  }
  return `<!doctype html><html><head><meta charset="utf-8">${BASE_STYLE}</head><body>${html}${SIZE_SCRIPT}</body></html>`
}

// Scripts run, but in an opaque origin: the snippet can't reach the app,
// its storage, or the page around it.
function HtmlFrame({ html, title }: { html: string; title: string }) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = useState(160)
  const srcDoc = useMemo(() => frameDocument(html), [html])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return
      const value = (event.data as { slagentFrameHeight?: unknown } | null)?.slagentFrameHeight
      if (typeof value !== "number" || !Number.isFinite(value)) return
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(value))))
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return (
    <iframe
      ref={frame}
      title={title}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className="block w-full rounded border-0 bg-transparent"
      style={{ height }}
    />
  )
}

function ImageView({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  if (failed) return <p className="text-xs text-muted-foreground">The image didn't load.</p>
  return (
    <>
      <button type="button" className="block max-w-full cursor-zoom-in" title="View larger" onClick={() => setOpen(true)}>
        <img src={src} alt={alt} className="max-h-64 max-w-full rounded" onError={() => setFailed(true)} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] p-2 sm:max-w-[90vw]">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img src={src} alt={alt} className="max-h-[85vh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}

function hasMedia(media: QuestionMedia): boolean {
  return Boolean(media.image || media.html || media.preview)
}

function Media({ media, title, className }: { media: QuestionMedia; title: string; className?: string }) {
  if (!hasMedia(media)) return null
  return (
    <div className={cn("space-y-2", className)}>
      {media.image ? <ImageView src={media.image} alt={title} /> : null}
      {media.html ? <HtmlFrame html={media.html} title={title} /> : null}
      {media.preview ? <MessageResponse>{media.preview}</MessageResponse> : null}
    </div>
  )
}

export { HtmlFrame, hasMedia, Media }

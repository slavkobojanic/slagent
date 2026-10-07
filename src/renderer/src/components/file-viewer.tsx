import { File } from "@pierre/diffs/react"
import { ExternalLinkIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import type { FileView } from "@shared/types"
import { Button } from "@/components/ui/button"
import { openInEditor } from "@/lib/format"

// Pierre renders inside a shadow root, so the target line is found there once
// the highlighted file is in the DOM.
function scrollToLine(container: HTMLElement, line: number): boolean {
  const host = container.querySelector("diffs-container")
  const root = host?.shadowRoot
  const gutter = root?.querySelector(`[data-column-number="${line}"]`)
  if (!(gutter instanceof HTMLElement)) return false
  // scrollIntoView does not reach across the shadow boundary here, so the
  // container is scrolled by hand to center the line.
  const box = gutter.getBoundingClientRect()
  const top = box.top - container.getBoundingClientRect().top + container.scrollTop
  container.scrollTop = top - container.clientHeight / 2 + box.height / 2
  return true
}

function FileViewer({ file }: { file: FileView }) {
  const scroller = useRef<HTMLDivElement | null>(null)
  const line = file.line

  useEffect(() => {
    const container = scroller.current
    if (!container) return
    container.scrollTop = 0
    if (!line) return
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      if (scrollToLine(container, line) || tries > 40) window.clearInterval(timer)
    }, 50)
    return () => window.clearInterval(timer)
  }, [file.absolutePath, line, file.contents])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3 text-xs">
        <span className="min-w-0 flex-1 truncate font-mono text-white/70" title={file.absolutePath}>
          {file.path}
          {line ? <span className="text-white/40">:{line}</span> : null}
        </span>
        <span className="shrink-0 text-white/40 tabular-nums">{formatSize(file.size)}</span>
        <Button type="button" variant="ghost" size="xs" className="gap-1" onClick={() => openInEditor(line ? `${file.absolutePath}:${line}` : file.absolutePath)}>
          <ExternalLinkIcon className="size-3" />
          Open in editor
        </Button>
      </div>
      <div ref={scroller} className="file-viewer min-h-0 flex-1 overflow-auto">
        {file.binary ? (
          <p className="px-4 py-6 text-sm text-white/50">This is a binary file.</p>
        ) : (
          <>
            {file.truncated ? (
              <p className="border-b border-white/10 px-4 py-2 text-xs text-white/50">Showing the first 2 MB.</p>
            ) : null}
            <File
              file={{ name: file.path, contents: file.contents, cacheKey: `${file.absolutePath}:${file.size}` }}
              selectedLines={line ? { start: line, end: line } : null}
              options={{ theme: { dark: "github-dark-default", light: "github-light-default" }, themeType: "dark", disableFileHeader: true, overflow: "scroll" }}
            />
          </>
        )}
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export { FileViewer }

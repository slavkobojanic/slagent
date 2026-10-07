import { File } from "@pierre/diffs/react"
import { ExternalLinkIcon } from "lucide-react"
import type { FileView } from "@shared/types"
import { Button } from "@/components/ui/button"
import { PIERRE_CSS, PIERRE_THEME } from "@/lib/pierre"

export type FileViewerProps = {
  file: FileView
  sizeLabel: string
  // Pierre paints nothing until its highlighter has loaded, so the file mounts once it has.
  ready: boolean
  themeType: "light" | "dark"
  // Binds the scroller, which the presenter follows the target line in.
  scrollRef: (element: HTMLDivElement | null) => void
  onOpenInEditor: () => void
}

// An open file with its path, line, size, and a button that opens it in the editor.
export function FileViewer({ file, sizeLabel, ready, themeType, scrollRef, onOpenInEditor }: FileViewerProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3 text-xs">
        <span className="min-w-0 flex-1 truncate font-mono text-white/70" title={file.absolutePath}>
          {file.path}
          {file.line ? <span className="text-white/40">:{file.line}</span> : null}
        </span>
        <span className="shrink-0 text-white/40 tabular-nums">{sizeLabel}</span>
        <Button type="button" variant="ghost" size="xs" className="gap-1" onClick={onOpenInEditor}>
          <ExternalLinkIcon className="size-3" />
          Open in editor
        </Button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <FileBody file={file} ready={ready} themeType={themeType} />
      </div>
    </div>
  )
}

function FileBody({ file, ready, themeType }: Pick<FileViewerProps, "file" | "ready" | "themeType">) {
  if (file.binary) {
    return <p className="px-4 py-6 text-sm text-white/50">This is a binary file.</p>
  }
  return (
    <>
      {file.truncated ? <p className="border-b border-white/10 px-4 py-2 text-xs text-white/50">Showing the first 2 MB.</p> : null}
      {ready ? (
        <File
          file={{ name: file.path, contents: file.contents, cacheKey: `${file.absolutePath}:${file.size}` }}
          selectedLines={file.line ? { start: file.line, end: file.line } : null}
          options={{ theme: PIERRE_THEME, themeType, disableFileHeader: true, overflow: "scroll", unsafeCSS: PIERRE_CSS }}
        />
      ) : null}
    </>
  )
}

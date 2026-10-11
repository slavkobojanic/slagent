import { ExternalLinkIcon } from "lucide-react"
import type { FileView } from "@shared/types"
import { Button } from "@/components/ui/button"
import { FileBody } from "./file-body/file-body"

export type FileViewerProps = {
  file: FileView
  sizeLabel: string
  // Pierre paints nothing until its highlighter has loaded, so the file mounts once it has.
  ready: boolean
  themeType: "light" | "dark"
  scrollRef: (element: HTMLDivElement | null) => void
  onOpenInEditor: () => void
}

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

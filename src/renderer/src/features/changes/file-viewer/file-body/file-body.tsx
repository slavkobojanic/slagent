import { File } from "@pierre/diffs/react"
import type { FileView } from "@shared/types"
import { PIERRE_CSS, PIERRE_THEME } from "@/lib/pierre"

export type FileBodyProps = {
  file: FileView
  ready: boolean
  themeType: "light" | "dark"
}

export function FileBody({ file, ready, themeType }: FileBodyProps) {
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

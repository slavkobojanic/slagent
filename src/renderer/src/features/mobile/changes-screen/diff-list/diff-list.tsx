import { PatchDiff } from "@pierre/diffs/react"
import type { FileDiff } from "@/lib/diff"
import { PIERRE_CSS_NO_HEADER, PIERRE_THEME } from "@/lib/pierre"

export type MobileDiffListProps = {
  files: FileDiff[]
  emptyText: string
  themeType: "light" | "dark"
  // The tablet opens a tapped file in its source tab; the phone has nowhere to show one.
  onOpenFile?: (path: string) => void
}

// The read-only diff body of the mobile changes screen: one unified patch per
// file, without the desktop's comments and gutter actions.
export function MobileDiffList({ files, emptyText, themeType, onOpenFile }: MobileDiffListProps) {
  if (files.length === 0) {
    return <p className="px-4 py-6 text-sm text-foreground/50">{emptyText}</p>
  }
  return (
    <>
      {files.map((file) => (
        <section key={file.path} className="border-b border-border">
          <header className="flex items-center gap-2 text-xs">
            {onOpenFile === undefined ? (
              <span className="min-w-0 flex-1 truncate px-3 py-2 font-medium">{file.path}</span>
            ) : (
              <button type="button" className="mobile-press min-w-0 flex-1 truncate px-3 py-2 text-left font-medium" aria-label={`Open ${file.path}`} onClick={() => onOpenFile(file.path)}>
                {file.path}
              </button>
            )}
            <span className="shrink-0 text-emerald-500">+{file.added}</span>
            <span className="shrink-0 pr-3 text-red-500">-{file.removed}</span>
          </header>
          <PatchDiff
            patch={file.patch}
            options={{
              theme: PIERRE_THEME,
              themeType,
              diffStyle: "unified",
              overflow: "scroll",
              unsafeCSS: PIERRE_CSS_NO_HEADER,
              enableGutterUtility: false,
            }}
          />
        </section>
      ))}
    </>
  )
}

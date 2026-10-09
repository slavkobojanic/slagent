import { PatchDiff } from "@pierre/diffs/react"
import type { FileDiff } from "@/lib/diff"
import { PIERRE_CSS, PIERRE_THEME } from "@/lib/pierre"

export type MobileDiffListProps = {
  files: FileDiff[]
  emptyText: string
  themeType: "light" | "dark"
}

// The read-only diff body of the mobile changes screen: one unified patch per
// file, without the desktop's comments and gutter actions.
export function MobileDiffList({ files, emptyText, themeType }: MobileDiffListProps) {
  if (files.length === 0) {
    return <p className="px-4 py-6 text-sm text-foreground/50">{emptyText}</p>
  }
  return (
    <>
      {files.map((file) => (
        <section key={file.path} className="border-b border-border">
          <header className="flex items-center gap-2 px-3 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate font-medium">{file.path}</span>
            <span className="shrink-0 text-emerald-500">+{file.added}</span>
            <span className="shrink-0 text-red-500">-{file.removed}</span>
          </header>
          <PatchDiff
            patch={file.patch}
            options={{
              theme: PIERRE_THEME,
              themeType,
              diffStyle: "unified",
              overflow: "scroll",
              unsafeCSS: PIERRE_CSS,
              enableGutterUtility: false,
            }}
          />
        </section>
      ))}
    </>
  )
}

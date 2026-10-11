import type { ComponentType, ReactNode } from "react"
import { MessagesSquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditorBanner } from "@/features/editor/editor-banner/editor-banner"
import type { CloseChoice, EditorBanner as Banner, EditorStatus, EditorTabItem } from "@/features/editor/editor-types"
import { EditorTab } from "@/features/editor/editor-tab/editor-tab"

export type EditorProps = {
  status: EditorStatus
  error: string | null
  tabs: EditorTabItem[]
  activePath: string | null
  banner: Banner | null
  FileTree: ComponentType
  hostRef: (element: HTMLDivElement | null) => void
  onSelectTab: (absolutePath: string) => void
  onCloseTab: (absolutePath: string) => void
  onAnswerClose: (choice: CloseChoice) => void
  onReload: () => void
  onOverwrite: () => void
  onDismiss: () => void
  onExit: () => void
}

function surface({ status, error, tabs, hostRef }: Pick<EditorProps, "status" | "error" | "tabs" | "hostRef">): ReactNode {
  if (tabs.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-white/50">Open a file from the chat or the changes list to edit it.</div>
  }
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={hostRef} className="absolute inset-0" />
      {status === "loading" ? <div className="absolute inset-0 flex items-center justify-center bg-background text-sm text-white/50">Loading editor</div> : null}
      {status === "failed" ? (
        <div role="alert" className="absolute inset-0 flex items-center justify-center bg-background px-6 text-center text-sm text-destructive">
          {error ?? "The editor could not start."}
        </div>
      ) : null}
    </div>
  )
}

export function Editor({
  status,
  error,
  tabs,
  activePath,
  banner,
  FileTree,
  hostRef,
  onSelectTab,
  onCloseTab,
  onAnswerClose,
  onReload,
  onOverwrite,
  onDismiss,
  onExit,
}: EditorProps) {
  return (
    <section aria-label="Editor" className="flex min-h-0 min-w-0 flex-1 bg-background">
      <FileTree />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 px-2" role="tablist">
        {tabs.map((tab) => (
          <EditorTab
            key={tab.absolutePath}
            name={tab.name}
            path={tab.path}
            active={tab.absolutePath === activePath}
            dirty={tab.dirty}
            onSelect={() => onSelectTab(tab.absolutePath)}
            onClose={() => onCloseTab(tab.absolutePath)}
          />
        ))}
        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onExit}>
          <MessagesSquareIcon className="size-3.5" />
          Back to chat
        </Button>
      </div>
      {banner === null ? null : <EditorBanner banner={banner} onAnswerClose={onAnswerClose} onReload={onReload} onOverwrite={onOverwrite} onDismiss={onDismiss} />}
      {surface({ status, error, tabs, hostRef })}
      </div>
    </section>
  )
}

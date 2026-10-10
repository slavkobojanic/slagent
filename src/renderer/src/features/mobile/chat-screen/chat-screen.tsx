import { ChevronLeft, FileDiffIcon, PanelLeftIcon, PanelRightIcon, Server } from "lucide-react"
import type { ComponentType } from "react"
import { Button } from "@/components/ui/button"
import "@/features/mobile/mobile.css"

// On a tablet the chat list and the diff are docked panes, so the header toggles them instead of
// going back and pushing the changes screen, and the docked chat list already has the connection
// button. Portrait has no right panel: its tabs replace it.
export type MobileChatScreenTablet = {
  onToggleSidebar: () => void
  onTogglePanel: (() => void) | null
}

export type MobileChatScreenProps = {
  title: string
  projectName: string | null
  ready: boolean
  metaError: string | null
  changesCount: number
  onBack: () => void
  onOpenChanges: () => void
  onOpenConnection: () => void
  tablet?: MobileChatScreenTablet
  Banner: ComponentType
  Transcript: ComponentType
  Composer: ComponentType
  PlanOverlay: ComponentType
}

export function MobileChatScreen({ title, projectName, ready, metaError, changesCount, onBack, onOpenChanges, onOpenConnection, tablet, Banner, Transcript, Composer, PlanOverlay }: MobileChatScreenProps) {
  return (
    <div className="mobile-safe-x flex h-full flex-col bg-background text-foreground">
      <header className="mobile-safe-top shrink-0 border-b border-border">
        <div className="flex h-12 items-center gap-1 px-1">
          {tablet === undefined ? (
            <Button type="button" variant="ghost" size="icon-lg" aria-label="Back to chats" onClick={onBack}>
              <ChevronLeft className="size-6" />
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="icon-lg" aria-label="Toggle chats" onClick={tablet.onToggleSidebar}>
              <PanelLeftIcon className="size-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            {projectName !== null ? <p className="truncate text-xs text-foreground/50">{projectName}</p> : null}
          </div>
          {tablet?.onTogglePanel ? (
            <Button type="button" variant="ghost" size="icon-lg" aria-label="Toggle side panel" onClick={tablet.onTogglePanel}>
              <PanelRightIcon className="size-5" />
            </Button>
          ) : null}
          {tablet === undefined && changesCount > 0 ? (
            <Button type="button" variant="ghost" size="icon-lg" aria-label={`Changes (${changesCount})`} onClick={onOpenChanges}>
              <span className="relative">
                <FileDiffIcon className="size-5" />
                <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-foreground px-1 text-center font-semibold leading-4 text-background">
                  {changesCount > 9 ? "9+" : changesCount}
                </span>
              </span>
            </Button>
          ) : null}
          {tablet === undefined ? (
            <Button type="button" variant="ghost" size="icon-lg" aria-label="Connection" onClick={onOpenConnection}>
              <Server className="size-5" />
            </Button>
          ) : null}
        </div>
      </header>
      <Banner />
      {metaError !== null ? <p className="border-b border-border px-4 py-2 text-sm text-destructive">{metaError}</p> : null}
      <main className="mobile-safe-bottom mobile-keyboard-shift relative flex min-h-0 flex-1 flex-col">
        {ready ? (
          // Fades in over the "Starting" placeholder, so the swap is not a teleport.
          <div className="mobile-fade-in flex min-h-0 flex-1 flex-col">
            <Transcript />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-foreground/50">Starting</div>
        )}
        <Composer />
        <PlanOverlay />
      </main>
    </div>
  )
}

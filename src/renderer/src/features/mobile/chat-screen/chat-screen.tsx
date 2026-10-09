import { ChevronLeft, Server } from "lucide-react"
import type { ComponentType } from "react"
import { Button } from "@/components/ui/button"
import "@/features/mobile/mobile.css"

export type MobileChatScreenProps = {
  title: string
  projectName: string | null
  ready: boolean
  metaError: string | null
  onBack: () => void
  onOpenConnection: () => void
  Banner: ComponentType
  Transcript: ComponentType
  Composer: ComponentType
  PlanOverlay: ComponentType
}

export function MobileChatScreen({ title, projectName, ready, metaError, onBack, onOpenConnection, Banner, Transcript, Composer, PlanOverlay }: MobileChatScreenProps) {
  return (
    <div className="mobile-safe-x flex h-full flex-col bg-background text-foreground">
      <header className="mobile-safe-top shrink-0 border-b border-border">
        <div className="flex h-12 items-center gap-1 px-1">
          <Button type="button" variant="ghost" size="icon-lg" aria-label="Back to chats" onClick={onBack}>
            <ChevronLeft className="size-6" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            {projectName !== null ? <p className="truncate text-xs text-foreground/50">{projectName}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon-lg" aria-label="Connection" onClick={onOpenConnection}>
            <Server className="size-5" />
          </Button>
        </div>
      </header>
      <Banner />
      {metaError !== null ? <p className="border-b border-border px-4 py-2 text-sm text-destructive">{metaError}</p> : null}
      <main className="mobile-safe-bottom relative flex min-h-0 flex-1 flex-col">
        {ready ? <Transcript /> : <div className="flex flex-1 items-center justify-center text-sm text-foreground/50">Starting</div>}
        <Composer />
        <PlanOverlay />
      </main>
    </div>
  )
}

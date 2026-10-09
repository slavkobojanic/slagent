import type { ComponentType } from "react"

export type MainColumnProps = {
  ready: boolean
  metaError: string | null
  actionError: string | null
  Transcript: ComponentType
  Composer: ComponentType
  PlanOverlay: ComponentType
}

export function MainColumn({ ready, metaError, actionError, Transcript, Composer, PlanOverlay }: MainColumnProps) {
  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {metaError !== null ? <p className="border-b border-foreground/10 px-6 py-2 text-sm text-destructive">{metaError}</p> : null}
      {actionError !== null ? (
        <p role="alert" className="border-b border-foreground/10 px-6 py-2 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      {ready ? <Transcript /> : <div className="flex flex-1 items-center justify-center text-sm text-foreground/50">Starting</div>}
      <Composer />
      <PlanOverlay />
    </main>
  )
}

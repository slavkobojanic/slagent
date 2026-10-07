import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { Toaster } from "sonner"
import { BridgeMissing } from "@/components/bridge-missing"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createAgent } from "@/features/agent/create"
import { createChanges } from "@/features/changes/create"
import { createComposer } from "@/features/composer/create"
import { createLibrary } from "@/features/library/create"
import { createModels } from "@/features/models/create"
import { createReview } from "@/features/review/create"
import { createRunStatus } from "@/features/run-status/create"
import { createSettings } from "@/features/settings/create"
import { createShell } from "@/features/shell/create"
import { createTranscript } from "@/features/transcript/create"
import { getInstallContext } from "@/ipc/install-context"
import { installServices } from "@/ipc/services"
import { createMirror } from "@/mirror/create-mirror"
import type { AppDeps } from "@/state/app-deps"
import { createSharedState } from "@/state/create-shared-state"

const TOAST_OPTIONS = {
  style: {
    background: "var(--background)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
  },
}

// The root owning create. main.tsx calls it once at boot. It installs the services, builds
// the mirror and shared state, creates every slice in the wiring order, starts the listeners,
// and returns the host. Nothing here runs during render.
export function createApp(): ComponentType {
  try {
    getInstallContext()
  } catch {
    return BridgeMissing
  }

  const services = installServices()
  const mirror = createMirror(services)
  const shared = createSharedState(services, window)
  const deps: AppDeps = { services, env: { window }, mirror, shared }

  // The order matters: each line may use the slots returned above it.
  const review = createReview(deps)
  const agent = createAgent(deps)
  const runStatus = createRunStatus(deps)
  const composer = createComposer({ ...deps, review, runStatus })
  const transcript = createTranscript({ ...deps, review, question: agent.Question })
  const changes = createChanges({ ...deps, review })
  const library = createLibrary(deps)
  const settings = createSettings(deps)
  const models = createModels(deps)
  const Shell = createShell({ ...deps, slots: { ...library, ...settings, ...models, ...transcript, ...composer, ...changes } })

  mirror.start()
  shared.layoutPresenter.start()
  shared.keyboard.start()
  shared.links.start()
  shared.themePresenter.start()

  return observer(function AppHost() {
    return (
      <>
        <TooltipProvider>
          <Shell />
        </TooltipProvider>
        <Toaster theme={shared.theme.resolved} toastOptions={TOAST_OPTIONS} />
      </>
    )
  })
}

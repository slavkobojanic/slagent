import type { Services } from "@/ipc/services"
import { LibraryStore } from "@/mirror/library-store"
import { MetaStore } from "@/mirror/meta-store"
import { MirrorPresenter } from "@/mirror/mirror-presenter"
import { RunStore } from "@/mirror/run-store"

export type Mirror = {
  library: LibraryStore
  meta: MetaStore
  run: RunStore
  start(): void
  stop(): void
}

// Builds the mirror stores and the presenter that fills them. Nothing is subscribed until start().
export function createMirror(services: Services): Mirror {
  const library = new LibraryStore()
  const meta = new MetaStore()
  const run = new RunStore()
  const presenter = new MirrorPresenter(services.app, library, meta, run)
  return { library, meta, run, start: presenter.start, stop: presenter.stop }
}

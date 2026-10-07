import type { API } from "@/ipc/api"
import type { AppMeta, LibraryState, Snapshot, UiEvent } from "@shared/types"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"

type TranscriptEvent = Extract<UiEvent, { type: "transcript" }>

export class MirrorPresenter {
  private subscription: (() => void) | null = null
  // Bumped by stop(), so a snapshot still in flight from before it is ignored.
  private token = 0
  private libraryRevision = 0
  private transcriptRevision = 0
  private metaRevision = 0

  constructor(
    private readonly api: API,
    private readonly library: LibraryStore,
    private readonly meta: MetaStore,
    private readonly run: RunStore,
  ) {}

  start = () => {
    if (this.subscription !== null) {
      return
    }
    this.subscription = this.api.onEvent(this.handleEvent)
    const token = this.token
    void this.api.getSnapshot().then((snapshot) => {
      if (token !== this.token) {
        return
      }
      this.applySnapshot(snapshot)
    })
  }

  stop = () => {
    this.subscription?.()
    this.subscription = null
    this.token += 1
  }

  private handleEvent = (event: UiEvent) => {
    if (this.subscription === null) {
      return
    }
    if (event.type === "library") {
      this.applyLibrary(event.revision, event.library)
      return
    }
    if (event.type === "transcript") {
      this.applyTranscript(event)
      return
    }
    this.applyMeta(event.revision, event.meta)
  }

  private applySnapshot = (snapshot: Snapshot) => {
    this.applyLibrary(snapshot.revision, snapshot.library)
    // A snapshot is not checked against the open chat: it describes the chat the main process has open.
    if (snapshot.revision >= this.transcriptRevision) {
      this.transcriptRevision = snapshot.revision
      this.run.setTranscript({ ...snapshot, chatId: snapshot.library.openChatId })
    }
    this.applyMeta(snapshot.revision, snapshot.meta)
  }

  private applyLibrary = (revision: number, library: LibraryState) => {
    if (revision < this.libraryRevision) {
      return
    }
    this.libraryRevision = revision
    this.library.setLibrary(library)
  }

  private applyTranscript = (event: TranscriptEvent) => {
    if (event.revision < this.transcriptRevision) {
      return
    }
    // The revision advances before the chat check, so a late event for a chat that is no
    // longer open cannot be applied afterwards.
    this.transcriptRevision = event.revision
    if (event.chatId !== this.library.openChatId || event.projectId !== this.library.openProjectId) {
      return
    }
    this.run.setTranscript(event)
  }

  private applyMeta = (revision: number, meta: AppMeta) => {
    if (revision < this.metaRevision) {
      return
    }
    this.metaRevision = revision
    this.meta.setMeta(meta)
  }
}

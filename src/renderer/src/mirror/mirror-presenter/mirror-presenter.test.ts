import type { API } from "@/ipc/api"
import { describe, expect, it, vi, type Mock } from "vitest"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { MirrorPresenter } from "@/mirror/mirror-presenter/mirror-presenter"
import { RunStore } from "@/mirror/run-store/run-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { EMPTY_PERSONALISATION, type AppMeta, type ChatMessage, type LibraryState, type Snapshot, type UiEvent } from "@shared/types"
import { nullLog } from "@/log/log"

type Listener = (event: UiEvent) => void

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function libraryState(openChatId: string | null, openProjectId = "p1"): LibraryState {
  return { projects: [], openProjectId, chats: [], chatsByProject: {}, openChatId }
}

function metaState(modelName: string): AppMeta {
  return {
    ready: true,
    error: null,
    cwd: "/work",
    agentDir: "/agent",
    modelId: modelName,
    modelName,
    modelProvider: "openrouter",
    models: [],
    openRouter: { configured: true, source: "OAuth", type: "oauth", envKey: false },
    extensions: [],
    extensionErrors: [],
    usageTotals: { tokens: 0, cost: 0, chats: 0 },
    server: null,
    routing: "balance",
    effort: "medium",
    titleModelId: null,
    titleModels: [],
    personalisation: EMPTY_PERSONALISATION,
  }
}

function userMessage(id: string, text: string): ChatMessage {
  return { id, role: "user", text, attachments: [] }
}

function snapshotOf(revision: number, overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    revision,
    meta: metaState("snapshot-model"),
    library: libraryState("c1"),
    messages: [],
    windowStart: 0,
    hasOlder: false,
    hasNewer: false,
    streaming: false,
    notice: null,
    queue: [],
    usage: null,
    todos: [],
    planMode: false,
    tasks: [],
    planProposal: null,
    question: null,
    ...overrides,
  }
}

function transcriptEvent(revision: number, chatId: string | null, projectId = "p1"): UiEvent {
  return {
    ...snapshotOf(revision, { messages: [userMessage(`m-${revision}`, `revision ${revision}`)] }),
    type: "transcript",
    projectId,
    chatId,
  }
}

function setup() {
  const app = createMockInstance<API>(["onEvent", "onReconnect", "getSnapshot"])
  const dispose = vi.fn()
  let listener: Listener = () => undefined
  app.onEvent.mockImplementation((next: Listener) => {
    listener = next
    return dispose
  })
  app.onReconnect.mockImplementation(() => vi.fn())
  const libraryStore = new LibraryStore()
  const metaStore = new MetaStore()
  const runStore = new RunStore()
  const presenter = new MirrorPresenter(app, libraryStore, metaStore, runStore, nullLog())
  return {
    app,
    dispose,
    libraryStore,
    metaStore,
    runStore,
    presenter,
    emit: (event: UiEvent) => listener(event),
  }
}

function deferredSnapshot(getSnapshot: Mock) {
  let resolve: (value: Snapshot) => void = () => undefined
  getSnapshot.mockReturnValue(new Promise<Snapshot>((next) => (resolve = next)))
  return resolve
}

describe("MirrorPresenter", () => {
  it("can apply the snapshot when it starts", async () => {
    const { app, libraryStore, metaStore, runStore, presenter } = setup()
    app.getSnapshot.mockResolvedValue(snapshotOf(1, { messages: [userMessage("m1", "hello")], streaming: true }))

    presenter.start()
    await flush()

    expect(libraryStore.openChatId).toBe("c1")
    expect(metaStore.meta?.modelName).toBe("snapshot-model")
    expect(runStore.messages.map((message) => message.id)).toEqual(["m1"])
    expect(runStore.streaming).toBe(true)
    expect(runStore.transcriptChatId).toBe("c1")
  })

  it("can advance the transcript revision but drop a transcript event for another chat", async () => {
    const { app, runStore, presenter, emit } = setup()
    app.getSnapshot.mockResolvedValue(snapshotOf(1, { messages: [userMessage("from-snapshot", "open chat")] }))
    presenter.start()
    await flush()

    emit(transcriptEvent(5, "c2"))
    emit(transcriptEvent(4, "c1"))

    // Revision 4 is older than the 5 that was dropped for another chat, so it is dropped too.
    expect(runStore.messages.map((message) => message.id)).toEqual(["from-snapshot"])
  })

  it("can drop a transcript event for the open chat when its project is not open", async () => {
    const { app, runStore, presenter, emit } = setup()
    app.getSnapshot.mockResolvedValue(snapshotOf(1, { messages: [userMessage("from-snapshot", "open chat")] }))
    presenter.start()
    await flush()

    emit(transcriptEvent(2, "c1", "p2"))

    expect(runStore.messages.map((message) => message.id)).toEqual(["from-snapshot"])
  })

  it("can apply a transcript event for the open chat when its revision is current", async () => {
    const { app, runStore, presenter, emit } = setup()
    app.getSnapshot.mockResolvedValue(snapshotOf(1))
    presenter.start()
    await flush()

    emit(transcriptEvent(2, "c1"))

    expect(runStore.messages.map((message) => message.id)).toEqual(["m-2"])
  })

  it("can drop a stale snapshot when a newer transcript event already applied", async () => {
    const { app, runStore, presenter, emit } = setup()
    const resolve = deferredSnapshot(app.getSnapshot)
    presenter.start()
    emit({ type: "library", revision: 1, library: libraryState("c1") })
    emit(transcriptEvent(5, "c1"))

    resolve(snapshotOf(3, { messages: [userMessage("stale", "stale")] }))
    await flush()

    expect(runStore.messages.map((message) => message.id)).toEqual(["m-5"])
  })

  it("can ignore a library event older than the library already applied", async () => {
    const { app, libraryStore, presenter, emit } = setup()
    app.getSnapshot.mockResolvedValue(snapshotOf(1))
    presenter.start()
    await flush()

    emit({ type: "library", revision: 4, library: libraryState("c9") })
    emit({ type: "library", revision: 3, library: libraryState("c2") })

    expect(libraryStore.openChatId).toBe("c9")
  })

  it("can ignore a meta event older than the meta already applied", async () => {
    const { app, metaStore, presenter, emit } = setup()
    app.getSnapshot.mockResolvedValue(snapshotOf(1))
    presenter.start()
    await flush()

    emit({ type: "meta", revision: 4, meta: metaState("newer") })
    emit({ type: "meta", revision: 2, meta: metaState("older") })

    expect(metaStore.meta?.modelName).toBe("newer")
  })

  it("can keep the meta from a newer event when a snapshot with an older revision arrives", async () => {
    const { app, metaStore, presenter, emit } = setup()
    const resolve = deferredSnapshot(app.getSnapshot)
    presenter.start()
    emit({ type: "meta", revision: 7, meta: metaState("live") })

    resolve(snapshotOf(2, { meta: metaState("stale") }))
    await flush()

    expect(metaStore.meta?.modelName).toBe("live")
  })

  it("can subscribe once and load the snapshot once when start is called twice", async () => {
    const { app, presenter } = setup()
    app.getSnapshot.mockResolvedValue(snapshotOf(1))

    presenter.start()
    presenter.start()
    await flush()

    expect(app.onEvent).toHaveBeenCalledTimes(1)
    expect(app.getSnapshot).toHaveBeenCalledTimes(1)
  })

  it("can ignore a snapshot that arrives after stop", async () => {
    const { app, runStore, presenter } = setup()
    const resolve = deferredSnapshot(app.getSnapshot)
    presenter.start()
    presenter.stop()

    resolve(snapshotOf(1, { messages: [userMessage("late", "late")] }))
    await flush()

    expect(runStore.messages).toEqual([])
  })

  it("can stop applying events once stop is called", async () => {
    const { app, dispose, metaStore, presenter, emit } = setup()
    app.getSnapshot.mockResolvedValue(snapshotOf(1))
    presenter.start()
    await flush()

    presenter.stop()
    emit({ type: "meta", revision: 9, meta: metaState("after stop") })

    expect(dispose).toHaveBeenCalledTimes(1)
    expect(metaStore.meta?.modelName).toBe("snapshot-model")
  })

  it("can subscribe again and apply a fresh snapshot when started after stop", async () => {
    const { app, metaStore, presenter } = setup()
    app.getSnapshot.mockResolvedValueOnce(snapshotOf(1))
    app.getSnapshot.mockResolvedValueOnce(snapshotOf(2, { meta: metaState("restarted") }))
    presenter.start()
    await flush()
    presenter.stop()

    presenter.start()
    await flush()

    expect(app.onEvent).toHaveBeenCalledTimes(2)
    expect(metaStore.meta?.modelName).toBe("restarted")
  })
})

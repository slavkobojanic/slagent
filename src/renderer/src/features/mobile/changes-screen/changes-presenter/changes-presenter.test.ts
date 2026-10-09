import { afterEach, describe, expect, it, vi } from "vitest"
import { SAMPLE_DIFF, makeStatus, makeTranscript } from "@/features/changes/changes-fixtures"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { MobileChangesPresenter } from "./changes-presenter"
import { MobileChangesStore } from "@/features/mobile/changes-screen/changes-store/changes-store"
import { MobileStore } from "@/features/mobile/mobile-store/mobile-store"

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function setup() {
  const libraryStore = new LibraryStore()
  const mobileStore = new MobileStore(libraryStore)
  const runStore = new RunStore()
  const store = new MobileChangesStore()
  const api = createMockInstance<API>(["gitStatus", "gitDiff", "onEvent", "onReconnect"])
  let onEvent: (event: { type: string; revision: number }) => void = () => undefined
  api.onEvent.mockImplementation((listener: (event: { type: string; revision: number }) => void) => {
    onEvent = listener
    return () => undefined
  })
  const presenter = new MobileChangesPresenter(store, mobileStore, runStore, api, nullLog())
  api.gitStatus.mockResolvedValue(makeStatus())
  api.gitDiff.mockResolvedValue(SAMPLE_DIFF)
  return { mobileStore, runStore, store, api, presenter, gitEvent: () => onEvent({ type: "git", revision: 1 }) }
}

describe("MobileChangesPresenter", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("can load the diff when the changes screen opens", async () => {
    const { mobileStore, api, store, presenter } = setup()
    presenter.start()

    mobileStore.setScreen("changes")
    await flush()

    expect(api.gitStatus).toHaveBeenCalledTimes(1)
    expect(api.gitDiff).toHaveBeenCalledWith("uncommitted")
    expect(store.files).toHaveLength(1)
  })

  it("can refresh the status only while a chat screen is on, so its badge stays current", async () => {
    const { mobileStore, api, presenter } = setup()
    presenter.start()

    mobileStore.setScreen("chat")
    await flush()

    expect(api.gitStatus).toHaveBeenCalledTimes(1)
    expect(api.gitDiff).not.toHaveBeenCalled()
  })

  it("can refresh the open screen on a git event, so edits show as they land", async () => {
    const { mobileStore, api, store, presenter, gitEvent } = setup()
    presenter.start()
    mobileStore.setScreen("changes")
    await flush()
    api.gitStatus.mockClear()

    gitEvent()
    await flush()

    expect(api.gitStatus).toHaveBeenCalledTimes(1)
    expect(store.changedCount).toBe(1)
  })

  it("can refresh the badge only on a git event while the chat screen is on", async () => {
    const { mobileStore, api, presenter, gitEvent } = setup()
    presenter.start()
    mobileStore.setScreen("chat")
    await flush()
    api.gitStatus.mockClear()
    api.gitDiff.mockClear()

    gitEvent()
    await flush()

    expect(api.gitStatus).toHaveBeenCalledTimes(1)
    expect(api.gitDiff).not.toHaveBeenCalled()
  })

  it("can refresh both screens' state when a run ends", async () => {
    const { mobileStore, runStore, api, presenter } = setup()
    presenter.start()
    mobileStore.setScreen("chat")
    await flush()
    api.gitStatus.mockClear()

    runStore.setTranscript(makeTranscript({ streaming: true }))
    runStore.setTranscript(makeTranscript({ streaming: false }))
    await flush()

    expect(api.gitStatus).toHaveBeenCalledTimes(1)
    expect(api.gitDiff).toHaveBeenCalledWith("uncommitted")
  })

  it("can load again when the connection comes back, since events were missed", async () => {
    const { mobileStore, api, presenter } = setup()
    presenter.start()
    mobileStore.setScreen("changes")
    await flush()
    api.gitStatus.mockClear()
    api.gitDiff.mockClear()

    const onReconnect = api.onReconnect.mock.calls[0][0]
    onReconnect()
    await flush()

    expect(api.gitStatus).toHaveBeenCalledTimes(1)
    expect(api.gitDiff).toHaveBeenCalledTimes(1)
  })

  it("can keep the last diff when the git calls fail", async () => {
    const { mobileStore, store, api, presenter } = setup()
    presenter.start()
    mobileStore.setScreen("changes")
    await flush()
    api.gitStatus.mockRejectedValueOnce(new Error("not a repository"))

    await presenter.handleRefresh()

    expect(store.files).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it("can open the screen from the chat header and pop back to the chat", () => {
    const { mobileStore, presenter } = setup()

    presenter.open()
    expect(mobileStore.screen).toBe("changes")

    presenter.back()
    expect(mobileStore.screen).toBe("chat")
  })
})

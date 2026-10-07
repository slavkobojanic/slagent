import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makeFile, makeStatus, makeTranscript, SAMPLE_DIFF } from "@/features/changes/changes-fixtures"
import { ChangesStore } from "@/features/changes/changes-store/changes-store"
import { DiffPanelStore } from "@/features/changes/diff-panel/diff-panel-store/diff-panel-store"
import type { API } from "@/ipc/api"
import { Log, nullLog, type Sink } from "@/log/log"
import { parseDiff } from "@/lib/diff"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { ReviewStore } from "@/state/review/review-store/review-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { DiffPanelPresenter } from "./diff-panel-presenter"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function setup(log: Log = nullLog()) {
  const panel = new PanelStore()
  const run = new RunStore()
  const changesStore = new ChangesStore(panel, run, new MetaStore())
  const store = new DiffPanelStore()
  const api = createMockInstance<API>(["gitStatus", "gitDiff", "gitCommit", "gitPush", "gitPullRequest", "gitCommitMessage", "openExternal"])
  const panelPresenter = new PanelPresenter(panel, createMockInstance<API>([]), nullLog())
  vi.spyOn(panelPresenter, "openFile").mockResolvedValue(undefined)
  const review = new ReviewPresenter(new ReviewStore(), nullLog())
  vi.spyOn(review, "addDiffComment")
  vi.spyOn(review, "removeDiffComment")
  const newId = vi.spyOn(window.crypto, "randomUUID").mockReturnValue("comment-1-0000-0000-0000-000000000000")
  const presenter = new DiffPanelPresenter(store, changesStore, run, api, panelPresenter, review, window, log)
  api.gitStatus.mockResolvedValue(makeStatus())
  api.gitDiff.mockResolvedValue(SAMPLE_DIFF)
  return { panel, run, store, api, panelPresenter, review, newId, presenter }
}

describe("DiffPanelPresenter", () => {
  let parts: ReturnType<typeof setup>

  beforeEach(() => {
    parts = setup()
  })

  afterEach(() => {
    parts.presenter.stop()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe("start", () => {
    it("can load the diff when the panel opens on the changes tab", async () => {
      const { panel, api, store, presenter } = parts
      presenter.start()

      panel.setOpen(true)
      await flush()

      expect(api.gitStatus).toHaveBeenCalledTimes(1)
      expect(store.files.map((file) => file.path)).toEqual(["src/app.ts"])
    })

    it("can load the diff when the panel opens on a file tab with no file, because that tab shows the changes", async () => {
      const { panel, api, presenter } = parts
      presenter.start()

      panel.setTab("file")
      panel.setOpen(true)
      await flush()

      expect(api.gitStatus).toHaveBeenCalledTimes(1)
    })

    it("can leave the diff alone when the panel opens on the file tab with a file open", async () => {
      const { panel, api, presenter } = parts
      presenter.start()

      panel.setViewedFile(makeFile())
      panel.setTab("file")
      panel.setOpen(true)
      await flush()

      expect(api.gitStatus).not.toHaveBeenCalled()
    })

    it("can reload the diff when a run ends while the diff is on screen", async () => {
      const { panel, run, api, presenter } = parts
      presenter.start()
      panel.setOpen(true)
      await flush()

      run.setTranscript(makeTranscript({ streaming: true }))
      run.setTranscript(makeTranscript({ streaming: false }))
      await flush()

      expect(api.gitStatus).toHaveBeenCalledTimes(2)
    })

    it("can leave the diff alone when a run ends while the panel is closed", async () => {
      const { run, api, presenter } = parts
      presenter.start()

      run.setTranscript(makeTranscript({ streaming: true }))
      run.setTranscript(makeTranscript({ streaming: false }))
      await flush()

      expect(api.gitStatus).not.toHaveBeenCalled()
    })

    it("can wait for a run to end before loading when the panel opens during the run", async () => {
      const { panel, run, api, presenter } = parts
      presenter.start()
      run.setTranscript(makeTranscript({ streaming: true }))

      panel.setOpen(true)
      await flush()
      expect(api.gitStatus).not.toHaveBeenCalled()

      run.setTranscript(makeTranscript({ streaming: false }))
      await flush()
      expect(api.gitStatus).toHaveBeenCalledTimes(1)
    })

    it("can stop reloading the diff once stopped", async () => {
      const { panel, api, presenter } = parts
      presenter.start()
      presenter.stop()

      panel.setOpen(true)
      await flush()

      expect(api.gitStatus).not.toHaveBeenCalled()
    })
  })

  describe("handleRefresh", () => {
    it("can store the git status and the parsed diff for the current scope", async () => {
      const { store, api, presenter } = parts
      store.setScope("turn")

      await presenter.handleRefresh()

      expect(api.gitDiff).toHaveBeenCalledWith("turn")
      expect(store.status?.branch).toBe("main")
      expect(store.files.map((file) => file.path)).toEqual(["src/app.ts"])
    })

    it("can time the load from the git calls until the diff is stored", async () => {
      const sink = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Sink
      let now = 0
      const log = Log.create({ sink, clock: { now: () => now, measure: vi.fn() }, verbose: true, spec: "*:time" }).child("changes")
      const { store, api, presenter } = setup(log)
      store.setScope("turn")
      api.gitDiff.mockImplementation(async () => {
        now += 25
        return SAMPLE_DIFF
      })

      await presenter.handleRefresh()

      expect(String(sink.debug.mock.calls[0][0])).toContain("time %cload-diff 25ms")
      expect(sink.debug.mock.calls[0].at(-1)).toEqual({ scope: "turn", ok: true })
    })

    it("can report a failed git call and keep the last status and diff", async () => {
      const { store, api, presenter } = parts
      await presenter.handleRefresh()
      api.gitStatus.mockRejectedValueOnce(new Error("not a repository"))

      await presenter.handleRefresh()

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("not a repository")
      expect(store.files).toHaveLength(1)
    })

    it("can end the loading state when the refresh finishes", async () => {
      const { store, presenter } = parts

      await presenter.handleRefresh()

      expect(store.loading).toBe(false)
    })

    it("can close a comment box whose file has left the diff", async () => {
      const { store, presenter } = parts
      store.setDraft({ path: "src/gone.ts", side: "new", line: 1 })

      await presenter.handleRefresh()

      expect(store.draft).toBeNull()
    })

    it("can keep a comment box whose file is still in the diff", async () => {
      const { store, presenter } = parts
      store.setDraft({ path: "src/app.ts", side: "new", line: 2 })

      await presenter.handleRefresh()

      expect(store.draft).toEqual({ path: "src/app.ts", side: "new", line: 2 })
    })
  })

  describe("handleScope", () => {
    it("can switch the scope and reload the diff for it while the diff is on screen", async () => {
      const { panel, api, presenter, store } = parts
      presenter.start()
      panel.setOpen(true)
      await flush()
      api.gitDiff.mockClear()

      presenter.handleScope("turn")
      await flush()

      expect(store.scope).toBe("turn")
      expect(api.gitDiff).toHaveBeenCalledWith("turn")
    })

    it("can switch the scope without loading while the panel is closed", async () => {
      const { api, store, presenter } = parts

      presenter.handleScope("turn")
      await flush()

      expect(store.scope).toBe("turn")
      expect(api.gitDiff).not.toHaveBeenCalled()
    })

    it("can switch the scope without loading while a run is going", async () => {
      const { panel, run, api, store, presenter } = parts
      presenter.start()
      panel.setOpen(true)
      await flush()
      run.setTranscript(makeTranscript({ streaming: true }))
      api.gitDiff.mockClear()

      presenter.handleScope("turn")
      await flush()

      expect(store.scope).toBe("turn")
      expect(api.gitDiff).not.toHaveBeenCalled()
    })

    it("can leave the diff alone when the scope picked is the one already shown", async () => {
      const { panel, api, presenter } = parts
      presenter.start()
      panel.setOpen(true)
      await flush()
      api.gitDiff.mockClear()

      presenter.handleScope("uncommitted")
      await flush()

      expect(api.gitDiff).not.toHaveBeenCalled()
    })
  })

  describe("handleMessageChange", () => {
    it("can keep the commit message as it is typed", () => {
      const { store, presenter } = parts

      presenter.handleMessageChange("Fix the parser")

      expect(store.message).toBe("Fix the parser")
    })
  })

  describe("handleCommit", () => {
    it("can commit the message, clear it, and report the new commit", async () => {
      const { store, api, presenter } = parts
      api.gitCommit.mockResolvedValue("abc123")
      store.setMessage("Fix")

      presenter.handleCommit()
      await flush()

      expect(api.gitCommit).toHaveBeenCalledWith("Fix")
      expect(store.message).toBe("")
      expect(vi.mocked(toast).success).toHaveBeenCalledWith("Committed abc123")
    })

    it("can keep the message and report the failure when the commit fails", async () => {
      const { store, api, presenter } = parts
      api.gitCommit.mockRejectedValue(new Error("hook failed"))
      store.setMessage("Fix")

      presenter.handleCommit()
      await flush()

      expect(store.message).toBe("Fix")
      expect(vi.mocked(toast).error).toHaveBeenCalledWith("hook failed")
    })

    it("can refresh the diff after the commit", async () => {
      const { store, api, presenter } = parts
      api.gitCommit.mockResolvedValue("abc123")
      store.setMessage("Fix")

      presenter.handleCommit()
      await flush()

      expect(api.gitStatus).toHaveBeenCalled()
    })
  })

  describe("handleCommitShortcut", () => {
    it("can commit when the message is not blank", async () => {
      const { store, api, presenter } = parts
      api.gitCommit.mockResolvedValue("abc123")
      store.setMessage("Fix")

      presenter.handleCommitShortcut()
      await flush()

      expect(api.gitCommit).toHaveBeenCalledWith("Fix")
    })

    it("can do nothing when the message is blank", async () => {
      const { store, api, presenter } = parts
      store.setMessage("   ")

      presenter.handleCommitShortcut()
      await flush()

      expect(api.gitCommit).not.toHaveBeenCalled()
    })
  })

  describe("handleWriteMessage", () => {
    it("can write the commit message from the diff", async () => {
      const { store, api, presenter } = parts
      api.gitCommitMessage.mockResolvedValue("Update the parser")

      presenter.handleWriteMessage()
      await flush()

      expect(store.message).toBe("Update the parser")
    })

    it("can mark the message as being written while the request runs", async () => {
      const { store, api, presenter } = parts
      let busyDuringRequest: string | null = null
      api.gitCommitMessage.mockImplementation(async () => {
        busyDuringRequest = store.busy
        return "Update"
      })

      presenter.handleWriteMessage()
      await flush()

      expect(busyDuringRequest).toBe("message")
      expect(store.busy).toBeNull()
    })
  })

  describe("handlePush", () => {
    it("can push and report it", async () => {
      const { api, presenter } = parts

      presenter.handlePush()
      await flush()

      expect(api.gitPush).toHaveBeenCalled()
      expect(vi.mocked(toast).success).toHaveBeenCalledWith("Pushed")
    })

    it("can report a failed push", async () => {
      const { api, presenter } = parts
      api.gitPush.mockRejectedValue(new Error("rejected"))

      presenter.handlePush()
      await flush()

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("rejected")
    })
  })

  describe("handleOpenPr", () => {
    it("can report the pull request with an action that opens its URL", async () => {
      const { api, presenter } = parts
      api.gitPullRequest.mockResolvedValue("https://github.com/acme/app/pull/7")

      presenter.handleOpenPr()
      await flush()

      expect(vi.mocked(toast).success).toHaveBeenCalledWith("Pull request ready", expect.objectContaining({ action: expect.objectContaining({ label: "Open" }) }))
      const options = vi.mocked(toast).success.mock.calls[0][1] as unknown as { action: { onClick: () => void } }
      options.action.onClick()
      expect(api.openExternal).toHaveBeenCalledWith("https://github.com/acme/app/pull/7")
    })
  })

  describe("handleStartDraft", () => {
    it("can open a comment box on a line", () => {
      const { store, presenter } = parts

      presenter.handleStartDraft("src/app.ts", "new", 2)

      expect(store.draft).toEqual({ path: "src/app.ts", side: "new", line: 2 })
    })
  })

  describe("handleDraftCancel", () => {
    it("can close the comment box without saving it", () => {
      const { store, review, presenter } = parts
      presenter.handleStartDraft("src/app.ts", "new", 2)

      presenter.handleDraftCancel()

      expect(store.draft).toBeNull()
      expect(review.addDiffComment).not.toHaveBeenCalled()
    })
  })

  describe("handleDraftSave", () => {
    it("can save the comment on its line with that line's text quoted", () => {
      const { store, review, newId, presenter } = parts
      store.setFiles(parseDiff(SAMPLE_DIFF))
      presenter.handleStartDraft("src/app.ts", "new", 2)

      presenter.handleDraftSave("Why this value?")

      expect(newId).toHaveBeenCalled()
      expect(review.addDiffComment).toHaveBeenCalledWith({
        id: "comment-1-0000-0000-0000-000000000000",
        path: "src/app.ts",
        line: 2,
        side: "new",
        code: "const b = 3",
        text: "Why this value?",
      })
      expect(store.draft).toBeNull()
    })

    it("can save with an empty quote when the file is no longer in the diff", () => {
      const { store, review, presenter } = parts
      store.setDraft({ path: "src/app.ts", side: "new", line: 2 })

      presenter.handleDraftSave("Note")

      expect(review.addDiffComment).toHaveBeenCalledWith(expect.objectContaining({ code: "" }))
    })

    it("can do nothing when no comment box is open", () => {
      const { review, presenter } = parts

      presenter.handleDraftSave("Note")

      expect(review.addDiffComment).not.toHaveBeenCalled()
    })
  })

  describe("handleRemoveComment", () => {
    it("can remove the comment through the review presenter", () => {
      const { review, presenter } = parts

      presenter.handleRemoveComment("c1")

      expect(review.removeDiffComment).toHaveBeenCalledWith("c1")
    })
  })

  describe("handleViewFile", () => {
    it("can open the file in the right panel", () => {
      const { panelPresenter, presenter } = parts

      presenter.handleViewFile("src/app.ts")

      expect(panelPresenter.openFile).toHaveBeenCalledWith("src/app.ts")
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makeFile, makeStatus, makeTranscript, SAMPLE_DIFF } from "@/features/changes/changes-fixtures"
import { DiffPresenter } from "@/features/changes/diff-presenter/diff-presenter"
import { DiffStore } from "@/features/changes/diff-store/diff-store"
import { RightPanelStore } from "@/features/changes/right-panel-store/right-panel-store"
import type { AppService } from "@/ipc/app-service/app-service"
import type { GitService } from "@/ipc/git-service/git-service"
import { parseDiff } from "@/lib/diff"
import { MetaStore } from "@/mirror/meta-store"
import { RunStore } from "@/mirror/run-store"
import type { PanelPresenter } from "@/state/panel-presenter"
import { PanelStore } from "@/state/panel-store"
import type { ReviewPresenter } from "@/state/review-presenter"
import { createMockInstance } from "@/test/create-mock-instance"

// Lets the promises a presenter call started run to completion.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function setup() {
  const panel = new PanelStore()
  const run = new RunStore()
  const right = new RightPanelStore(panel, run, new MetaStore())
  const store = new DiffStore()
  const git = createMockInstance<GitService>(["gitStatus", "gitDiff", "gitCommit", "gitPush", "gitPullRequest", "gitCommitMessage"])
  const app = createMockInstance<AppService>(["openExternal"])
  const panelPresenter = createMockInstance<PanelPresenter>(["openFile"])
  const review = createMockInstance<ReviewPresenter>(["addDiffComment", "removeDiffComment"])
  const notify = { success: vi.fn(), error: vi.fn() }
  const newId = vi.fn(() => "comment-1")
  const presenter = new DiffPresenter(store, right, run, git, app, panelPresenter, review, notify, newId)
  git.gitStatus.mockResolvedValue(makeStatus())
  git.gitDiff.mockResolvedValue(SAMPLE_DIFF)
  return { panel, run, store, git, app, panelPresenter, review, notify, newId, presenter }
}

describe("DiffPresenter", () => {
  let parts: ReturnType<typeof setup>

  beforeEach(() => {
    parts = setup()
  })

  afterEach(() => {
    parts.presenter.stop()
  })

  describe("start", () => {
    it("can load the diff when the panel opens on the changes tab", async () => {
      const { panel, git, store, presenter } = parts
      presenter.start()

      panel.setOpen(true)
      await flush()

      expect(git.gitStatus).toHaveBeenCalledTimes(1)
      expect(store.files.map((file) => file.path)).toEqual(["src/app.ts"])
    })

    it("can load the diff when the panel opens on a file tab with no file, because that tab shows the changes", async () => {
      const { panel, git, presenter } = parts
      presenter.start()

      panel.setTab("file")
      panel.setOpen(true)
      await flush()

      expect(git.gitStatus).toHaveBeenCalledTimes(1)
    })

    it("can leave the diff alone when the panel opens on the file tab with a file open", async () => {
      const { panel, git, presenter } = parts
      presenter.start()

      panel.setViewedFile(makeFile())
      panel.setTab("file")
      panel.setOpen(true)
      await flush()

      expect(git.gitStatus).not.toHaveBeenCalled()
    })

    it("can reload the diff when a run ends while the diff is on screen", async () => {
      const { panel, run, git, presenter } = parts
      presenter.start()
      panel.setOpen(true)
      await flush()

      run.setTranscript(makeTranscript({ streaming: true }))
      run.setTranscript(makeTranscript({ streaming: false }))
      await flush()

      expect(git.gitStatus).toHaveBeenCalledTimes(2)
    })

    it("can leave the diff alone when a run ends while the panel is closed", async () => {
      const { run, git, presenter } = parts
      presenter.start()

      run.setTranscript(makeTranscript({ streaming: true }))
      run.setTranscript(makeTranscript({ streaming: false }))
      await flush()

      expect(git.gitStatus).not.toHaveBeenCalled()
    })

    it("can wait for a run to end before loading when the panel opens during the run", async () => {
      const { panel, run, git, presenter } = parts
      presenter.start()
      run.setTranscript(makeTranscript({ streaming: true }))

      panel.setOpen(true)
      await flush()
      expect(git.gitStatus).not.toHaveBeenCalled()

      run.setTranscript(makeTranscript({ streaming: false }))
      await flush()
      expect(git.gitStatus).toHaveBeenCalledTimes(1)
    })

    it("can stop reloading the diff once stopped", async () => {
      const { panel, git, presenter } = parts
      presenter.start()
      presenter.stop()

      panel.setOpen(true)
      await flush()

      expect(git.gitStatus).not.toHaveBeenCalled()
    })
  })

  describe("handleRefresh", () => {
    it("can store the git status and the parsed diff for the current scope", async () => {
      const { store, git, presenter } = parts
      store.setScope("turn")

      await presenter.handleRefresh()

      expect(git.gitDiff).toHaveBeenCalledWith("turn")
      expect(store.status?.branch).toBe("main")
      expect(store.files.map((file) => file.path)).toEqual(["src/app.ts"])
    })

    it("can report a failed git call and keep the last status and diff", async () => {
      const { store, git, notify, presenter } = parts
      await presenter.handleRefresh()
      git.gitStatus.mockRejectedValueOnce(new Error("not a repository"))

      await presenter.handleRefresh()

      expect(notify.error).toHaveBeenCalledWith("not a repository")
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
      const { panel, git, presenter, store } = parts
      presenter.start()
      panel.setOpen(true)
      await flush()
      git.gitDiff.mockClear()

      presenter.handleScope("turn")
      await flush()

      expect(store.scope).toBe("turn")
      expect(git.gitDiff).toHaveBeenCalledWith("turn")
    })

    it("can switch the scope without loading while the panel is closed", async () => {
      const { git, store, presenter } = parts

      presenter.handleScope("turn")
      await flush()

      expect(store.scope).toBe("turn")
      expect(git.gitDiff).not.toHaveBeenCalled()
    })

    it("can switch the scope without loading while a run is going", async () => {
      const { panel, run, git, store, presenter } = parts
      presenter.start()
      panel.setOpen(true)
      await flush()
      run.setTranscript(makeTranscript({ streaming: true }))
      git.gitDiff.mockClear()

      presenter.handleScope("turn")
      await flush()

      expect(store.scope).toBe("turn")
      expect(git.gitDiff).not.toHaveBeenCalled()
    })

    it("can leave the diff alone when the scope picked is the one already shown", async () => {
      const { panel, git, presenter } = parts
      presenter.start()
      panel.setOpen(true)
      await flush()
      git.gitDiff.mockClear()

      presenter.handleScope("uncommitted")
      await flush()

      expect(git.gitDiff).not.toHaveBeenCalled()
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
      const { store, git, notify, presenter } = parts
      git.gitCommit.mockResolvedValue("abc123")
      store.setMessage("Fix")

      presenter.handleCommit()
      await flush()

      expect(git.gitCommit).toHaveBeenCalledWith("Fix")
      expect(store.message).toBe("")
      expect(notify.success).toHaveBeenCalledWith("Committed abc123")
    })

    it("can keep the message and report the failure when the commit fails", async () => {
      const { store, git, notify, presenter } = parts
      git.gitCommit.mockRejectedValue(new Error("hook failed"))
      store.setMessage("Fix")

      presenter.handleCommit()
      await flush()

      expect(store.message).toBe("Fix")
      expect(notify.error).toHaveBeenCalledWith("hook failed")
    })

    it("can refresh the diff after the commit", async () => {
      const { store, git, presenter } = parts
      git.gitCommit.mockResolvedValue("abc123")
      store.setMessage("Fix")

      presenter.handleCommit()
      await flush()

      expect(git.gitStatus).toHaveBeenCalled()
    })
  })

  describe("handleCommitShortcut", () => {
    it("can commit when the message is not blank", async () => {
      const { store, git, presenter } = parts
      git.gitCommit.mockResolvedValue("abc123")
      store.setMessage("Fix")

      presenter.handleCommitShortcut()
      await flush()

      expect(git.gitCommit).toHaveBeenCalledWith("Fix")
    })

    it("can do nothing when the message is blank", async () => {
      const { store, git, presenter } = parts
      store.setMessage("   ")

      presenter.handleCommitShortcut()
      await flush()

      expect(git.gitCommit).not.toHaveBeenCalled()
    })
  })

  describe("handleWriteMessage", () => {
    it("can write the commit message from the diff", async () => {
      const { store, git, presenter } = parts
      git.gitCommitMessage.mockResolvedValue("Update the parser")

      presenter.handleWriteMessage()
      await flush()

      expect(store.message).toBe("Update the parser")
    })

    it("can mark the message as being written while the request runs", async () => {
      const { store, git, presenter } = parts
      let busyDuringRequest: string | null = null
      git.gitCommitMessage.mockImplementation(async () => {
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
      const { git, notify, presenter } = parts

      presenter.handlePush()
      await flush()

      expect(git.gitPush).toHaveBeenCalled()
      expect(notify.success).toHaveBeenCalledWith("Pushed")
    })

    it("can report a failed push", async () => {
      const { git, notify, presenter } = parts
      git.gitPush.mockRejectedValue(new Error("rejected"))

      presenter.handlePush()
      await flush()

      expect(notify.error).toHaveBeenCalledWith("rejected")
    })
  })

  describe("handleOpenPr", () => {
    it("can report the pull request with an action that opens its URL", async () => {
      const { app, git, notify, presenter } = parts
      git.gitPullRequest.mockResolvedValue("https://github.com/acme/app/pull/7")

      presenter.handleOpenPr()
      await flush()

      expect(notify.success).toHaveBeenCalledWith("Pull request ready", expect.objectContaining({ action: expect.objectContaining({ label: "Open" }) }))
      const options = notify.success.mock.calls[0][1]
      options.action.onClick()
      expect(app.openExternal).toHaveBeenCalledWith("https://github.com/acme/app/pull/7")
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
        id: "comment-1",
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

import { describe, expect, it } from "vitest"
import { makeStatus, SAMPLE_DIFF } from "@/features/changes/changes-fixtures"
import { DiffStore } from "@/features/changes/diff-store/diff-store"
import { parseDiff } from "@/lib/diff"

describe("DiffStore", () => {
  describe("repo", () => {
    it("can be false before the git status arrives", () => {
      expect(new DiffStore().repo).toBe(false)
    })

    it("can be true when the status says the folder is a repository", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ repo: true }))

      expect(store.repo).toBe(true)
    })
  })

  describe("changedCount", () => {
    it("can count the files the status lists", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ files: [{ path: "a.ts", status: "added", staged: false }, { path: "b.ts", status: "deleted", staged: true }] }))

      expect(store.changedCount).toBe(2)
    })

    it("can be zero before the status arrives", () => {
      expect(new DiffStore().changedCount).toBe(0)
    })
  })

  describe("branchLabel", () => {
    it("can show the branch when the status names one", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ branch: "feature/x" }))

      expect(store.branchLabel).toBe("feature/x")
    })

    it("can show Detached when a repository has no branch", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ branch: null }))

      expect(store.branchLabel).toBe("Detached")
    })

    it("can show Changes when the folder is not a repository", () => {
      expect(new DiffStore().branchLabel).toBe("Changes")
    })
  })

  describe("emptyText", () => {
    it("can explain the last-turn scope when there is no checkpoint diff", () => {
      const store = new DiffStore()
      store.setScope("turn")

      expect(store.emptyText).toBe("No changes since the last message with a checkpoint.")
    })

    it("can say there are no uncommitted changes in a repository", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ repo: true }))

      expect(store.emptyText).toBe("No uncommitted changes.")
    })

    it("can say the folder is not a git repository otherwise", () => {
      expect(new DiffStore().emptyText).toBe("This folder is not a git repository.")
    })
  })

  describe("commitPlaceholder", () => {
    it("can say there is nothing to commit when no file changed", () => {
      expect(new DiffStore().commitPlaceholder).toBe("Nothing to commit")
    })

    it("can count one changed file in the singular", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())

      expect(store.commitPlaceholder).toBe("Commit message for 1 file")
    })

    it("can count several changed files in the plural", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ files: [{ path: "a.ts", status: "added", staged: false }, { path: "b.ts", status: "added", staged: false }] }))

      expect(store.commitPlaceholder).toBe("Commit message for 2 files")
    })
  })

  describe("pushLabel", () => {
    it("can say Push when there is no status yet", () => {
      expect(new DiffStore().pushLabel).toBe("Push")
    })

    it("can say Push when the branch has nothing to push", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ ahead: 0 }))

      expect(store.pushLabel).toBe("Push")
    })

    it("can count the commits ahead of the upstream", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ ahead: 2 }))

      expect(store.pushLabel).toBe("Push 2")
    })
  })

  describe("writingMessage", () => {
    it("can be true while the commit message is being written", () => {
      const store = new DiffStore()
      store.setBusy("message")

      expect(store.writingMessage).toBe(true)
    })

    it("can be false while another git action runs", () => {
      const store = new DiffStore()
      store.setBusy("push")

      expect(store.writingMessage).toBe(false)
    })
  })

  describe("canEditMessage", () => {
    it("can be false when nothing changed", () => {
      expect(new DiffStore().canEditMessage).toBe(false)
    })

    it("can be true when a file changed", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())

      expect(store.canEditMessage).toBe(true)
    })
  })

  describe("canWriteMessage", () => {
    it("can be false when nothing changed", () => {
      expect(new DiffStore().canWriteMessage).toBe(false)
    })

    it("can be false while a git action runs", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())
      store.setBusy("commit")

      expect(store.canWriteMessage).toBe(false)
    })

    it("can be true when a file changed and nothing runs", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())

      expect(store.canWriteMessage).toBe(true)
    })
  })

  describe("canCommit", () => {
    it("can be false when nothing changed", () => {
      const store = new DiffStore()
      store.setMessage("Fix")

      expect(store.canCommit).toBe(false)
    })

    it("can be false when the message is blank", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())
      store.setMessage("   ")

      expect(store.canCommit).toBe(false)
    })

    it("can be false while a git action runs", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())
      store.setMessage("Fix")
      store.setBusy("push")

      expect(store.canCommit).toBe(false)
    })

    it("can be true with a changed file, a message, and nothing running", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())
      store.setMessage("Fix")

      expect(store.canCommit).toBe(true)
    })
  })

  describe("canPublish", () => {
    it("can be false without a branch", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus({ branch: null }))

      expect(store.canPublish).toBe(false)
    })

    it("can be false while a git action runs", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())
      store.setBusy("commit")

      expect(store.canPublish).toBe(false)
    })

    it("can be true on a branch with nothing running", () => {
      const store = new DiffStore()
      store.setStatus(makeStatus())

      expect(store.canPublish).toBe(true)
    })
  })

  describe("setScope", () => {
    it("can change the scope the diff is read for", () => {
      const store = new DiffStore()
      store.setScope("turn")

      expect(store.scope).toBe("turn")
    })
  })

  describe("setLoading", () => {
    it("can mark a refresh as in progress", () => {
      const store = new DiffStore()
      store.setLoading(true)

      expect(store.loading).toBe(true)
    })
  })

  describe("setStatus", () => {
    it("can replace the git status", () => {
      const store = new DiffStore()
      const status = makeStatus()
      store.setStatus(status)

      expect(store.status).toBe(status)
    })
  })

  describe("setFiles", () => {
    it("can replace the parsed diff", () => {
      const store = new DiffStore()
      store.setFiles(parseDiff(SAMPLE_DIFF))

      expect(store.files.map((file) => file.path)).toEqual(["src/app.ts"])
    })
  })

  describe("setMessage", () => {
    it("can keep the commit message as it is typed", () => {
      const store = new DiffStore()
      store.setMessage("Fix the parser")

      expect(store.message).toBe("Fix the parser")
    })
  })

  describe("setBusy", () => {
    it("can mark one git action as running and clear it", () => {
      const store = new DiffStore()
      store.setBusy("pr")
      store.setBusy(null)

      expect(store.busy).toBeNull()
    })
  })

  describe("setDraft", () => {
    it("can open a comment box on a line and close it", () => {
      const store = new DiffStore()
      store.setDraft({ path: "src/app.ts", side: "new", line: 2 })
      store.setDraft(null)

      expect(store.draft).toBeNull()
    })
  })
})

import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { AttachmentsPresenter } from "@/features/composer/attachments-presenter/attachments-presenter"
import { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"
import type { FileService } from "@/ipc/file-service/file-service"
import { LibraryStore } from "@/mirror/library-store"
import { MetaStore } from "@/mirror/meta-store"
import { RunStore } from "@/mirror/run-store"
import { ReviewStore } from "@/state/review-store"
import { createMockInstance } from "@/test/create-mock-instance"

const MB = 1024 * 1024

function composerStore() {
  return new ComposerStore({
    mirror: { library: new LibraryStore(), meta: new MetaStore(), run: new RunStore() },
    review: new ReviewStore(),
    history: new PromptHistoryStore(),
  })
}

function textFile(name: string): File {
  return new File(["hi"], name, { type: "text/plain" })
}

// A file whose reported size is over the limit, without allocating the bytes.
function oversized(name: string): File {
  const file = new File(["x"], name)
  Object.defineProperty(file, "size", { value: 21 * MB })
  return file
}

function dropOf(types: string[], files: File[]) {
  return { dataTransfer: { types, files }, preventDefault: vi.fn() }
}

describe("AttachmentsPresenter", () => {
  let store: ComposerStore
  let files: ReturnType<typeof createMockInstance<FileService>>
  let browser: { createUrl: Mock<(file: File) => string>; releaseUrl: Mock<(url: string) => void>; readDataUrl: Mock<(file: File) => Promise<string | null>> }
  let notify: Mock<(message: string) => void>
  let presenter: AttachmentsPresenter

  beforeEach(() => {
    store = composerStore()
    files = createMockInstance<FileService>(["pathForFile"])
    files.pathForFile.mockReturnValue("")
    browser = {
      createUrl: vi.fn((_file: File) => "blob:preview"),
      releaseUrl: vi.fn((_url: string) => undefined),
      readDataUrl: vi.fn((_file: File) => Promise.resolve<string | null>(null)),
    }
    notify = vi.fn((_message: string) => undefined)
    presenter = new AttachmentsPresenter({ store, files, browser, notify })
  })

  describe("handleFileChange", () => {
    it("can attach the picked files and reset the input so the same file can be picked again", () => {
      const input = { files: [textFile("a.txt")], value: "C:\\fakepath\\a.txt" }

      presenter.handleFileChange({ currentTarget: input })

      expect(store.attachments.map((item) => item.name)).toEqual(["a.txt"])
      expect(input.value).toBe("")
    })
  })

  describe("handleDrop", () => {
    it("can attach dropped files and cancel the browser's own drop", () => {
      const event = dropOf(["Files"], [textFile("a.txt")])

      presenter.handleDrop(event)

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(store.attachments).toHaveLength(1)
    })

    it("can leave a drop that carries no files to the browser", () => {
      const event = dropOf(["text/plain"], [])

      presenter.handleDrop(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(store.attachments).toEqual([])
    })

    it("can refuse a drop where every file is over the limit and say why", () => {
      presenter.handleDrop(dropOf(["Files"], [oversized("big.bin")]))

      expect(notify).toHaveBeenCalledWith("All files exceed the maximum size.")
      expect(store.attachments).toEqual([])
    })

    it("can attach the files that fit when only some are over the limit", () => {
      presenter.handleDrop(dropOf(["Files"], [oversized("big.bin"), textFile("small.txt")]))

      expect(store.attachments.map((item) => item.name)).toEqual(["small.txt"])
      expect(notify).not.toHaveBeenCalled()
    })
  })

  describe("handlePaste", () => {
    it("can attach pasted files and cancel the paste", () => {
      const preventDefault = vi.fn()
      presenter.handlePaste({
        clipboardData: { items: [{ kind: "file", getAsFile: () => textFile("pasted.txt") }, { kind: "string", getAsFile: () => null }] },
        preventDefault,
      })

      expect(preventDefault).toHaveBeenCalledTimes(1)
      expect(store.attachments.map((item) => item.name)).toEqual(["pasted.txt"])
    })

    it("can let pasted text through to the box", () => {
      const preventDefault = vi.fn()
      presenter.handlePaste({ clipboardData: { items: [{ kind: "string", getAsFile: () => null }] }, preventDefault })

      expect(preventDefault).not.toHaveBeenCalled()
    })
  })

  describe("attachment previews and paths", () => {
    it("can record the disk path the platform gives a file", () => {
      files.pathForFile.mockReturnValue("/disk/a.txt")

      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      expect(store.attachments[0]?.path).toBe("/disk/a.txt")
    })

    it("can record an empty path when the platform refuses one", () => {
      files.pathForFile.mockImplementation(() => {
        throw new Error("no path")
      })

      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      expect(store.attachments[0]?.path).toBe("")
    })

    it("can preview each attachment with a URL from the browser", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      expect(store.attachments[0]?.url).toBe("blob:preview")
    })
  })

  describe("remove", () => {
    it("can remove one attachment and release its preview", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt"), textFile("b.txt")]))
      const first = store.attachments[0]

      presenter.remove(first?.id ?? "")

      expect(browser.releaseUrl).toHaveBeenCalledWith("blob:preview")
      expect(store.attachments.map((item) => item.name)).toEqual(["b.txt"])
    })

    it("can remove the last attachment", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt"), textFile("b.txt")]))

      presenter.removeLast()

      expect(store.attachments.map((item) => item.name)).toEqual(["a.txt"])
    })

    it("can do nothing when there is no attachment to remove last", () => {
      expect(() => presenter.removeLast()).not.toThrow()
    })
  })

  describe("take", () => {
    it("can empty the list, release every preview, and hand back what it held", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt"), textFile("b.txt")]))

      const taken = presenter.take()

      expect(taken.map((item) => item.name)).toEqual(["a.txt", "b.txt"])
      expect(browser.releaseUrl).toHaveBeenCalledTimes(2)
      expect(store.attachments).toEqual([])
    })
  })

  describe("toPromptFiles", () => {
    it("can send a file that has a disk path by that path", async () => {
      files.pathForFile.mockReturnValue("/disk/a.txt")
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      const sent = await presenter.toPromptFiles(presenter.take())

      expect(sent).toEqual([{ name: "a.txt", mimeType: "text/plain", path: "/disk/a.txt" }])
      expect(browser.readDataUrl).not.toHaveBeenCalled()
    })

    it("can send a file without a disk path as its base64 bytes", async () => {
      browser.readDataUrl.mockResolvedValue("data:text/plain;base64,aGk=")
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      const sent = await presenter.toPromptFiles(presenter.take())

      expect(sent).toEqual([{ name: "a.txt", mimeType: "text/plain", dataBase64: "aGk=" }])
    })

    it("can drop a file that cannot be read", async () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      const sent = await presenter.toPromptFiles(presenter.take())

      expect(sent).toEqual([])
    })

    it("can name a file with no name file", async () => {
      files.pathForFile.mockReturnValue("/disk/x")
      presenter.handleDrop(dropOf(["Files"], [textFile("")]))

      const sent = await presenter.toPromptFiles(presenter.take())

      expect(sent[0]?.name).toBe("file")
    })
  })

  describe("openFileDialog", () => {
    it("can open the file picker through the input's callback ref", () => {
      const input = document.createElement("input")
      const click = vi.spyOn(input, "click")
      presenter.attachFileInput(input)

      presenter.openFileDialog()

      expect(click).toHaveBeenCalledTimes(1)
    })

    it("can do nothing before the input has mounted", () => {
      expect(() => presenter.openFileDialog()).not.toThrow()
    })
  })

  describe("stop", () => {
    it("can release every preview when stopped", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      presenter.stop()

      expect(browser.releaseUrl).toHaveBeenCalledTimes(1)
      expect(store.attachments).toEqual([])
    })
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { AttachmentsPresenter } from "@/features/composer/attachments/attachments-presenter/attachments-presenter"
import { AttachmentsStore } from "@/features/composer/attachments/attachments-store/attachments-store"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const MB = 1024 * 1024

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

// A window whose object URLs and FileReader the test controls. A null data URL makes the read fail.
function fakeWindow() {
  const URL = {
    createObjectURL: vi.fn((_file: File) => "blob:preview"),
    revokeObjectURL: vi.fn((_url: string) => undefined),
  }
  const reader = { dataUrl: null as string | null, reads: vi.fn() }
  class FakeFileReader extends EventTarget {
    result: string | null = null

    readAsDataURL(file: File) {
      reader.reads(file)
      queueMicrotask(() => {
        if (reader.dataUrl === null) {
          this.dispatchEvent(new Event("error"))
          return
        }
        this.result = reader.dataUrl
        this.dispatchEvent(new Event("load"))
      })
    }
  }
  return { window: { URL, FileReader: FakeFileReader } as unknown as Window, URL, reader }
}

describe("AttachmentsPresenter", () => {
  let store: AttachmentsStore
  let api: ReturnType<typeof createMockInstance<API>>
  let urls: ReturnType<typeof fakeWindow>["URL"]
  let reader: ReturnType<typeof fakeWindow>["reader"]
  let presenter: AttachmentsPresenter

  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    store = new AttachmentsStore()
    api = createMockInstance<API>(["pathForFile"])
    api.pathForFile.mockReturnValue("")
    const fake = fakeWindow()
    urls = fake.URL
    reader = fake.reader
    presenter = new AttachmentsPresenter(store, api, fake.window, nullLog())
  })

  describe("handleFileChange", () => {
    it("can attach the picked files and reset the input so the same file can be picked again", () => {
      const input = { files: [textFile("a.txt")], value: "C:\\fakepath\\a.txt" }

      presenter.handleFileChange({ currentTarget: input })

      expect(store.items.map((item) => item.name)).toEqual(["a.txt"])
      expect(input.value).toBe("")
    })
  })

  describe("handleDrop", () => {
    it("can attach dropped files and cancel the browser's own drop", () => {
      const event = dropOf(["Files"], [textFile("a.txt")])

      presenter.handleDrop(event)

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(store.items).toHaveLength(1)
    })

    it("can leave a drop that carries no files to the browser", () => {
      const event = dropOf(["text/plain"], [])

      presenter.handleDrop(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(store.items).toEqual([])
    })

    it("can refuse a drop where every file is over the limit and say why", () => {
      presenter.handleDrop(dropOf(["Files"], [oversized("big.bin")]))

      expect(toast.error).toHaveBeenCalledWith("All files exceed the maximum size.")
      expect(store.items).toEqual([])
    })

    it("can attach the files that fit when only some are over the limit", () => {
      presenter.handleDrop(dropOf(["Files"], [oversized("big.bin"), textFile("small.txt")]))

      expect(store.items.map((item) => item.name)).toEqual(["small.txt"])
      expect(toast.error).not.toHaveBeenCalled()
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
      expect(store.items.map((item) => item.name)).toEqual(["pasted.txt"])
    })

    it("can let pasted text through to the box", () => {
      const preventDefault = vi.fn()
      presenter.handlePaste({ clipboardData: { items: [{ kind: "string", getAsFile: () => null }] }, preventDefault })

      expect(preventDefault).not.toHaveBeenCalled()
    })
  })

  describe("attachment previews and paths", () => {
    it("can record the disk path the platform gives a file", () => {
      api.pathForFile.mockReturnValue("/disk/a.txt")

      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      expect(store.items[0]?.path).toBe("/disk/a.txt")
    })

    it("can record an empty path when the platform refuses one", () => {
      api.pathForFile.mockImplementation(() => {
        throw new Error("no path")
      })

      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      expect(store.items[0]?.path).toBe("")
    })

    it("can preview each attachment with a URL from the browser", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      expect(store.items[0]?.url).toBe("blob:preview")
    })
  })

  describe("remove", () => {
    it("can remove one attachment and release its preview", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt"), textFile("b.txt")]))
      const first = store.items[0]

      presenter.remove(first?.id ?? "")

      expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:preview")
      expect(store.items.map((item) => item.name)).toEqual(["b.txt"])
    })

    it("can remove the last attachment", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt"), textFile("b.txt")]))

      expect(presenter.removeLast()).toBe(true)
      expect(store.items.map((item) => item.name)).toEqual(["a.txt"])
    })

    it("can report that there was no attachment to remove last", () => {
      expect(presenter.removeLast()).toBe(false)
    })
  })

  describe("take", () => {
    it("can empty the list, release every preview, and hand back what it held", () => {
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt"), textFile("b.txt")]))

      const taken = presenter.take()

      expect(taken.map((item) => item.name)).toEqual(["a.txt", "b.txt"])
      expect(urls.revokeObjectURL).toHaveBeenCalledTimes(2)
      expect(store.items).toEqual([])
    })
  })

  describe("toPromptFiles", () => {
    it("can send a file that has a disk path by that path", async () => {
      api.pathForFile.mockReturnValue("/disk/a.txt")
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      const sent = await presenter.toPromptFiles(presenter.take())

      expect(sent).toEqual([{ name: "a.txt", mimeType: "text/plain", path: "/disk/a.txt" }])
      expect(reader.reads).not.toHaveBeenCalled()
    })

    it("can send a file without a disk path as its base64 bytes", async () => {
      reader.dataUrl = "data:text/plain;base64,aGk="
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
      api.pathForFile.mockReturnValue("/disk/x")
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

  describe("follow and stop", () => {
    it("can park the open attachments when stopped and adopt them again for the same chat", () => {
      presenter.follow("p1:c1")
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))

      presenter.stop()

      expect(store.items).toEqual([])
      expect(urls.revokeObjectURL).not.toHaveBeenCalled()

      presenter.follow("p1:c1")

      expect(store.items.map((item) => item.name)).toEqual(["a.txt"])
      expect(store.items[0]?.url).toBe("blob:preview")
    })

    it("can keep the parked attachments of one chat while another chat is open", () => {
      presenter.follow("p1:c1")
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))
      presenter.follow("p1:c2")

      expect(store.items).toEqual([])

      presenter.follow("p1:c1")

      expect(store.items.map((item) => item.name)).toEqual(["a.txt"])
    })

    it("can drop the parked attachments of a chat that was sent", () => {
      presenter.follow("p1:c1")
      presenter.handleDrop(dropOf(["Files"], [textFile("a.txt")]))
      presenter.follow("p1:c2")

      presenter.forget("p1:c1")
      presenter.follow("p1:c1")

      expect(store.items).toEqual([])
    })
  })
})

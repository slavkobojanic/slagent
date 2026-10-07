import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { ChooseFolderPresenter } from "@/features/library/sidebar/open-project/choose-folder/choose-folder-presenter/choose-folder-presenter"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("ChooseFolderPresenter", () => {
  let api: MockInstance<API>
  let registry: CommandRegistry
  let presenter: ChooseFolderPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    api = createMockInstance<API>(["chooseFolder"])
    api.chooseFolder.mockResolvedValue(undefined)
    registry = new CommandRegistry()
    presenter = new ChooseFolderPresenter(api, registry, nullLog())
  })

  afterEach(() => {
    presenter.stop()
  })

  describe("start", () => {
    it("can choose a folder when the open folder command runs", async () => {
      presenter.start()

      registry.run("folder.open")
      await flush()

      expect(api.chooseFolder).toHaveBeenCalledTimes(1)
    })
  })

  describe("stop", () => {
    it("can remove its command from the registry", () => {
      presenter.start()

      presenter.stop()

      expect(registry.commands).toHaveLength(0)
    })
  })

  describe("handleChooseFolder", () => {
    it("can choose a folder", async () => {
      await presenter.handleChooseFolder()

      expect(api.chooseFolder).toHaveBeenCalledTimes(1)
    })

    it("can show a toast when the folder cannot be chosen", async () => {
      api.chooseFolder.mockRejectedValue(new Error("Denied"))

      await presenter.handleChooseFolder()

      expect(toast.error).toHaveBeenCalledWith("Denied")
    })
  })
})

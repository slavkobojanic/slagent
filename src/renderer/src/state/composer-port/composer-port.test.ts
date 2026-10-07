import { describe, expect, it, vi } from "vitest"
import { ComposerPort } from "@/state/composer-port/composer-port"

function handle() {
  return { focus: vi.fn(), fill: vi.fn() }
}

describe("ComposerPort", () => {
  describe("focus and fill", () => {
    it("can do nothing when nothing is attached", () => {
      const port = new ComposerPort()

      expect(() => {
        port.focus()
        port.fill("hello")
      }).not.toThrow()
    })

    it("can forward focus and fill to the attached handle", () => {
      const port = new ComposerPort()
      const composer = handle()
      port.attach(composer)

      port.focus()
      port.fill("hello")

      expect(composer.focus).toHaveBeenCalledTimes(1)
      expect(composer.fill).toHaveBeenCalledWith("hello")
    })
  })

  describe("attach", () => {
    it("can stop forwarding once the disposer runs", () => {
      const port = new ComposerPort()
      const composer = handle()
      const detach = port.attach(composer)

      detach()
      port.focus()

      expect(composer.focus).not.toHaveBeenCalled()
    })

    it("can keep a newer handle when an older handle's disposer runs", () => {
      const port = new ComposerPort()
      const older = handle()
      const newer = handle()
      const detachOlder = port.attach(older)
      port.attach(newer)

      detachOlder()
      port.focus()

      expect(older.focus).not.toHaveBeenCalled()
      expect(newer.focus).toHaveBeenCalledTimes(1)
    })
  })
})

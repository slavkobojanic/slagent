import { describe, expect, it, vi } from "vitest"
import type { FileView } from "@shared/types"
import { EditorPort } from "@/state/editor-port/editor-port"

const file = { path: "a.ts", absolutePath: "/p/a.ts" } as FileView

describe("EditorPort", () => {
  it("can deliver a file to the attached handler", () => {
    const port = new EditorPort()
    const handler = vi.fn()
    port.attach(handler)

    port.open(file)

    expect(handler).toHaveBeenCalledWith(file)
  })

  it("can pass a branch-change highlight flag with the file", () => {
    const port = new EditorPort()
    const handler = vi.fn()
    port.attach(handler)

    port.open(file, true)

    expect(handler).toHaveBeenCalledWith(file, true)
  })

  it("can ignore a file when nothing is attached", () => {
    expect(() => new EditorPort().open(file)).not.toThrow()
  })

  it("can detach only the handler that attached", () => {
    const port = new EditorPort()
    const first = vi.fn()
    const second = vi.fn()
    const detachFirst = port.attach(first)
    port.attach(second)

    detachFirst()
    port.open(file)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(file)
  })
})

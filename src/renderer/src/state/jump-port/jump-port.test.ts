import { describe, expect, it, vi } from "vitest"
import { JumpPort } from "@/state/jump-port/jump-port"

describe("JumpPort", () => {
  it("can deliver a request to the attached handler", () => {
    const port = new JumpPort()
    const handler = vi.fn()
    port.attach(handler)

    port.request("msg_1")

    expect(handler).toHaveBeenCalledWith("msg_1")
  })

  it("can ignore a request when nothing is attached", () => {
    const port = new JumpPort()

    expect(() => port.request("msg_1")).not.toThrow()
  })

  it("can detach only the handler that attached", () => {
    const port = new JumpPort()
    const first = vi.fn()
    const second = vi.fn()
    const detachFirst = port.attach(first)
    port.attach(second)

    detachFirst()
    port.request("msg_1")

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith("msg_1")
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { toastFailure } from "@/features/library/toast-failure"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

describe("toastFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("can report success when the task resolves", async () => {
    expect(await toastFailure(() => Promise.resolve())).toBe(true)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("can show the error and report failure when the task rejects", async () => {
    expect(await toastFailure(() => Promise.reject(new Error("Chat is gone")))).toBe(false)
    expect(toast.error).toHaveBeenCalledWith("Chat is gone")
  })
})

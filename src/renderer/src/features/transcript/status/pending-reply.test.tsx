import { describe, expect, it } from "vitest"
import { PendingReply } from "@/features/transcript/status/pending-reply"
import { viewMarkup } from "@/test/view-markup"

describe("PendingReply", () => {
  it("shows the run's notice as a polite status line", () => {
    const markup = viewMarkup(<PendingReply label="Compiling" />)

    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain("Compiling")
  })
})

import { describe, expect, it } from "vitest"
import { StatusDot } from "@/components/status-dot"
import { viewMarkup } from "@/test/view-markup"

describe("StatusDot", () => {
  it("can show an idle chat without a label, so it is not announced", () => {
    const html = viewMarkup(<StatusDot status="idle" />)

    expect(html).not.toContain("aria-label")
    expect(html).not.toContain('role="img"')
  })

  it("can label a running chat as working", () => {
    const html = viewMarkup(<StatusDot status="running" />)

    expect(html).toContain('aria-label="Working"')
    expect(html).toContain('role="img"')
  })

  it("can label a chat that waits for the user as needing input", () => {
    expect(viewMarkup(<StatusDot status="waiting" />)).toContain('aria-label="Needs your input"')
  })

  it("can mark a chat that stopped with an error in the destructive colour", () => {
    const html = viewMarkup(<StatusDot status="error" />)

    expect(html).toContain('aria-label="Stopped with an error"')
    expect(html).toContain("bg-destructive/50")
  })

  it("can show a finished chat as done in green", () => {
    const html = viewMarkup(<StatusDot status="done" />)

    expect(html).toContain('aria-label="Finished"')
    expect(html).toContain("bg-success")
  })
})

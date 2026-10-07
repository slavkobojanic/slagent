import { describe, expect, it } from "vitest"
import { Status } from "@/features/transcript/status/status"
import { viewMarkup } from "@/test/view-markup"

describe("Status", () => {
  it("shows Thinking while the model has not answered and there is no notice", () => {
    const markup = viewMarkup(<Status pending notice={null} />)

    expect(markup).toContain('role="status"')
    expect(markup).toContain("Thinking")
  })

  it("shows the notice as the working label while the model has not answered", () => {
    const markup = viewMarkup(<Status pending notice="Compacting" />)

    expect(markup).toContain('role="status"')
    expect(markup).toContain("Compacting")
  })

  it("shows the notice as a plain line once the model is answering", () => {
    const markup = viewMarkup(<Status pending={false} notice="Retrying" />)

    expect(markup).not.toContain('role="status"')
    expect(markup).toContain("Retrying")
  })

  it("renders nothing with no notice and nothing pending", () => {
    const markup = viewMarkup(<Status pending={false} notice={null} />)

    expect(markup).toBe("")
  })
})

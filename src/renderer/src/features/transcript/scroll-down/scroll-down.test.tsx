import { describe, expect, it } from "vitest"
import { ScrollDown } from "@/features/transcript/scroll-down/scroll-down"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("ScrollDown", () => {
  it("renders nothing while the reader is at the bottom", () => {
    const markup = viewMarkup(<ScrollDown visible={false} label={undefined} onClick={noop} />)

    expect(markup).toBe("")
  })

  it("shows the jump label when newer turns are outside the window", () => {
    const markup = viewMarkup(<ScrollDown visible label="Jump to latest" onClick={noop} />)

    expect(markup).toContain('aria-label="Jump to latest"')
  })
})

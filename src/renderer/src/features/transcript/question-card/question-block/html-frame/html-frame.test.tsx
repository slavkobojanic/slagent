import { describe, expect, it } from "vitest"
import { HtmlFrame, type HtmlFrameProps } from "@/features/transcript/question-card/question-block/html-frame/html-frame"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<HtmlFrameProps> = {}): HtmlFrameProps {
  return { html: "<p>Mock</p>", title: "Preview", frameKey: "q1:media", theme: "dark", height: 160, ...overrides }
}

describe("HtmlFrame", () => {
  it("can render a mockup in a sandboxed frame at its height", () => {
    const markup = viewMarkup(<HtmlFrame {...props({ height: 240 })} />)

    expect(markup).toContain('sandbox="allow-scripts"')
    expect(markup).toContain("height: 240px;")
  })

  it("can build the mockup's document for the light theme", () => {
    const markup = viewMarkup(<HtmlFrame {...props({ theme: "light" })} />)

    expect(markup).toContain("color-scheme: light;")
  })
})

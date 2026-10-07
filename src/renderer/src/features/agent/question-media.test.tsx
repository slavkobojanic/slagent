import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Media, type QuestionMediaProps } from "@/features/agent/question-media"
import { viewMarkup } from "@/test/view-markup"

const nothing = () => {}

function props(overrides: Partial<QuestionMediaProps> = {}): QuestionMediaProps {
  return {
    title: "Preview",
    frameKey: "q1:media",
    theme: "dark",
    frameHeights: {},
    brokenImages: {},
    zoomed: false,
    onImageError: nothing,
    onZoomChange: nothing,
    ...overrides,
  }
}

describe("Media", () => {
  it("can render nothing when there is no image, mockup, or preview", () => {
    const markup = viewMarkup(<Media {...props()} />)

    expect(markup).toBe("")
  })

  it("can render an image that opens larger", () => {
    const markup = viewMarkup(<Media {...props({ image: "shot.png" })} />)

    expect(markup).toContain('src="shot.png"')
    expect(markup).toContain('title="View larger"')
  })

  it("can show the failure message once the image has failed to load", () => {
    const markup = viewMarkup(<Media {...props({ image: "shot.png", brokenImages: { "shot.png": true } })} />)

    expect(markup).toContain("The image didn't load.")
    expect(markup).not.toContain("<img")
  })

  it("can render a mockup at the default height before it reports one", () => {
    const markup = viewMarkup(<Media {...props({ html: "<p>Mock</p>" })} />)

    expect(markup).toContain("height: 160px;")
  })

  it("can render a mockup at the height it reported", () => {
    const markup = viewMarkup(<Media {...props({ html: "<p>Mock</p>", frameHeights: { "q1:media": 240 } })} />)

    expect(markup).toContain("height: 240px;")
  })

  it("can build the mockup's document for the light theme", () => {
    const markup = viewMarkup(<Media {...props({ html: "<p>Mock</p>", theme: "light" })} />)

    expect(markup).toContain("color-scheme: light;")
  })

  it("can open the image in a dialog while it is zoomed", () => {
    render(<Media {...props({ image: "shot.png", zoomed: true })} />)

    expect(screen.getByRole("dialog")).toBeTruthy()
  })
})

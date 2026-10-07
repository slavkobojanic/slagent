import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { QuestionImage, type QuestionImageProps } from "@/features/transcript/question-card/question-block/question-media/question-image/question-image"
import { viewMarkup } from "@/test/view-markup"

const nothing = () => {}

function props(overrides: Partial<QuestionImageProps> = {}): QuestionImageProps {
  return { src: "shot.png", alt: "Preview", broken: false, zoomed: false, onError: nothing, onZoomChange: nothing, ...overrides }
}

describe("QuestionImage", () => {
  it("can render an image that opens larger", () => {
    const markup = viewMarkup(<QuestionImage {...props()} />)

    expect(markup).toContain('src="shot.png"')
    expect(markup).toContain('title="View larger"')
  })

  it("can show the failure message once the image has failed to load", () => {
    const markup = viewMarkup(<QuestionImage {...props({ broken: true })} />)

    expect(markup).toContain("The image didn't load.")
    expect(markup).not.toContain("<img")
  })

  it("can open the image in a dialog while it is zoomed", () => {
    render(<QuestionImage {...props({ zoomed: true })} />)

    expect(screen.getByRole("dialog")).toBeTruthy()
  })
})

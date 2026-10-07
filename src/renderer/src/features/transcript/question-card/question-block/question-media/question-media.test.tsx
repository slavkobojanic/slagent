import { describe, expect, it } from "vitest"
import { QuestionMedia, type QuestionMediaProps } from "@/features/transcript/question-card/question-block/question-media/question-media"
import { viewMarkup } from "@/test/view-markup"

function Image({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} />
}

function HtmlFrame({ frameKey }: { html: string; title: string; frameKey: string }) {
  return <iframe title={frameKey} />
}

function props(overrides: Partial<QuestionMediaProps> = {}): QuestionMediaProps {
  return { title: "Preview", frameKey: "q1:media", Image, HtmlFrame, ...overrides }
}

describe("QuestionMedia", () => {
  it("can render nothing when there is no image, mockup, or preview", () => {
    const markup = viewMarkup(<QuestionMedia {...props()} />)

    expect(markup).toBe("")
  })

  it("can render the image with the question as its text", () => {
    const markup = viewMarkup(<QuestionMedia {...props({ image: "shot.png" })} />)

    expect(markup).toContain('src="shot.png"')
    expect(markup).toContain('alt="Preview"')
  })

  it("can render a mockup frame under the media key", () => {
    const markup = viewMarkup(<QuestionMedia {...props({ html: "<p>Mock</p>" })} />)

    expect(markup).toContain('title="q1:media"')
  })

  it("can render a markdown preview", () => {
    const markup = viewMarkup(<QuestionMedia {...props({ preview: "Some **notes**" })} />)

    expect(markup).toContain("notes")
  })
})

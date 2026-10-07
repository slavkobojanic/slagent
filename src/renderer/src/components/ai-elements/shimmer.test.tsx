import { describe, expect, it } from "vitest"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { viewMarkup } from "@/test/view-markup"

describe("Shimmer", () => {
  it("renders its text as a paragraph by default", () => {
    const markup = viewMarkup(<Shimmer>Working</Shimmer>)

    expect(markup.startsWith("<p")).toBe(true)
    expect(markup).toContain("Working")
  })

  it("renders as the element it is given", () => {
    const markup = viewMarkup(<Shimmer as="span">Thinking...</Shimmer>)

    expect(markup.startsWith("<span")).toBe(true)
    expect(markup).toContain("Thinking...")
  })
})

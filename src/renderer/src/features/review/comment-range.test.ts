import { afterEach, describe, expect, it } from "vitest"
import { findRange } from "@/features/review/comment-range"

function rootWith(html: string): HTMLElement {
  const root = document.createElement("div")
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe("findRange", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("can find words that are split across elements", () => {
    const root = rootWith("<p>Use <strong>a</strong> map.</p>")

    const range = findRange(root, "a map")

    expect(range?.toString()).toBe("a map")
  })

  it("can find the occurrence nearest the offset when the words repeat", () => {
    const root = rootWith("<p>Use a map. Use a map.</p>")

    const first = findRange(root, "a map", 0)
    const second = findRange(root, "a map", 20)

    expect(first?.startOffset).toBe(4)
    expect(second?.startOffset).toBe(15)
  })

  it("can match words across line breaks as they render", () => {
    const root = rootWith("<p>one\n    two</p>")

    expect(findRange(root, "one two")?.toString()).toBe("one\n    two")
  })

  it("can return nothing when the words are not rendered", () => {
    const root = rootWith("<p>Use a map.</p>")

    expect(findRange(root, "a set")).toBeNull()
  })
})

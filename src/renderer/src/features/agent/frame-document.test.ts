import { describe, expect, it } from "vitest"
import { frameDocument, parseFrameReport } from "@/features/agent/frame-document"

describe("frameDocument", () => {
  it("can wrap a fragment in a document with the light base style when the theme is light", () => {
    const doc = frameDocument("<p>Hi</p>", "light", "q1:media")

    expect(doc.startsWith("<!doctype html>")).toBe(true)
    expect(doc).toContain("color-scheme: light;")
    expect(doc).toContain("color: rgba(0, 0, 0, 0.9);")
    expect(doc).toContain("<body><p>Hi</p><script>")
  })

  it("can use the light text colour on a dark document", () => {
    const doc = frameDocument("<p>Hi</p>", "dark", "q1:media")

    expect(doc).toContain("color-scheme: dark;")
    expect(doc).toContain("color: rgba(255, 255, 255, 0.9);")
  })

  it("can keep a full document and place the size script before its closing body", () => {
    const doc = frameDocument("<html><body><p>Hi</p></body></html>", "dark", "q1:media")

    expect(doc).toContain("<p>Hi</p><script>")
    expect(doc.indexOf("<script>")).toBeLessThan(doc.indexOf("</body>"))
  })

  it("can append the size script to a full document that has no closing body", () => {
    const doc = frameDocument("<html><p>Hi</p></html>", "dark", "q1:media")

    expect(doc.endsWith("</script>")).toBe(true)
  })

  it("can keep a dollar sign in the frame key when it places the script", () => {
    const doc = frameDocument("<html><body></body></html>", "dark", "q$&:media")

    expect(doc).toContain('"q$&:media"')
    expect(doc).not.toContain("</body></body>")
  })

  it("can escape a key so it cannot close the script tag", () => {
    const doc = frameDocument("<p>Hi</p>", "dark", "</script><b>")

    expect(doc).toContain("\\u003c/script>")
    expect(doc.split("</script>")).toHaveLength(2)
  })
})

describe("parseFrameReport", () => {
  it("can read the key and the height from a frame report", () => {
    expect(parseFrameReport({ slagentFrameKey: "q1:media", slagentFrameHeight: 120 })).toEqual({ key: "q1:media", height: 120 })
  })

  it("can ignore data that is not an object", () => {
    expect(parseFrameReport("height")).toBeNull()
  })

  it("can ignore a report without a key", () => {
    expect(parseFrameReport({ slagentFrameHeight: 120 })).toBeNull()
  })

  it("can ignore a height that is not a finite number", () => {
    expect(parseFrameReport({ slagentFrameKey: "q1:media", slagentFrameHeight: Infinity })).toBeNull()
  })
})

import { describe, expect, it } from "vitest"
import { base64FromDataUrl } from "@/features/composer/attachments/data-url"

describe("base64FromDataUrl", () => {
  it("can return the bytes after the base64 marker", () => {
    expect(base64FromDataUrl("data:text/plain;base64,aGk=")).toBe("aGk=")
  })

  it("can return null when the URL has no base64 part", () => {
    expect(base64FromDataUrl("blob:abc")).toBeNull()
  })

  it("can return null when there is no URL", () => {
    expect(base64FromDataUrl(null)).toBeNull()
  })
})

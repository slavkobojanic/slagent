import { describe, expect, it } from "vitest"
import { contrastText } from "@/lib/color"

describe("contrastText", () => {
  it("can pick white over the dark colours", () => {
    expect(contrastText("#3b82f6")).toBe("#ffffff")
    expect(contrastText("#a855f7")).toBe("#ffffff")
    expect(contrastText("#ef4444")).toBe("#ffffff")
  })

  it("can pick black over the light colours", () => {
    expect(contrastText("#eab308")).toBe("#000000")
    expect(contrastText("#84cc16")).toBe("#000000")
    expect(contrastText("#06b6d4")).toBe("#000000")
  })

  it("can fall back to white for a colour it cannot read", () => {
    expect(contrastText("not-a-colour")).toBe("#ffffff")
  })
})

import { describe, expect, it } from "vitest"
import { layoutFor } from "@/features/mobile/mobile-screen"

describe("layoutFor", () => {
  it("can use the phone stack on a phone", () => {
    expect(layoutFor(390, 844)).toBe("phone")
    expect(layoutFor(844, 390)).toBe("landscape")
  })

  it("can dock three panes on an iPad in landscape", () => {
    expect(layoutFor(1180, 820)).toBe("landscape")
  })

  it("can use tabs on an iPad in portrait", () => {
    expect(layoutFor(820, 1180)).toBe("portrait")
  })

  it("can fall back to the stack in a narrow Split View", () => {
    expect(layoutFor(320, 1024)).toBe("phone")
  })
})

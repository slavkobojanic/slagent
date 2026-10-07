import { describe, expect, it } from "vitest"
import { choice, DEFAULT, tri, triValue } from "@/features/settings/personalisation-settings/choice-select/choice-value"

describe("choice", () => {
  it("can map Default to null", () => {
    expect(choice(DEFAULT)).toBeNull()
  })

  it("can keep any other value", () => {
    expect(choice("direct")).toBe("direct")
  })
})

describe("triValue", () => {
  it("can map yes and no to booleans", () => {
    expect(triValue("yes")).toBe(true)
    expect(triValue("no")).toBe(false)
  })

  it("can map Default to null", () => {
    expect(triValue(DEFAULT)).toBeNull()
  })
})

describe("tri", () => {
  it("can map booleans to yes and no", () => {
    expect(tri(true)).toBe("yes")
    expect(tri(false)).toBe("no")
  })

  it("can map null to null", () => {
    expect(tri(null)).toBeNull()
  })
})

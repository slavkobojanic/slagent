import { describe, expect, it } from "vitest"
import { qrShape } from "./qr"

describe("qrShape", () => {
  it("can draw a square code with dark modules when given text", () => {
    const shape = qrShape("slagent://connect?host=100.64.0.1&port=8747&token=t")
    expect(shape.size).toBeGreaterThanOrEqual(21)
    expect(shape.path.startsWith("M0 0h1v1h-1z")).toBe(true)
  })
})

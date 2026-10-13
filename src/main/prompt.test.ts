import { describe, expect, it } from "vitest"
import { parsePrompt, withComments } from "./prompt"

describe("withComments", () => {
  it("can quote a diff comment on one line", () => {
    const text = withComments("Fix it", [{ id: "a", path: "src/a.ts", line: 4, side: "new", code: "const a = 1", text: "Why one?" }])

    expect(text).toBe("Fix it\n\nComments on the code:\n- src/a.ts:4\n  > const a = 1\n  Why one?")
  })

  it("can quote every line of a range selected in the editor", () => {
    const text = withComments("", [{ id: "a", path: "src/a.ts", line: 2, endLine: 3, side: "new", code: "if (a) {\n  run()", text: "What runs?" }])

    expect(text).toBe("Comments on the code:\n- src/a.ts:2-3\n  > if (a) {\n  >   run()\n  What runs?")
  })
})

describe("parsePrompt", () => {
  it("can keep the end line and a longer quote for a range", () => {
    const code = "x".repeat(1500)
    const request = parsePrompt({ text: "", comments: [{ path: "a.ts", line: 1, endLine: 9, code, text: "?" }] })

    expect(request.comments?.[0]).toMatchObject({ line: 1, endLine: 9, code })
  })

  it("can drop an end line that comes before the start", () => {
    const request = parsePrompt({ text: "", comments: [{ path: "a.ts", line: 5, endLine: 2, code: "x".repeat(900), text: "?" }] })

    expect(request.comments?.[0].endLine).toBeUndefined()
    expect(request.comments?.[0].code).toHaveLength(500)
  })
})

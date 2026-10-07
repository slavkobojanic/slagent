import { describe, expect, it } from "vitest"
import { listItems, normalize } from "@/features/review/comment-text"

describe("listItems", () => {
  it("can split a list into its items", () => {
    expect(listItems("- first\n- second")).toEqual(["- first", "- second"])
  })

  it("can keep nested lines with the item they belong to", () => {
    const block = "1. first\n   detail\n2. second"

    expect(listItems(block)).toEqual(["1. first\n   detail", "2. second"])
  })

  it("can leave a single item whole", () => {
    expect(listItems("- only")).toBeNull()
  })

  it("can leave a block that is not a list whole", () => {
    expect(listItems("A paragraph.\nMore text.")).toBeNull()
  })
})

describe("normalize", () => {
  it("can collapse runs of whitespace and trim the ends", () => {
    expect(normalize("  a \n  b\tc  ")).toBe("a b c")
  })
})

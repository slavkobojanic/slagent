import { createElement } from "react"
import { describe, expect, it } from "vitest"
import type { ReplyComment } from "@shared/types"
import { blockItems, blockMarkdown, commentUnitView, responseUnits, unitKeyOf, type CommentUnit, type CommentUnitInput } from "@/features/transcript/commentable-response/comment-model"

const block = "Use a map."
const whole: ReplyComment = { id: "w1", messageId: "m1", block, quote: block, text: "all of it" }
const excerpt: ReplyComment = { id: "e1", messageId: "m1", block, quote: "a map", at: 4, text: "why" }

const unit: CommentUnit = { key: "m1\nUse a map.", messageId: "m1", block, enabled: true }

function view(overrides: Partial<CommentUnitInput> = {}) {
  return commentUnitView({ unit, replies: [], draft: null, pending: null, card: null, cardOpen: false, ...overrides })
}

describe("blockMarkdown", () => {
  it("can read the markdown of a block from the text of its single child element", () => {
    expect(blockMarkdown(createElement("p", null, "Use a map."))).toBe("Use a map.")
  })

  it("can return nothing when the child is not an element whose only child is text", () => {
    expect(blockMarkdown(createElement("div", null, createElement("span", null, "x")))).toBeNull()
    expect(blockMarkdown("Use a map.")).toBeNull()
    expect(blockMarkdown(null)).toBeNull()
  })
})

describe("blockItems", () => {
  it("can split a finished list into its items", () => {
    expect(blockItems("- one\n- two", false)).toEqual(["- one", "- two"])
  })

  it("can keep a list whole while the response is still streaming", () => {
    expect(blockItems("- one\n- two", true)).toBeNull()
  })

  it("can leave a block that is not a list whole", () => {
    expect(blockItems("A paragraph.", false)).toBeNull()
  })
})

describe("responseUnits", () => {
  it("can comment on a block as a whole", () => {
    const units = responseUnits("m1", createElement("p", null, "Use a map. "), false)

    expect(units).toEqual({ whole: { key: unitKeyOf("m1", "Use a map."), messageId: "m1", block: "Use a map.", enabled: true }, items: [] })
  })

  it("can keep a streaming block from taking a new comment", () => {
    const units = responseUnits("m1", createElement("p", null, "Use a map."), true)

    expect(units.whole?.enabled).toBe(false)
  })

  it("can comment on each item of a finished list", () => {
    const units = responseUnits("m1", createElement("p", null, "- one\n- two"), false)

    expect(units.whole).toBeNull()
    expect(units.items.map((item) => item.block)).toEqual(["- one", "- two"])
  })

  it("can find no units in a child that is not a block", () => {
    expect(responseUnits("m1", "plain text", false)).toEqual({ whole: null, items: [] })
  })
})

describe("unitKeyOf", () => {
  it("can key a unit by its message and its markdown, the same way every time", () => {
    expect(unitKeyOf("m1", block)).toBe(unitKeyOf("m1", block))
    expect(unitKeyOf("m1", block)).not.toBe(unitKeyOf("m2", block))
  })
})

describe("commentUnitView", () => {
  describe("gutter", () => {
    it("can show the gutter button on a block that can take a comment", () => {
      expect(view().gutter).toBe(true)
    })

    it("can hide the gutter button while the response streams", () => {
      expect(view({ unit: { ...unit, enabled: false } }).gutter).toBe(false)
    })

    it("can hide the gutter button on an empty block", () => {
      expect(view({ unit: { ...unit, block: "" } }).gutter).toBe(false)
    })

    it("can hide the gutter button when the whole block already has a comment", () => {
      expect(view({ replies: [whole] }).gutter).toBe(false)
    })

    it("can hide the gutter button while a draft is open", () => {
      expect(view({ draft: { quote: block } }).gutter).toBe(false)
    })
  })

  describe("highlights", () => {
    it("can highlight the whole block when it has a whole-block comment", () => {
      expect(view({ replies: [whole] }).wholeHighlighted).toBe(true)
    })

    it("can highlight the whole block while a draft is open on it", () => {
      expect(view({ draft: { quote: block } }).wholeHighlighted).toBe(true)
    })

    it("can mark the commented words of each excerpt and the whole block", () => {
      const result = view({ replies: [whole, excerpt] })

      expect(result.marks).toEqual([
        { key: "e1", quote: "a map", at: 4 },
        { key: "whole", quote: "" },
      ])
    })

    it("can mark the words of a new draft that is not the whole block", () => {
      const result = view({ draft: { quote: "a map", at: 4 } })

      expect(result.marks).toEqual([{ key: "draft", quote: "a map", at: 4 }])
    })

    it("can leave the words of an edit out of the marks, because the saved comment marks them", () => {
      const result = view({ replies: [excerpt], draft: { id: "e1", quote: "a map", at: 4 } })

      expect(result.marks).toEqual([{ key: "e1", quote: "a map", at: 4 }])
    })

    it("can mark nothing on a block without comments or a draft", () => {
      expect(view().marks).toEqual([])
    })
  })

  describe("draft", () => {
    it("can open a new draft with the add label and no text", () => {
      expect(view({ draft: { quote: block } }).draft).toEqual({ initial: "", saveLabel: "Add comment" })
    })

    it("can open an edit with the saved text and the save label", () => {
      const result = view({ replies: [excerpt], draft: { id: "e1", quote: "a map", at: 4 } })

      expect(result.draft).toEqual({ initial: "why", saveLabel: "Save" })
    })

    it("can open no draft when none is set", () => {
      expect(view().draft).toBeNull()
    })
  })

  describe("pending selection", () => {
    it("can offer the comment button at the selection", () => {
      expect(view({ pending: { quote: "a map", at: 4, top: 10, left: 20 } }).pending).toEqual({ top: 10, left: 20 })
    })

    it("can hide the comment button while a draft is open", () => {
      expect(view({ pending: { quote: "a map", at: 4, top: 10, left: 20 }, draft: { quote: "a map", at: 4 } }).pending).toBeNull()
    })
  })

  describe("card", () => {
    it("can show the card of the commented excerpt under the pointer", () => {
      const result = view({ replies: [excerpt], card: { commentId: "e1", top: 5, left: 9 }, cardOpen: false })

      expect(result.card).toEqual({ comment: excerpt, top: 5, left: 9 })
    })

    it("can hide the card while a draft is open", () => {
      const result = view({ replies: [excerpt], card: { commentId: "e1", top: 5, left: 9 }, draft: { quote: block } })

      expect(result.card).toBeNull()
    })

    it("can hide the card when its comment has been removed", () => {
      const result = view({ replies: [], card: { commentId: "e1", top: 5, left: 9 } })

      expect(result.card).toBeNull()
    })
  })

  describe("hover card", () => {
    it("can open the whole-block hover card when the block has a comment and the hover is open", () => {
      expect(view({ replies: [whole], cardOpen: true }).hoverOpen).toBe(true)
    })

    it("can keep the whole-block hover card closed while an excerpt card is shown", () => {
      expect(view({ replies: [whole, excerpt], cardOpen: true, card: { commentId: "e1", top: 0, left: 0 } }).hoverOpen).toBe(false)
    })

    it("can keep the whole-block hover card closed while a draft is open", () => {
      expect(view({ replies: [whole], cardOpen: true, draft: { quote: block } }).hoverOpen).toBe(false)
    })

    it("can keep the whole-block hover card closed when the block has no comment", () => {
      expect(view({ cardOpen: true }).hoverOpen).toBe(false)
    })
  })
})

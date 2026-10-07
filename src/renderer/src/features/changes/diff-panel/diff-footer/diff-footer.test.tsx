import { describe, expect, it } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { DiffFooter } from "./diff-footer"

describe("DiffFooter", () => {
  it("can show the message box above the commit actions", () => {
    const markup = viewMarkup(<DiffFooter CommitMessage={() => <p>Message box</p>} CommitActions={() => <p>Actions</p>} />)

    expect(markup.startsWith("<footer")).toBe(true)
    expect(markup.indexOf("Message box")).toBeLessThan(markup.indexOf("Actions"))
  })
})

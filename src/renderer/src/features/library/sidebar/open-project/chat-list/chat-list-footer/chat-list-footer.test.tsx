import { describe, expect, it } from "vitest"
import { ChatListFooter } from "@/features/library/sidebar/open-project/chat-list/chat-list-footer/chat-list-footer"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("ChatListFooter", () => {
  it("can offer to show the rest of a long chat list", () => {
    expect(viewMarkup(<ChatListFooter hiddenCount={3} canShowLess={false} onShowAll={noop} onShowLess={noop} />)).toContain("Show 3 more")
  })

  it("can offer to show fewer chats once the full list is showing", () => {
    expect(viewMarkup(<ChatListFooter hiddenCount={0} canShowLess onShowAll={noop} onShowLess={noop} />)).toContain("Show less")
  })

  it("can render nothing when the whole list fits", () => {
    expect(viewMarkup(<ChatListFooter hiddenCount={0} canShowLess={false} onShowAll={noop} onShowLess={noop} />)).toBe("")
  })
})

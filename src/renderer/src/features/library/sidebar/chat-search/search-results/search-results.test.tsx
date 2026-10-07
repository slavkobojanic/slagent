import { describe, expect, it } from "vitest"
import type { ChatSearchResult } from "@shared/types"
import { SearchResults } from "@/features/library/sidebar/chat-search/search-results/search-results"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

const result: ChatSearchResult = {
  projectId: "p1",
  projectName: "Atlas",
  chatId: "c1",
  title: "Launch plan",
  snippet: "the launch",
  messageId: null,
  updatedAt: 1,
}

describe("SearchResults", () => {
  it("can list each match with its project and snippet", () => {
    const html = viewMarkup(<SearchResults results={[result]} openChatId={null} onOpen={noop} />)

    expect(html).toContain("Launch plan")
    expect(html).toContain("Atlas")
    expect(html).toContain("the launch")
  })

  it("can highlight the match whose chat is open", () => {
    expect(viewMarkup(<SearchResults results={[result]} openChatId="c1" onOpen={noop} />)).toContain("bg-foreground/10")
  })

  it("can say when no chat matches the search", () => {
    expect(viewMarkup(<SearchResults results={[]} openChatId={null} onOpen={noop} />)).toContain("No matching chats")
  })
})

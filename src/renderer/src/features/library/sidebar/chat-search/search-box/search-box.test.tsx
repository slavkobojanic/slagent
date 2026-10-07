import { describe, expect, it } from "vitest"
import { SearchBox, type SearchBoxProps } from "@/features/library/sidebar/chat-search/search-box/search-box"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

const base: SearchBoxProps = { inputId: "chat-search", query: "", onQueryChange: noop, onKeyDown: noop, onClear: noop }

describe("SearchBox", () => {
  it("can render the search field with the id the search shortcut focuses", () => {
    const html = viewMarkup(<SearchBox {...base} />)

    expect(html).toContain('id="chat-search"')
    expect(html).toContain('placeholder="Search chats"')
  })

  it("can show the clear button only while a query is typed", () => {
    expect(viewMarkup(<SearchBox {...base} query="pl" />)).toContain('aria-label="Clear search"')
    expect(viewMarkup(<SearchBox {...base} query="" />)).not.toContain('aria-label="Clear search"')
  })
})

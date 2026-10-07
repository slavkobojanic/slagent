import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { Suggestions, type SuggestionMenuView } from "@/features/composer/suggestions"

const rows = [
  { key: "a", label: "@a.ts", detail: "src/a.ts" },
  { key: "b", label: "@b.ts", detail: "src/b.ts" },
]

function render(menu: SuggestionMenuView, active = 0) {
  return viewMarkup(<Suggestions menu={menu} active={active} onHover={vi.fn()} onChoose={vi.fn()} />)
}

describe("Suggestions", () => {
  it("can show a title and a note for a history search with no matches", () => {
    const markup = render({ title: "History search: zzz", empty: "No matching prompts", items: [] })

    expect(markup).toContain("History search: zzz")
    expect(markup).toContain("No matching prompts")
  })

  it("can list each row with its label and detail", () => {
    const markup = render({ title: null, empty: null, items: rows })

    expect(markup).toContain("@a.ts")
    expect(markup).toContain("src/b.ts")
  })

  it("can highlight the active row only", () => {
    const markup = render({ title: null, empty: null, items: rows }, 1)

    expect(markup.match(/bg-white text-black/g)).toHaveLength(1)
    expect(markup.indexOf("bg-white text-black")).toBeGreaterThan(markup.indexOf("@a.ts"))
  })
})

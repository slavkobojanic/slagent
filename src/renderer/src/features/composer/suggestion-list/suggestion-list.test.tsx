import { render as renderView } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { SuggestionList, type SuggestionListMenu } from "@/features/composer/suggestion-list/suggestion-list"

const rows = [
  { key: "a", label: "@a.ts", detail: "src/a.ts" },
  { key: "b", label: "@b.ts", detail: "src/b.ts" },
]

function render(menu: SuggestionListMenu | null, active = 0) {
  return viewMarkup(<SuggestionList menu={menu} active={active} onHover={vi.fn()} onChoose={vi.fn()} />)
}

describe("SuggestionList", () => {
  it("can render nothing while no menu is open", () => {
    expect(render(null)).toBe("")
  })

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

  it("can scroll the active row into view", () => {
    const items = Array.from({ length: 30 }, (_, index) => ({ key: `r${index}`, label: `@r${index}.ts`, detail: `src/r${index}.ts` }))
    const view = renderView(<SuggestionList menu={{ title: null, empty: null, items }} active={0} onHover={vi.fn()} onChoose={vi.fn()} />)
    const list = view.container.querySelector(".max-h-56") as HTMLElement
    // The rows are 28px tall and the list shows 224px of them.
    for (const [index, row] of Array.from(list.children).entries()) {
      Object.defineProperty(row, "offsetTop", { value: index * 28, configurable: true })
      Object.defineProperty(row, "offsetHeight", { value: 28, configurable: true })
    }
    Object.defineProperty(list, "clientHeight", { value: 224, configurable: true })

    view.rerender(<SuggestionList menu={{ title: null, empty: null, items }} active={20} onHover={vi.fn()} onChoose={vi.fn()} />)
    expect(list.scrollTop).toBe(20 * 28 + 28 - 224)

    view.rerender(<SuggestionList menu={{ title: null, empty: null, items }} active={0} onHover={vi.fn()} onChoose={vi.fn()} />)
    expect(list.scrollTop).toBe(0)
  })
})

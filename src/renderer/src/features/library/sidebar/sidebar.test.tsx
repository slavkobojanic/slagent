import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { Sidebar, type SidebarProps } from "@/features/library/sidebar/sidebar"
import { viewMarkup } from "@/test/view-markup"

// Radix's scroll area observes its size, and jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

function slot(name: string) {
  return function Slot() {
    return <div data-slot={name} />
  }
}

const base: SidebarProps = {
  searching: false,
  SearchBox: slot("search-box"),
  SearchResults: slot("search-results"),
  ChooseFolder: slot("choose-folder"),
  OtherProjects: slot("other-projects"),
  ResizeHandle: slot("resize-handle"),
}

describe("Sidebar", () => {
  it("can render the search box inside an aside, the element the shell's slot styles", () => {
    const html = viewMarkup(<Sidebar {...base} />)

    expect(html.startsWith("<aside")).toBe(true)
    expect(html).toContain('data-slot="search-box"')
    expect(html).toContain('data-slot="resize-handle"')
  })

  it("can show the folder prompt above the unified project list, while not searching", () => {
    const html = viewMarkup(<Sidebar {...base} />)

    expect(html).toContain('data-slot="choose-folder"')
    expect(html).not.toContain('data-slot="search-results"')
    expect(html.indexOf('data-slot="choose-folder"')).toBeLessThan(html.indexOf('data-slot="other-projects"'))
  })

  it("can list search results in place of the project list", () => {
    const html = viewMarkup(<Sidebar {...base} searching />)

    expect(html).toContain('data-slot="search-results"')
    expect(html).not.toContain('data-slot="choose-folder"')
    expect(html).not.toContain('data-slot="other-projects"')
  })
})
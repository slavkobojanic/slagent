import { render, screen } from "@testing-library/react"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { CommandPalette, type CommandPaletteProps } from "@/features/library/command-palette/command-palette"

const noop = () => undefined

// cmdk and the dialog observe sizes and scroll the selected item into view. jsdom has neither.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub)
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, writable: true, value: () => undefined })
})

afterAll(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(Element.prototype, "scrollIntoView")
})

const base: CommandPaletteProps = {
  open: true,
  query: "",
  groups: [],
  onOpenChange: noop,
  onQueryChange: noop,
}

describe("CommandPalette", () => {
  it("can show each group's heading with its items and shortcut hints", () => {
    const groups = [
      {
        heading: "Actions",
        items: [{ id: "chat.new", value: "chat.new New chat", label: "New chat", shortcut: "⌘N", onSelect: noop }],
      },
    ]

    render(<CommandPalette {...base} groups={groups} />)

    expect(screen.queryByText("Actions")).not.toBeNull()
    expect(screen.queryByText("New chat")).not.toBeNull()
    expect(screen.queryByText("⌘N")).not.toBeNull()
  })

  it("can say there are no results when no group has an item", () => {
    render(<CommandPalette {...base} groups={[]} />)

    expect(screen.queryByText("No results")).not.toBeNull()
  })

  it("can show nothing of the palette while closed", () => {
    render(<CommandPalette {...base} open={false} groups={[]} />)

    expect(screen.queryByPlaceholderText("Type a command or search")).toBeNull()
  })

  it("can grey out a model item that cannot be chosen", () => {
    const groups = [
      {
        heading: "Models",
        items: [{ id: "m1", value: "model m1 Alpha", label: "Alpha", detail: "m1", disabled: true, onSelect: noop }],
      },
    ]

    render(<CommandPalette {...base} query="al" groups={groups} />)

    expect(screen.getByText("Alpha").closest("[cmdk-item]")?.getAttribute("data-disabled")).toBe("true")
  })
})

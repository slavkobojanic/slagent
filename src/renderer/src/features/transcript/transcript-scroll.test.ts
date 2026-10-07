import { describe, expect, it } from "vitest"
import { findMessage, nextPage, PAGE_MARGIN, visibleMessage } from "@/features/transcript/transcript-scroll"

// jsdom has no layout, so each element is given the box it should occupy.
function place(element: HTMLElement, top: number, bottom: number): HTMLElement {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: top,
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom - top,
    toJSON: () => ({}),
  })
  return element
}

function message(id: string): HTMLElement {
  const element = document.createElement("div")
  element.dataset.messageId = id
  return element
}

describe("nextPage", () => {
  it("can ask for older turns near the top when there are older turns", () => {
    expect(nextPage({ hasOlder: true, hasNewer: false }, PAGE_MARGIN - 1, 0)).toBe("older")
  })

  it("can ask for nothing near the top once the reader is past the margin", () => {
    expect(nextPage({ hasOlder: true, hasNewer: false }, PAGE_MARGIN, 0)).toBeNull()
  })

  it("can ask for newer turns near the bottom when there are newer turns", () => {
    expect(nextPage({ hasOlder: false, hasNewer: true }, 0, PAGE_MARGIN - 1)).toBe("newer")
  })

  it("can ask for nothing near an edge that has no more turns", () => {
    expect(nextPage({ hasOlder: false, hasNewer: false }, 0, 0)).toBeNull()
  })

  it("can prefer older turns when both edges qualify", () => {
    expect(nextPage({ hasOlder: true, hasNewer: true }, 0, 0)).toBe("older")
  })
})

describe("visibleMessage", () => {
  it("can return the first message whose bottom is below the scroller top, with its offset", () => {
    const scroller = document.createElement("div")
    place(scroller, 0, 500)
    const above = place(message("a"), -50, -10)
    const shown = place(message("b"), 20, 60)
    scroller.append(above, shown)

    expect(visibleMessage(scroller)).toEqual({ id: "b", top: 20 })
  })

  it("can return nothing when no message is on screen", () => {
    const scroller = document.createElement("div")
    place(scroller, 0, 500)
    scroller.append(place(message("a"), -90, -40))

    expect(visibleMessage(scroller)).toBeNull()
  })
})

describe("findMessage", () => {
  it("can find a message by its id within a root", () => {
    const root = document.createElement("div")
    const wanted = message("b")
    root.append(message("a"), wanted)

    expect(findMessage(root, "b")).toBe(wanted)
  })

  it("can find nothing for an id that is not rendered", () => {
    const root = document.createElement("div")
    root.append(message("a"))

    expect(findMessage(root, "missing")).toBeNull()
  })
})

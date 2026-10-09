import { describe, expect, it } from "vitest"
import { Library } from "@/features/library/library"
import { viewMarkup } from "@/test/view-markup"

function slot(name: string) {
  return function Slot() {
    return <div data-slot={name} />
  }
}

describe("Library", () => {
  it("can render the sidebar first, then the dialogs and the palette", () => {
    const html = viewMarkup(
      <Library
        Sidebar={slot("sidebar")}
        ChatDeletion={slot("chat-deletion")}
        ProjectRemoval={slot("project-removal")}
        ProjectAppearance={slot("project-appearance")}
        CommandPalette={slot("palette")}
      />,
    )

    expect(html).toBe(
      '<div data-slot="sidebar"></div><div data-slot="chat-deletion"></div><div data-slot="project-removal"></div><div data-slot="project-appearance"></div><div data-slot="palette"></div>',
    )
  })
})

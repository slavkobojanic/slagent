import { describe, expect, it } from "vitest"
import { PanelFrame, type PanelFrameProps } from "@/features/shell/panel-frame/panel-frame"
import { viewMarkup } from "@/test/view-markup"

const base: PanelFrameProps = {
  open: true,
  width: 560,
  resizing: false,
  visible: true,
  Changes: function Changes() {
    return <aside>changes</aside>
  },
}

function slotTag(markup: string): string {
  const start = markup.indexOf('class="panel-slot"')
  return markup.slice(start, markup.indexOf(">", start) + 1)
}

describe("PanelFrame", () => {
  it("can render the changes panel once a folder is open", () => {
    const markup = viewMarkup(<PanelFrame {...base} />)

    expect(markup).toContain("<aside>changes</aside>")
  })

  it("can leave out the changes panel until a folder is open", () => {
    const markup = viewMarkup(<PanelFrame {...base} visible={false} />)

    expect(markup).not.toContain("changes")
  })

  it("can collapse the panel slot and make it inert when the panel is closed", () => {
    const markup = viewMarkup(<PanelFrame {...base} open={false} />)

    expect(slotTag(markup)).toContain('data-closed="true"')
    expect(slotTag(markup)).toContain('inert=""')
  })

  it("can set the panel width on the slot", () => {
    const markup = viewMarkup(<PanelFrame {...base} width={600} />)

    expect(slotTag(markup)).toContain("--panel-width: 600px")
  })

  it("can mark the slot while the panel is being resized", () => {
    const markup = viewMarkup(<PanelFrame {...base} resizing />)

    expect(slotTag(markup)).toContain('data-resizing="true"')
  })
})

import type { ComponentType } from "react"
import { describe, expect, it } from "vitest"
import { Shell, type ShellProps } from "@/features/shell/shell"
import { viewMarkup } from "@/test/view-markup"

function slot(label: string): ComponentType {
  return function Slot() {
    return <div>{label}</div>
  }
}

const base: ShellProps = {
  inert: false,
  Header: slot("header"),
  SidebarFrame: slot("sidebar"),
  MainColumn: slot("main"),
  PanelFrame: slot("panel"),
  TerminalDrawer: slot("terminal"),
  TerminalBar: slot("terminal bar"),
  Settings: slot("settings dialog"),
  Models: slot("model dialog"),
  CreateSkill: slot("create skill dialog"),
}

function tagOf(markup: string, className: string): string {
  const start = markup.indexOf(`class="${className}"`)
  return markup.slice(start, markup.indexOf(">", start) + 1)
}

describe("Shell", () => {
  it("can lay out the header above the sidebar, the main column and the panel", () => {
    const markup = viewMarkup(<Shell {...base} />)

    expect(markup.indexOf("header")).toBeLessThan(markup.indexOf("sidebar"))
    expect(markup.indexOf("sidebar")).toBeLessThan(markup.indexOf("main"))
    expect(markup.indexOf("main")).toBeLessThan(markup.indexOf("panel"))
  })

  it("can lay the terminal drawer out under the sidebar, the main column and the panel", () => {
    const markup = viewMarkup(<Shell {...base} />)

    expect(markup.indexOf("panel")).toBeLessThan(markup.indexOf("terminal"))
    expect(markup.indexOf("terminal")).toBeLessThan(markup.indexOf("terminal bar"))
    expect(markup.indexOf("terminal bar")).toBeLessThan(markup.indexOf("settings dialog"))
  })

  it("can render the settings and model dialogs", () => {
    const markup = viewMarkup(<Shell {...base} />)

    expect(markup).toContain("settings dialog")
    expect(markup).toContain("model dialog")
  })

  it("can make the window inert while permissions are missing", () => {
    const markup = viewMarkup(<Shell {...base} inert />)

    expect(tagOf(markup, "flex h-full flex-col bg-background text-foreground")).toContain('inert=""')
  })

  it("can leave the window interactive once permissions are granted", () => {
    const markup = viewMarkup(<Shell {...base} />)

    expect(tagOf(markup, "flex h-full flex-col bg-background text-foreground")).not.toContain("inert")
  })
})

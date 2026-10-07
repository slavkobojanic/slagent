import type { ComponentType } from "react"
import { describe, expect, it } from "vitest"
import { ShellHeader, type ShellHeaderProps } from "@/features/shell/shell-header/shell-header"
import { viewMarkup } from "@/test/view-markup"

function slot(label: string): ComponentType {
  return function Slot() {
    return <span>{label}</span>
  }
}

const base: ShellHeaderProps = {
  macos: true,
  SidebarToggle: slot("sidebar toggle"),
  ProjectMenu: slot("project menu"),
  ChatTitle: slot("chat title"),
  UpdateButton: slot("update button"),
  ModelButton: slot("model button"),
  PanelToggle: slot("panel toggle"),
  SettingsButton: slot("settings button"),
}

describe("ShellHeader", () => {
  it("can leave room for the traffic lights on macOS", () => {
    const markup = viewMarkup(<ShellHeader {...base} />)

    expect(markup).toContain("pl-20")
  })

  it("can use the regular left padding off macOS", () => {
    const markup = viewMarkup(<ShellHeader {...base} macos={false} />)

    expect(markup).toContain("pl-4")
    expect(markup).not.toContain("pl-20")
  })

  it("can place the breadcrumb on the left and the actions on the right in order", () => {
    const markup = viewMarkup(<ShellHeader {...base} />)
    const order = ["sidebar toggle", "slagent", "project menu", "chat title", "update button", "model button", "panel toggle", "settings button"]
    const positions = order.map((label) => markup.indexOf(label))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })
})

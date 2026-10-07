import type { ComponentType } from "react"
import { describe, expect, it } from "vitest"
import { Shell, type ShellProps } from "@/features/shell/shell"
import { viewMarkup } from "@/test/view-markup"

// A slot that renders its label, so the markup shows which slot ended up where.
function slot(label: string): ComponentType {
  return function Slot() {
    return <div>{label}</div>
  }
}

const base: ShellProps = {
  header: <div>header</div>,
  inert: false,
  ready: true,
  metaError: null,
  actionError: null,
  transcriptKey: "transcript-draft",
  composerKey: "draft",
  sidebarOpen: true,
  sidebarWidth: 256,
  sidebarResizing: false,
  panelOpen: false,
  panelWidth: 560,
  panelResizing: false,
  showPanel: true,
  Sidebar: slot("sidebar"),
  Transcript: slot("transcript"),
  Composer: slot("composer"),
  RightPanel: slot("right panel"),
  SettingsDialog: slot("settings dialog"),
  ModelDialog: slot("model dialog"),
  CommandPalette: slot("command palette"),
  LibraryDialogs: slot("library dialogs"),
  PermissionsWizard: slot("permissions wizard"),
}

// The opening tag of the element with this class, so a test reads one element's attributes.
function tagOf(markup: string, className: string): string {
  const start = markup.indexOf(`class="${className}"`)
  return markup.slice(start, markup.indexOf(">", start) + 1)
}

describe("Shell", () => {
  it("can render the transcript and composer once the app is ready", () => {
    const markup = viewMarkup(<Shell {...base} />)

    expect(markup).toContain("transcript")
    expect(markup).toContain("composer")
    expect(markup).not.toContain("Starting")
  })

  it("can show a starting placeholder in place of the transcript until the app is ready", () => {
    const markup = viewMarkup(<Shell {...base} ready={false} />)

    expect(markup).toContain("Starting")
    expect(markup).not.toContain(">transcript<")
  })

  it("can make the window inert while permissions are missing", () => {
    const markup = viewMarkup(<Shell {...base} inert />)

    expect(tagOf(markup, "flex h-full flex-col bg-background text-foreground")).toContain('inert=""')
  })

  it("can leave the window interactive once permissions are granted", () => {
    const markup = viewMarkup(<Shell {...base} />)

    expect(tagOf(markup, "flex h-full flex-col bg-background text-foreground")).not.toContain("inert")
  })

  it("can collapse the sidebar slot and make it inert when the sidebar is closed", () => {
    const markup = viewMarkup(<Shell {...base} sidebarOpen={false} />)

    expect(tagOf(markup, "sidebar-slot")).toContain('data-closed="true"')
    expect(tagOf(markup, "sidebar-slot")).toContain('inert=""')
  })

  it("can keep the sidebar slot open and interactive while the sidebar is open", () => {
    const markup = viewMarkup(<Shell {...base} />)

    expect(tagOf(markup, "sidebar-slot")).not.toContain("data-closed")
    expect(tagOf(markup, "sidebar-slot")).not.toContain("inert")
  })

  it("can show the app's error above the transcript", () => {
    const markup = viewMarkup(<Shell {...base} metaError="Model failed to load" />)

    expect(markup.indexOf("Model failed to load")).toBeLessThan(markup.indexOf("transcript"))
  })

  it("can show a failed header action as an alert", () => {
    const markup = viewMarkup(<Shell {...base} actionError="Folder not found" />)

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("Folder not found")
  })

  it("can leave out the right panel until a folder is open", () => {
    const markup = viewMarkup(<Shell {...base} showPanel={false} />)

    expect(markup).not.toContain("right panel")
  })
})

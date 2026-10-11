import { describe, expect, it, vi } from "vitest"
import { ExtensionSettings, type ExtensionSettingsProps } from "@/features/settings/editor-settings/extension-settings/extension-settings"
import { viewMarkup } from "@/test/view-markup"

const base: ExtensionSettingsProps = {
  vimOn: false,
  vimBusy: false,
  installed: [],
  query: "",
  results: [],
  searching: false,
  searched: false,
  canSearch: false,
  error: null,
  onVim: vi.fn(),
  onToggle: vi.fn(),
  onUninstall: vi.fn(),
  onQuery: vi.fn(),
  onSearch: vi.fn(),
  onInstall: vi.fn(),
}

const result = { id: "a.b", name: "AB", description: "", downloads: 5, downloadsLabel: "5", verified: false, installed: false, busy: false }

describe("ExtensionSettings", () => {
  it("can show the vim switch off", () => {
    expect(viewMarkup(<ExtensionSettings {...base} />)).toMatch(/aria-checked="false"[^>]*aria-label="Vim mode"/)
  })

  it("can show the vim switch on", () => {
    expect(viewMarkup(<ExtensionSettings {...base} vimOn />)).toMatch(/aria-checked="true"[^>]*aria-label="Vim mode"/)
  })

  it("can lock the vim switch while it installs", () => {
    expect(viewMarkup(<ExtensionSettings {...base} vimBusy />)).toMatch(/aria-label="Vim mode"[^>]*disabled|disabled[^>]*aria-label="Vim mode"/)
  })

  it("can warn that extensions are other people's code", () => {
    expect(viewMarkup(<ExtensionSettings {...base} />)).toContain("install ones you trust")
  })

  it("can list installed extensions", () => {
    const markup = viewMarkup(<ExtensionSettings {...base} installed={[{ id: "redhat.java", version: "1.0.0", enabled: true, busy: false }]} />)

    expect(markup).toContain("redhat.java")
  })

  it("can disable the search button for a blank query", () => {
    expect(viewMarkup(<ExtensionSettings {...base} />)).toMatch(/type="submit"[^>]*disabled/)
  })

  it("can enable the search button for a query", () => {
    expect(viewMarkup(<ExtensionSettings {...base} query="java" canSearch />)).not.toMatch(/type="submit"[^>]*disabled/)
  })

  it("can show a search in progress", () => {
    expect(viewMarkup(<ExtensionSettings {...base} query="java" searching />)).toContain("Searching")
  })

  it("can list search results", () => {
    const markup = viewMarkup(<ExtensionSettings {...base} searched results={[result]} />)

    expect(markup).toContain("AB")
    expect(markup).not.toContain("Nothing found.")
  })

  it("can say nothing was found after a search with no hits", () => {
    expect(viewMarkup(<ExtensionSettings {...base} searched />)).toContain("Nothing found.")
  })

  it("can stay quiet before any search", () => {
    expect(viewMarkup(<ExtensionSettings {...base} />)).not.toContain("Nothing found.")
  })

  it("can show an error", () => {
    const markup = viewMarkup(<ExtensionSettings {...base} error="The registry answered 500." />)

    expect(markup).toContain("The registry answered 500.")
    expect(markup).toContain('role="alert"')
  })
})

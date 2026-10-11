import { describe, expect, it, vi } from "vitest"
import { ExtensionResult, type ExtensionResultProps } from "@/features/settings/editor-settings/extension-settings/extension-result/extension-result"
import { viewMarkup } from "@/test/view-markup"

const base: ExtensionResultProps = {
  id: "redhat.java",
  name: "Language Support for Java",
  description: "Java linting and IntelliSense.",
  downloads: "43M",
  verified: false,
  installed: false,
  busy: false,
  onInstall: vi.fn(),
}

describe("ExtensionResult", () => {
  it("can show the name, id, description and downloads with an install action", () => {
    const markup = viewMarkup(<ExtensionResult {...base} />)

    expect(markup).toContain("Language Support for Java")
    expect(markup).toContain("redhat.java")
    expect(markup).toContain("Java linting and IntelliSense.")
    expect(markup).toContain("43M downloads")
    expect(markup).toContain("Install")
  })

  it("can mark a verified publisher", () => {
    expect(viewMarkup(<ExtensionResult {...base} verified />)).toContain('aria-label="Verified publisher"')
  })

  it("can show an installed extension as done and disabled", () => {
    const markup = viewMarkup(<ExtensionResult {...base} installed />)

    expect(markup).toContain("Installed")
    expect(markup).toContain("disabled")
  })

  it("can show an install in progress", () => {
    const markup = viewMarkup(<ExtensionResult {...base} busy />)

    expect(markup).toContain("Installing")
    expect(markup).toContain("disabled")
  })

  it("can leave out an empty description", () => {
    expect(viewMarkup(<ExtensionResult {...base} description="" />)).not.toContain("line-clamp-2")
  })
})

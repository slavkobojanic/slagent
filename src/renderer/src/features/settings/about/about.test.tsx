import { describe, expect, it } from "vitest"
import { About } from "@/features/settings/about/about"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function renderAbout(overrides: Partial<Parameters<typeof About>[0]> = {}) {
  return viewMarkup(
    <About
      version="0.1.6"
      checking={false}
      result={null}
      readyVersion={null}
      installing={false}
      error={null}
      onCheck={noop}
      onInstall={noop}
      {...overrides}
    />,
  )
}

describe("About", () => {
  it("can show the app version", () => {
    const markup = renderAbout()

    expect(markup).toContain("slagent")
    expect(markup).toContain("0.1.6")
    expect(markup).toContain("Check for Updates")
    expect(markup).not.toContain("Restart to Update")
  })

  it("can show a downloaded update waiting to install", () => {
    const markup = renderAbout({ readyVersion: "0.2.0" })

    expect(markup).toContain("0.2.0 ready to install")
    expect(markup).toContain("Restart to Update (v0.2.0)")
  })

  it("can show that the app is up to date", () => {
    const markup = renderAbout({ result: { status: "up-to-date", version: "0.1.6" } })

    expect(markup).toContain("You're up to date.")
  })

  it("can show an update that is downloading", () => {
    const markup = renderAbout({ result: { status: "available", version: "0.2.0" } })

    expect(markup).toContain("0.2.0 is available")
  })

  it("can show that updates are unavailable in a dev build", () => {
    const markup = renderAbout({ result: { status: "disabled" } })

    expect(markup).toContain("Updates are only available in the released app.")
  })

  it("can show a failed check", () => {
    const markup = renderAbout({ result: { status: "error", message: "no network" } })

    expect(markup).toContain("no network")
  })

  it("can show a manual error", () => {
    const markup = renderAbout({ error: "install failed" })

    expect(markup).toContain("install failed")
  })

  it("can disable the check while one runs", () => {
    const markup = renderAbout({ checking: true })

    expect(markup).toContain("Checking for updates")
    expect(markup).toContain('disabled=""')
  })
})
import type { ComponentType } from "react"
import { describe, expect, it } from "vitest"
import { MainColumn, type MainColumnProps } from "@/features/shell/main-column/main-column"
import { viewMarkup } from "@/test/view-markup"

function slot(label: string): ComponentType {
  return function Slot() {
    return <div>{label}</div>
  }
}

const base: MainColumnProps = {
  ready: true,
  metaError: null,
  actionError: null,
  Transcript: slot("transcript"),
  Composer: slot("composer"),
}

describe("MainColumn", () => {
  it("can render the transcript and composer once the app is ready", () => {
    const markup = viewMarkup(<MainColumn {...base} />)

    expect(markup).toContain("transcript")
    expect(markup).toContain("composer")
    expect(markup).not.toContain("Starting")
  })

  it("can show a starting placeholder in place of the transcript until the app is ready", () => {
    const markup = viewMarkup(<MainColumn {...base} ready={false} />)

    expect(markup).toContain("Starting")
    expect(markup).not.toContain(">transcript<")
    expect(markup).toContain("composer")
  })

  it("can show the app's error above the transcript", () => {
    const markup = viewMarkup(<MainColumn {...base} metaError="Model failed to load" />)

    expect(markup.indexOf("Model failed to load")).toBeLessThan(markup.indexOf("transcript"))
  })

  it("can show a failed header action as an alert", () => {
    const markup = viewMarkup(<MainColumn {...base} actionError="Folder not found" />)

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("Folder not found")
  })
})

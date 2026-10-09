import { describe, expect, it } from "vitest"
import { UsageMeter, type UsageMeterModel } from "@/features/composer/run-status/usage-meter/usage-meter"
import { viewMarkup } from "@/test/view-markup"

const model: UsageMeterModel = {
  ringPercent: 21,
  level: "normal",
  percentText: "21%",
  costText: "$0.12",
  ariaLabel: "42k of 200k context, $0.12 spent",
  contextText: "42k of 200k context",
  rows: [
    { label: "This chat", value: "2k tokens · $0.12" },
    { label: "Tokens", value: "1k in · 800 out · 300 cached" },
  ],
}

describe("UsageMeter", () => {
  it("renders nothing without usage", () => {
    const markup = viewMarkup(<UsageMeter usage={null} />)

    expect(markup).toBe("")
  })

  it("shows the percent and the cost on the trigger, labelled with the context", () => {
    const markup = viewMarkup(<UsageMeter usage={model} />)

    expect(markup).toContain('aria-label="42k of 200k context, $0.12 spent"')
    expect(markup).toContain("21%")
    expect(markup).toContain("$0.12")
  })

  it("uses the warning tone from 70 percent", () => {
    const markup = viewMarkup(<UsageMeter usage={{ ...model, level: "warning", percentText: "75%" }} />)

    expect(markup).toContain("text-warning")
  })

  it("uses the critical tone from 90 percent", () => {
    const markup = viewMarkup(<UsageMeter usage={{ ...model, level: "critical", percentText: "95%" }} />)

    expect(markup).toContain("text-destructive")
  })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ModelSection } from "@/features/models/model-groups"
import { ModelList, type ModelListProps } from "@/features/models/model-list/model-list"

const claude: ModelSection = {
  provider: "claude-code",
  label: "Claude Code",
  summary: "Runs your Claude Code install with its login, such as a Claude subscription.",
  rows: [{ id: "claude-sonnet", name: "Claude Sonnet", provider: "claude-code", detail: "claude-sonnet · 200k context", selected: true }],
}

const openRouter: ModelSection = {
  provider: "openrouter",
  label: "OpenRouter",
  summary: "Billed per token to your OpenRouter key. 1 models.",
  rows: [{ id: "openai/gpt-x", name: "GPT X", provider: "openrouter", detail: "openai/gpt-x · 128k context", selected: false }],
}

const defaults: ModelListProps = {
  sections: [claude, openRouter],
  canSelect: true,
  onSelect: () => undefined,
}

describe("ModelList", () => {
  it("lists each provider's models under its heading", () => {
    render(<ModelList {...defaults} />)

    expect(screen.getByText(claude.summary)).toBeDefined()
    expect(screen.getByText(openRouter.summary)).toBeDefined()
    expect(screen.getByText("Claude Sonnet")).toBeDefined()
    expect(screen.getByText("GPT X")).toBeDefined()
  })

  it("says so when no model matches the search", () => {
    render(<ModelList {...defaults} sections={[]} />)

    expect(screen.getByText("No matching models")).toBeDefined()
  })

  it("marks the current model as selected", () => {
    render(<ModelList {...defaults} />)

    expect(screen.getByRole("button", { name: /Claude Sonnet/ }).getAttribute("data-selected")).toBe("true")
    expect(screen.getByRole("button", { name: /GPT X/ }).getAttribute("data-selected")).toBe("false")
  })

  it("keeps the model rows off while a change cannot be made", () => {
    render(<ModelList {...defaults} canSelect={false} />)

    expect((screen.getByRole("button", { name: /Claude Sonnet/ }) as HTMLButtonElement).disabled).toBe(true)
  })
})

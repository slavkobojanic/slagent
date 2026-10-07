import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ModelDialog, type ModelDialogProps } from "@/features/models/model-dialog/model-dialog"
import type { ModelSection } from "@/features/models/model-dialog/model-groups"

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

const defaults: ModelDialogProps = {
  open: true,
  query: "",
  canSelect: true,
  sections: [claude, openRouter],
  overflowNotice: null,
  error: null,
  onOpenChange: () => undefined,
  onQueryChange: () => undefined,
  onSelect: () => undefined,
}

describe("ModelDialog", () => {
  it("renders nothing while closed", () => {
    render(<ModelDialog {...defaults} open={false} />)

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("lists each provider's models under its heading", () => {
    render(<ModelDialog {...defaults} />)

    expect(screen.getByRole("dialog")).toBeDefined()
    expect(screen.getByText(claude.summary)).toBeDefined()
    expect(screen.getByText(openRouter.summary)).toBeDefined()
    expect(screen.getByText("Claude Sonnet")).toBeDefined()
    expect(screen.getByText("GPT X")).toBeDefined()
  })

  it("says so when no model matches the search", () => {
    render(<ModelDialog {...defaults} query="zzz" sections={[]} />)

    expect(screen.getByText("No matching models")).toBeDefined()
  })

  it("notes when the OpenRouter results are cut short", () => {
    render(<ModelDialog {...defaults} overflowNotice="Showing 40 OpenRouter models. Refine the search to see more." />)

    expect(screen.getByText("Showing 40 OpenRouter models. Refine the search to see more.")).toBeDefined()
  })

  it("shows why the last change failed", () => {
    render(<ModelDialog {...defaults} error="Offline" />)

    expect(screen.getByRole("alert").textContent).toBe("Offline")
  })

  it("keeps the model rows off while a change cannot be made", () => {
    render(<ModelDialog {...defaults} canSelect={false} />)

    expect((screen.getByRole("button", { name: /Claude Sonnet/ }) as HTMLButtonElement).disabled).toBe(true)
  })
})

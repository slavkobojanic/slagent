import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { OpenRouterStatus } from "@shared/types"
import { OpenRouterKey, type OpenRouterKeyProps } from "@/features/settings/openrouter-key/openrouter-key"

const unconfigured: OpenRouterStatus = { configured: false, source: null, type: null, envKey: false }

function props(overrides: Partial<OpenRouterKeyProps> = {}): OpenRouterKeyProps {
  return {
    status: unconfigured,
    authFile: "/agent/auth.json",
    apiKey: "",
    visible: false,
    saving: false,
    removing: false,
    canSave: false,
    canRemove: false,
    error: null,
    onApiKeyChange: () => undefined,
    onToggleVisible: () => undefined,
    onCreateKey: () => undefined,
    onSave: () => undefined,
    onRemove: () => undefined,
    ...overrides,
  }
}

function button(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null
}

describe("OpenRouterKey", () => {
  it("can show an empty form with save disabled when nothing is configured", () => {
    render(<OpenRouterKey {...props()} />)

    expect(screen.getByText("Not connected")).not.toBeNull()
    expect(button("Save key")?.disabled).toBe(true)
    expect(button("Remove saved key")).toBeNull()
  })

  it("can show that a save is running", () => {
    render(<OpenRouterKey {...props({ apiKey: "sk-or-1", saving: true })} />)

    expect(button("Saving")?.disabled).toBe(true)
  })

  it("can show the error from a failed save as an alert", () => {
    render(<OpenRouterKey {...props({ apiKey: "sk-or-1", canSave: true, error: "Invalid key" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Invalid key")
  })

  it("can explain that the environment key already works and cannot be removed", () => {
    const status: OpenRouterStatus = { configured: true, source: "OPENROUTER_API_KEY", type: "api_key", envKey: true }

    render(<OpenRouterKey {...props({ status })} />)

    expect(screen.getByText("Environment key")).not.toBeNull()
    expect(screen.getByText(/is set in your environment/)).not.toBeNull()
    expect(button("Remove saved key")).toBeNull()
  })

  it("can offer to remove a key saved in slagent", () => {
    const status: OpenRouterStatus = { configured: true, source: "stored credential", type: "api_key", envKey: false }

    render(<OpenRouterKey {...props({ status, canRemove: true })} />)

    expect(button("Remove saved key")).not.toBeNull()
  })

  it("can offer sign out and the replace hint for a Pi sign-in", () => {
    const status: OpenRouterStatus = { configured: true, source: "OAuth", type: "oauth", envKey: false }

    render(<OpenRouterKey {...props({ status, canRemove: true })} />)

    expect(button("Sign out")).not.toBeNull()
    expect(screen.getByText("Saving a key replaces the OpenRouter sign-in stored for Pi.")).not.toBeNull()
  })
})

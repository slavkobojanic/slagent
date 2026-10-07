import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { OpenRouterStatus } from "@shared/types"
import { OpenRouterKey, type OpenRouterKeyProps } from "@/features/settings/openrouter-key/openrouter-key"

const unconfigured: OpenRouterStatus = { configured: false, source: null, type: null, envKey: false }

function FieldSlot() {
  return <p>Key field</p>
}

function ActionsSlot() {
  return <p>Key actions</p>
}

function props(overrides: Partial<OpenRouterKeyProps> = {}): OpenRouterKeyProps {
  return {
    status: unconfigured,
    authFile: "/agent/auth.json",
    error: null,
    onSave: () => undefined,
    KeyField: FieldSlot,
    KeyActions: ActionsSlot,
    ...overrides,
  }
}

describe("OpenRouterKey", () => {
  it("can show the field, the actions and the auth file when nothing is configured", () => {
    render(<OpenRouterKey {...props()} />)

    expect(screen.getByText("Not connected")).not.toBeNull()
    expect(screen.getByText("Key field")).not.toBeNull()
    expect(screen.getByText("Key actions")).not.toBeNull()
    expect(screen.getByText("/agent/auth.json")).not.toBeNull()
  })

  it("can show the error from a failed save as an alert", () => {
    render(<OpenRouterKey {...props({ error: "Invalid key" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Invalid key")
  })

  it("can explain that the environment key already works", () => {
    const status: OpenRouterStatus = { configured: true, source: "OPENROUTER_API_KEY", type: "api_key", envKey: true }

    render(<OpenRouterKey {...props({ status })} />)

    expect(screen.getByText("Environment key")).not.toBeNull()
    expect(screen.getByText(/is set in your environment/)).not.toBeNull()
  })
})

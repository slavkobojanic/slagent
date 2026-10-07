import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { KeyField, type KeyFieldProps } from "@/features/settings/openrouter-key/key-field/key-field"

function props(overrides: Partial<KeyFieldProps> = {}): KeyFieldProps {
  return {
    apiKey: "",
    visible: false,
    oauth: false,
    onApiKeyChange: () => undefined,
    onToggleVisible: () => undefined,
    ...overrides,
  }
}

function field(): HTMLInputElement {
  return screen.getByLabelText("API key") as HTMLInputElement
}

describe("KeyField", () => {
  it("can hide the typed key", () => {
    render(<KeyField {...props({ apiKey: "sk-or-1" })} />)

    expect(field().type).toBe("password")
    expect(field().value).toBe("sk-or-1")
    expect(screen.getByRole("button", { name: "Show key" })).not.toBeNull()
  })

  it("can show the typed key", () => {
    render(<KeyField {...props({ apiKey: "sk-or-1", visible: true })} />)

    expect(field().type).toBe("text")
    expect(screen.getByRole("button", { name: "Hide key" })).not.toBeNull()
  })

  it("can show the replace hint for a Pi sign-in", () => {
    render(<KeyField {...props({ oauth: true })} />)

    expect(screen.getByText("Saving a key replaces the OpenRouter sign-in stored for Pi.")).not.toBeNull()
  })
})

import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProviderRouting, type ProviderRoutingProps } from "@/features/settings/provider-routing/provider-routing"

function props(overrides: Partial<ProviderRoutingProps> = {}): ProviderRoutingProps {
  return {
    value: "balance",
    error: null,
    onValueChange: () => undefined,
    ...overrides,
  }
}

describe("ProviderRouting", () => {
  it("can show the provider preference picker", () => {
    render(<ProviderRouting {...props()} />)

    expect(screen.getByText("Provider preference")).not.toBeNull()
    expect(screen.getByLabelText("Prefer")).not.toBeNull()
  })

  it("can show the chosen preference", () => {
    render(<ProviderRouting {...props({ value: "speed" })} />)

    expect(screen.getByText("Speed — fastest tokens")).not.toBeNull()
  })

  it("can show an error when the choice could not be saved", () => {
    render(<ProviderRouting {...props({ error: "Pi is not ready." })} />)

    expect(screen.getByRole("alert").textContent).toBe("Pi is not ready.")
  })

  it("can hide the error while the choice is saved", () => {
    render(<ProviderRouting {...props()} />)

    expect(screen.queryByRole("alert")).toBeNull()
  })
})

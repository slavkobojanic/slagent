import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Connect, type ConnectProps } from "@/features/mobile/connect/connect"

const noop = () => undefined

function props(overrides: Partial<ConnectProps> = {}): ConnectProps {
  return { text: "", busy: false, canConnect: false, error: null, onTextChange: noop, onSubmit: noop, ...overrides }
}

describe("Connect", () => {
  it("can disable Connect when the field is empty", () => {
    render(<Connect {...props()} />)

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Connect" }).disabled).toBe(true)
  })

  it("can enable Connect when an address is typed", () => {
    render(<Connect {...props({ text: "ws://100.64.0.1:8747?token=t", canConnect: true })} />)

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Connect" }).disabled).toBe(false)
  })

  it("can show that it is connecting while the Mac is checked", () => {
    render(<Connect {...props({ busy: true })} />)

    expect(screen.getByRole<HTMLButtonElement>("button", { name: /Connecting/ }).disabled).toBe(true)
  })

  it("can show why the address did not work", () => {
    render(<Connect {...props({ error: "Couldn't reach slagent" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Couldn't reach slagent")
  })
})

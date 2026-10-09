import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConnectPage } from "@/features/mobile/connect-page/connect-page"

function ConnectSlot() {
  return <p>Connect form</p>
}

describe("ConnectPage", () => {
  it("can explain the Tailscale setup above the form", () => {
    render(<ConnectPage Connect={ConnectSlot} />)

    expect(screen.getByRole("heading", { name: "Connect to your Mac" })).not.toBeNull()
    expect(screen.getByText(/Install Tailscale/)).not.toBeNull()
    expect(screen.getByText("Connect form")).not.toBeNull()
  })
})

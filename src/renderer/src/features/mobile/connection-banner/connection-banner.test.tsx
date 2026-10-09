import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConnectionBanner } from "@/features/mobile/connection-banner/connection-banner"

const noop = () => undefined

describe("ConnectionBanner", () => {
  it("can stay hidden when the socket is open", () => {
    const { container } = render(<ConnectionBanner online reached label="100.64.0.1:8747" onOpen={noop} />)

    expect(container.innerHTML).toBe("")
  })

  it("can say it is reconnecting when the Mac went away after answering", () => {
    render(<ConnectionBanner online={false} reached label="100.64.0.1:8747" onOpen={noop} />)

    expect(screen.getByRole("button").textContent).toContain("Reconnecting to 100.64.0.1:8747")
  })

  it("can say the Mac is unreachable when it never answered", () => {
    render(<ConnectionBanner online={false} reached={false} label="100.64.0.1:8747" onOpen={noop} />)

    expect(screen.getByRole("button").textContent).toContain("Can't reach 100.64.0.1:8747")
  })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AppClose } from "@/features/app-close/app-close"

const noop = () => undefined

describe("AppClose", () => {
  it("can ask the user whether the window should close", () => {
    render(<AppClose open busy={false} onCancel={noop} onConfirm={noop} />)

    expect(screen.queryByRole("heading", { name: "Close the window?" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Close window" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeNull()
  })

  it("can blur the app behind the question", () => {
    const { container } = render(<AppClose open busy={false} onCancel={noop} onConfirm={noop} />)

    expect(container.ownerDocument.querySelector(".backdrop-blur-xl")).not.toBeNull()
  })

  it("can show nothing when closed", () => {
    render(<AppClose open={false} busy={false} onCancel={noop} onConfirm={noop} />)

    expect(screen.queryByRole("heading", { name: "Close the window?" })).toBeNull()
  })

  it("can show the closing label and disable the action while the close runs", () => {
    render(<AppClose open busy onCancel={noop} onConfirm={noop} />)

    const action = screen.getByRole("button", { name: "Closing" })

    expect(action.hasAttribute("disabled")).toBe(true)
  })
})

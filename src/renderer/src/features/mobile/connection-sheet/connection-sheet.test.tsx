import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConnectionSheet, type ConnectionSheetProps } from "@/features/mobile/connection-sheet/connection-sheet"

const noop = () => undefined

function ConnectSlot() {
  return <p>Connect form</p>
}

function props(overrides: Partial<ConnectionSheetProps> = {}): ConnectionSheetProps {
  return {
    open: true,
    online: true,
    label: "100.64.0.1:8747",
    renaming: false,
    draftNickname: "",
    onRenameStart: noop,
    onRenameChange: noop,
    onRenameSave: noop,
    onRenameCancel: noop,
    onOpenChange: noop,
    onForget: noop,
    Connect: ConnectSlot,
    ...overrides,
  }
}

describe("ConnectionSheet", () => {
  it("can show the Mac it is connected to and the form to switch", () => {
    render(<ConnectionSheet {...props()} />)

    expect(screen.getByText("100.64.0.1:8747")).not.toBeNull()
    expect(screen.getByText("Connected")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Forget" })).not.toBeNull()
    expect(screen.getByText("Connect form")).not.toBeNull()
  })

  it("can say it is not connected when the socket is down", () => {
    render(<ConnectionSheet {...props({ online: false })} />)

    expect(screen.getByText("Not connected")).not.toBeNull()
  })

  it("can render nothing when closed", () => {
    render(<ConnectionSheet {...props({ open: false })} />)

    expect(screen.queryByText("100.64.0.1:8747")).toBeNull()
  })

  it("can open a rename box on the connected Mac's card", () => {
    render(<ConnectionSheet {...props({ renaming: true, draftNickname: "Work" })} />)

    expect(screen.getByLabelText("Nickname")).not.toBeNull()
    expect(screen.getByDisplayValue("Work")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Save" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "Cancel" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Forget" })).toBeNull()
  })

  it("can offer renaming the connected Mac next to Forget", () => {
    render(<ConnectionSheet {...props()} />)

    expect(screen.getByRole("button", { name: "Rename" })).not.toBeNull()
  })
})

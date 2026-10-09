import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MobileChatScreen, type MobileChatScreenProps } from "@/features/mobile/chat-screen/chat-screen"

const noop = () => undefined

function named(label: string) {
  return function Named() {
    return <p>{label}</p>
  }
}

function props(overrides: Partial<MobileChatScreenProps> = {}): MobileChatScreenProps {
  return {
    title: "Add iOS support",
    projectName: "slagent",
    ready: true,
    metaError: null,
    changesCount: 0,
    onBack: noop,
    onOpenChanges: noop,
    onOpenConnection: noop,
    Banner: named("Banner"),
    Transcript: named("Transcript"),
    Composer: named("Composer"),
    PlanOverlay: named("PlanOverlay"),
    ...overrides,
  }
}

describe("MobileChatScreen", () => {
  it("can show the chat's title, project and slots when it is ready", () => {
    render(<MobileChatScreen {...props()} />)

    expect(screen.getByRole("heading", { name: "Add iOS support" })).not.toBeNull()
    expect(screen.getByText("slagent")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Back to chats" })).not.toBeNull()
    for (const label of ["Banner", "Transcript", "Composer", "PlanOverlay"]) {
      expect(screen.getByText(label)).not.toBeNull()
    }
  })

  it("can hold the transcript back while the agent starts", () => {
    render(<MobileChatScreen {...props({ ready: false })} />)

    expect(screen.getByText("Starting")).not.toBeNull()
    expect(screen.queryByText("Transcript")).toBeNull()
  })

  it("can leave out the project when the chat has no folder", () => {
    render(<MobileChatScreen {...props({ projectName: null })} />)

    expect(screen.queryByText("slagent")).toBeNull()
  })

  it("can open the changes from the header when files are changed", () => {
    render(<MobileChatScreen {...props({ changesCount: 3, onOpenChanges: () => undefined })} />)

    expect(screen.getByRole("button", { name: "Changes (3)" })).not.toBeNull()
  })

  it("can hold the changes button back when nothing is changed", () => {
    render(<MobileChatScreen {...props({ changesCount: 0, onOpenChanges: () => undefined })} />)

    expect(screen.queryByRole("button", { name: /Changes/ })).toBeNull()
  })

  it("can show the agent's startup error", () => {
    render(<MobileChatScreen {...props({ metaError: "Pi failed to start" })} />)

    expect(screen.getByText("Pi failed to start")).not.toBeNull()
  })
})

import { describe, expect, it, vi } from "vitest"
import type { UiEvent } from "@shared/types"
import { FakeAppService } from "./fake-app-service"

const libraryEvent: UiEvent = {
  type: "library",
  revision: 1,
  library: { projects: [], openProjectId: null, chats: [], openChatId: null },
}

describe("FakeAppService", () => {
  it("can deliver an emitted event to every listener when several are subscribed", () => {
    const service = new FakeAppService()
    const first = vi.fn()
    const second = vi.fn()
    service.onEvent(first)
    service.onEvent(second)

    service.emit(libraryEvent)

    expect(first).toHaveBeenCalledWith(libraryEvent)
    expect(second).toHaveBeenCalledWith(libraryEvent)
  })

  it("can stop delivering events to a listener when it unsubscribes", () => {
    const service = new FakeAppService()
    const listener = vi.fn()
    const unsubscribe = service.onEvent(listener)

    unsubscribe()
    service.emit(libraryEvent)

    expect(listener).not.toHaveBeenCalled()
  })

  it("can keep listeners separate per instance when two fakes exist", () => {
    const owner = new FakeAppService()
    const other = new FakeAppService()
    const listener = vi.fn()
    owner.onEvent(listener)

    other.emit(libraryEvent)

    expect(listener).not.toHaveBeenCalled()
  })
})

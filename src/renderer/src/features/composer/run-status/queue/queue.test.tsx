import { describe, expect, it } from "vitest"
import { MessageQueue, type MessageQueueProps } from "@/features/composer/run-status/queue/queue"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<MessageQueueProps> = {}): MessageQueueProps {
  return { rows: [], error: null, onModeChange: noop, onRemove: noop, ...overrides }
}

describe("MessageQueue", () => {
  it("renders nothing when the queue is empty", () => {
    const markup = viewMarkup(<MessageQueue {...props()} />)

    expect(markup).toBe("")
  })

  it("lists each queued message with its switch action and its description", () => {
    const markup = viewMarkup(
      <MessageQueue
        {...props({
          rows: [
            { id: "q1", content: "also fix tests", description: "Sends after the current tool.", switchLabel: "Follow-up", nextMode: "follow-up" },
            { id: "q2", content: "next", description: null, switchLabel: "Steer", nextMode: "steer" },
          ],
        })}
      />,
    )

    expect(markup).toContain("2 queued")
    expect(markup).toContain("also fix tests")
    expect(markup).toContain("Follow-up")
    expect(markup).toContain("Sends after the current tool.")
    expect(markup).toContain('aria-label="Remove from queue"')
  })

  it("shows the error when a change to the queue fails", () => {
    const markup = viewMarkup(
      <MessageQueue
        {...props({
          rows: [{ id: "q1", content: "next", description: null, switchLabel: "Steer", nextMode: "steer" }],
          error: "Queue is busy",
        })}
      />,
    )

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("Queue is busy")
  })
})

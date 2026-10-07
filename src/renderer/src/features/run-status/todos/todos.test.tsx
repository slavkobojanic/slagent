import { describe, expect, it } from "vitest"
import { TodoPanel } from "@/features/run-status/todos/todos"
import { viewMarkup } from "@/test/view-markup"

describe("TodoPanel", () => {
  it("renders nothing without a panel", () => {
    const markup = viewMarkup(<TodoPanel panel={null} />)

    expect(markup).toBe("")
  })

  it("shows the count and the task in progress, with each todo and its icon label", () => {
    const markup = viewMarkup(
      <TodoPanel
        panel={{
          countText: "1/3",
          currentText: "write tests",
          rows: [
            { key: "0:plan", text: "plan", status: "completed", iconLabel: "Done", spinning: false },
            { key: "1:write tests", text: "write tests", status: "in_progress", iconLabel: "In progress", spinning: true },
            { key: "2:ship", text: "ship", status: "pending", iconLabel: "To do", spinning: false },
          ],
        }}
      />,
    )

    expect(markup).toContain("1/3")
    expect(markup).toContain("write tests")
    expect(markup).toContain('aria-label="Done"')
    expect(markup).toContain('aria-label="To do"')
  })

  it("spins an in-progress todo while a run is live", () => {
    const markup = viewMarkup(
      <TodoPanel
        panel={{
          countText: "0/1",
          currentText: "write tests",
          rows: [{ key: "0:write tests", text: "write tests", status: "in_progress", iconLabel: "In progress", spinning: true }],
        }}
      />,
    )

    expect(markup).toContain("animate-spin")
    expect(markup).toContain('aria-label="In progress"')
  })

  it("does not spin a stale in-progress todo once the run has ended", () => {
    const markup = viewMarkup(
      <TodoPanel
        panel={{
          countText: "0/1",
          currentText: "write tests",
          rows: [{ key: "0:write tests", text: "write tests", status: "in_progress", iconLabel: "Not confirmed done", spinning: false }],
        }}
      />,
    )

    expect(markup).not.toContain("animate-spin")
    expect(markup).toContain('aria-label="Not confirmed done"')
  })
})

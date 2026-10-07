import { describe, expect, it } from "vitest"
import { RunStatusBar } from "@/features/run-status/run-status"
import { viewMarkup } from "@/test/view-markup"

describe("RunStatusBar", () => {
  it("renders the tasks, todos, queue and usage in that order", () => {
    const markup = viewMarkup(
      <RunStatusBar
        Tasks={() => <i>tasks</i>}
        Todos={() => <i>todos</i>}
        Queue={() => <i>queue</i>}
        Usage={() => <i>usage</i>}
      />,
    )

    const order = ["tasks", "todos", "queue", "usage"].map((name) => markup.indexOf(name))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})

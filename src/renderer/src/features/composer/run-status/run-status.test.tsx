import { describe, expect, it } from "vitest"
import { RunStatus } from "@/features/composer/run-status/run-status"
import { viewMarkup } from "@/test/view-markup"

describe("RunStatus", () => {
  it("renders the tasks, todos and queue in that order", () => {
    const markup = viewMarkup(
      <RunStatus
        Tasks={() => <i>tasks</i>}
        Todos={() => <i>todos</i>}
        Queue={() => <i>queue</i>}
      />,
    )

    const order = ["tasks", "todos", "queue"].map((name) => markup.indexOf(name))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})

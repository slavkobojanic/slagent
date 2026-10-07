import { describe, expect, it } from "vitest"
import { TodoIcon } from "@/features/composer/run-status/todos/todo-icon/todo-icon"
import { viewMarkup } from "@/test/view-markup"

describe("TodoIcon", () => {
  it("can spin the in-progress icon while a run is live", () => {
    const markup = viewMarkup(<TodoIcon status="in_progress" label="In progress" spinning />)

    expect(markup).toContain("animate-spin")
    expect(markup).toContain('aria-label="In progress"')
  })

  it("can hold the in-progress icon still when no run is live", () => {
    const markup = viewMarkup(<TodoIcon status="in_progress" label="Not confirmed done" spinning={false} />)

    expect(markup).not.toContain("animate-spin")
  })

  it("can label a done todo", () => {
    expect(viewMarkup(<TodoIcon status="completed" label="Done" spinning={false} />)).toContain('aria-label="Done"')
  })
})

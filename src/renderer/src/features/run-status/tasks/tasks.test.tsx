import { describe, expect, it } from "vitest"
import { TaskStrip, type TaskStripProps } from "@/features/run-status/tasks/tasks"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<TaskStripProps> = {}): TaskStripProps {
  return {
    chips: [],
    error: null,
    viewing: null,
    output: "",
    onOpen: noop,
    onStop: noop,
    onClose: noop,
    bindBottom: noop,
    ...overrides,
  }
}

describe("TaskStrip", () => {
  it("renders nothing when no task runs and none is open", () => {
    const markup = viewMarkup(<TaskStrip {...props()} />)

    expect(markup).toBe("")
  })

  it("renders a chip for each running task with its elapsed time and a stop button", () => {
    const markup = viewMarkup(
      <TaskStrip
        {...props({
          chips: [{ id: "t1", label: "build", command: "pnpm build", status: "running", statusText: "42s" }],
        })}
      />,
    )

    expect(markup).toContain("build")
    expect(markup).toContain("42s")
    expect(markup).toContain('aria-label="Stop build"')
    expect(markup).toContain("animate-pulse")
  })

  it("renders the error beside the chips when stopping a task fails", () => {
    const markup = viewMarkup(
      <TaskStrip
        {...props({
          chips: [{ id: "t1", label: "build", command: "pnpm build", status: "running", statusText: "42s" }],
          error: "Task is gone",
        })}
      />,
    )

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("Task is gone")
  })

  it("keeps the chip row while only the output dialog is open", () => {
    const markup = viewMarkup(
      <TaskStrip
        {...props({
          viewing: { label: "build", command: "pnpm build", statusText: "done" },
        })}
      />,
    )

    expect(markup).toContain("flex-wrap")
    expect(markup).not.toContain("Stop build")
  })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TaskOutputDialog } from "@/features/run-status/tasks/task-output-dialog"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("TaskOutputDialog", () => {
  it("renders nothing while no task is open", () => {
    const markup = viewMarkup(<TaskOutputDialog task={null} output="" onClose={noop} bindBottom={noop} />)

    expect(markup).toBe("")
  })

  it("shows the task's title, command, output and status while a task is open", () => {
    render(
      <TaskOutputDialog
        task={{ label: "build", command: "pnpm build", statusText: "42s" }}
        output={"compiling\ndone"}
        onClose={noop}
        bindBottom={noop}
      />,
    )

    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "build" })).toBeTruthy()
    expect(screen.getByText("pnpm build")).toBeTruthy()
    expect(screen.getByText("42s")).toBeTruthy()
    expect(document.querySelector("pre")?.textContent).toBe("compiling\ndone")
  })
})

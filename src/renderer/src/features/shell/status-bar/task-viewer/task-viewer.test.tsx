import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ViewerTask } from "@/features/shell/status-bar/task-viewer/task-viewer"
import { TaskViewer } from "@/features/shell/status-bar/task-viewer/task-viewer"

const task: ViewerTask = {
  id: "task-1",
  label: "dev server",
  command: "pnpm dev",
  status: "running",
  statusText: "3m",
  projectName: "Atlas",
}

function base(overrides: Partial<{ task: ViewerTask | null; output: string; error: string | null }> = {}) {
  return {
    task: task,
    output: "ready on :5173",
    error: null,
    onClose: () => undefined,
    onStop: () => undefined,
    bindBottom: () => undefined,
    ...overrides,
  }
}

describe("TaskViewer", () => {
  it("can show a running task with its command, output and stop button", () => {
    render(<TaskViewer {...base()} />)

    expect(screen.queryByRole("heading", { name: "dev server" })).not.toBeNull()
    expect(screen.queryByText("pnpm dev")).not.toBeNull()
    expect(screen.queryByText("ready on :5173")).not.toBeNull()
    expect(screen.queryByText("Atlas · 3m")).not.toBeNull()
    expect(screen.queryByRole("button", { name: /Stop/ })).not.toBeNull()
  })

  it("can show a finished task without a stop button", () => {
    render(<TaskViewer {...base({ task: { ...task, status: "done", statusText: "done" } })} />)

    expect(screen.queryByRole("button", { name: /Stop/ })).toBeNull()
  })

  it("can show an error from the last call", () => {
    render(<TaskViewer {...base({ error: "No connection." })} />)

    expect(screen.queryByText("No connection.")).not.toBeNull()
  })
})

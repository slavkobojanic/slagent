import { describe, expect, it, vi } from "vitest"
import type { StatusTask, StatusTerminal } from "@/features/shell/status-bar/status-bar"
import { StatusBar, type StatusBarProps } from "@/features/shell/status-bar/status-bar"
import { viewMarkup } from "@/test/view-markup"

const terminal: StatusTerminal = { id: "terminal-1", title: "zsh", exited: false, origin: "user", color: null }
const task: StatusTask = { id: "task-1", label: "dev server", status: "running", statusText: "3m", projectName: "Atlas", color: "#3b82f6", exitCode: null }

const base: StatusBarProps = {
  terminals: [],
  tasks: [],
  onTerminal: vi.fn(),
  onTask: vi.fn(),
  onTaskTerminal: vi.fn(),
  onStopTask: vi.fn(),
}

describe("StatusBar", () => {
  it("can stay at the bottom while nothing runs", () => {
    const html = viewMarkup(<StatusBar {...base} />)

    expect(html).toContain("No terminals")
    expect(html).toContain("No background tasks")
  })

  it("can list the user's terminals as chips", () => {
    const html = viewMarkup(<StatusBar {...base} terminals={[terminal]} />)

    expect(html).toContain(">zsh</span>")
    expect(html).not.toContain("No terminals")
  })

  it("can list background tasks with their status and stop button", () => {
    const html = viewMarkup(<StatusBar {...base} tasks={[task]} />)

    expect(html).toContain(">dev server</button>")
    expect(html).toContain(">3m</span>")
    expect(html).toContain('aria-label="Stop dev server"')
  })

  it("can leave the stop button out of a finished task", () => {
    const html = viewMarkup(<StatusBar {...base} tasks={[{ ...task, status: "done", statusText: "done" }]} />)

    expect(html).not.toContain('aria-label="Stop dev server"')
  })
})

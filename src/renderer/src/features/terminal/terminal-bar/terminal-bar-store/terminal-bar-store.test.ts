import { describe, expect, it } from "vitest"
import { TerminalBarStore } from "@/features/terminal/terminal-bar/terminal-bar-store/terminal-bar-store"
import { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"

// Only the slices the bar reads: projects for colours, tasks for task chips.
function fakeLibrary(tasks: { id: string; label: string; projectId: string; status: string }[]) {
  return { library: { projects: [], tasks } } as never
}

const task = { id: "task-1", label: "dev server", projectId: "p1", status: "running" }

describe("TerminalBarStore", () => {
  it("lists every task as a chip while it is not dismissed", () => {
    const store = new TerminalBarStore(new TerminalStore(), fakeLibrary([task]))

    expect(store.chips.map((chip) => chip.id)).toEqual(["task-1"])
  })

  it("keeps a task chip closed after dismissing it", () => {
    const store = new TerminalBarStore(new TerminalStore(), fakeLibrary([task]))

    store.dismissTask("task-1")

    expect(store.chips).toEqual([])
  })

  it("keeps showing an undismissed task whose shell the user closed", () => {
    const tabs = new TerminalStore()
    tabs.addTab({ id: "task-1", title: "dev server", cwd: "" })
    const store = new TerminalBarStore(tabs, fakeLibrary([task]))

    expect(store.chips.map((chip) => chip.id)).toEqual(["task-1"])

    // The drawer tab goes away; the chip stays because the task still runs.
    tabs.removeTab("task-1")
    expect(store.chips.map((chip) => chip.id)).toEqual(["task-1"])

    store.dismissTask("task-1")
    expect(store.chips).toEqual([])
  })
})

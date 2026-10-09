import type { TerminalBarStore } from "@/features/terminal/terminal-bar/terminal-bar-store/terminal-bar-store"
import type { TerminalPresenter } from "@/features/terminal/terminal-presenter/terminal-presenter"
import type { Log } from "@/log/log"

// Runs the bottom bar: selecting a chip reveals its terminal in the drawer,
// adopting a task's shell on first click, and the create and toggle controls.
export class TerminalBarPresenter {
  constructor(
    private readonly store: TerminalBarStore,
    private readonly terminalPresenter: TerminalPresenter,
    private readonly log: Log,
  ) {}

  handleSelect = (id: string) => {
    if (!this.store.hasTerminal(id)) {
      const task = this.store.task(id)
      if (task === null) {
        return
      }
      this.log.action("adopt-task-terminal", { id })
      this.terminalPresenter.adoptTask({ id: task.id, title: task.label, cwd: "" }, task.status !== "running", task.exitCode)
    }
    this.log.action("select-terminal", { id })
    this.terminalPresenter.reveal(id)
  }

  handleClose = (id: string) => {
    this.log.action("close-terminal-chip", { id })
    if (this.store.task(id) !== null) {
      // A task's shell outlives its chip, so closing only dismisses the chip
      // and, when the drawer holds the shell, its tab as well.
      this.store.dismissTask(id)
    }
    this.terminalPresenter.closeTab(id)
  }

  handleCreate = () => {
    this.log.action("new-terminal", {})
    void this.terminalPresenter.create()
  }

  handleToggle = () => {
    this.log.action("toggle-terminal", { open: !this.store.open })
    this.terminalPresenter.toggle()
  }
}

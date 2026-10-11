import type { ITheme } from "@xterm/xterm"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { errorText } from "@/lib/format"
import type { TerminalEmulator, TerminalEmulatorFactory } from "@/features/terminal/terminal-emulator"
import { terminalTheme } from "@/features/terminal/terminal-theme"
import { terminalTitle } from "@/features/terminal/terminal-title"
import type { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { TerminalEvent, TerminalSession } from "@shared/types"

type Shell = {
  emulator: TerminalEmulator
  element: HTMLDivElement | null
}

type PressEvent = Pick<PointerEvent, "button" | "clientX" | "preventDefault">

type DividerEvent = PressEvent & { currentTarget: Element }

export class TerminalPresenter {
  private unsubscribe: (() => void) | null = null
  private unregister: (() => void) | null = null
  private unregisterCommands: (() => void)[] = []
  private observer: ResizeObserver | null = null
  private themeWatcher: MutationObserver | null = null
  private readonly shells = new Map<string, Shell>()

  constructor(
    private readonly store: TerminalStore,
    private readonly api: API,
    private readonly layoutPresenter: LayoutPresenter,
    private readonly commandRegistry: CommandRegistry,
    private readonly composerPort: ComposerPort,
    // The global object, not just Window: the observers live on globalThis.
    private readonly window: Window & typeof globalThis,
    private readonly createEmulator: TerminalEmulatorFactory,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.unsubscribe !== null) {
      return
    }
    this.unsubscribe = this.api.onTerminalEvent(this.handleEvent)
    this.observer = new this.window.ResizeObserver(this.handleResize)
    // The theme presenter swaps a class on <html>. Watching the class, rather
    // than the theme store, reads the tokens after they have changed.
    this.themeWatcher = new this.window.MutationObserver(this.handleThemeChange)
    this.themeWatcher.observe(this.window.document.documentElement, { attributes: true, attributeFilter: ["class"] })
    this.unregister = this.commandRegistry.register({
      id: "terminal.toggle",
      label: "Show the terminal",
      group: "Actions",
      shortcut: { key: "j", mod: true },
      run: this.toggle,
    })
    this.unregisterCommands = [
      this.commandRegistry.register({
        id: "terminal.split",
        label: "Split the terminal right",
        group: "Actions",
        shortcut: { key: "d", mod: true },
        enabled: () => this.store.canSplit,
        run: () => void this.splitRight(),
      }),
      this.commandRegistry.register({
        id: "terminal.rename",
        label: "Rename the terminal tab",
        group: "Actions",
        shortcut: { key: "r", mod: true },
        enabled: () => this.store.canRename,
        run: this.renameActive,
      }),
    ]
  }

  stop = () => {
    this.unregister?.()
    this.unregister = null
    for (const unregister of this.unregisterCommands) {
      unregister()
    }
    this.unregisterCommands = []
    this.unsubscribe?.()
    this.unsubscribe = null
    this.observer?.disconnect()
    this.observer = null
    this.themeWatcher?.disconnect()
    this.themeWatcher = null
    for (const [id, shell] of this.shells) {
      shell.emulator.dispose()
      this.api.closeTerminal(id)
    }
    this.shells.clear()
  }

  // Shows a terminal in the drawer. The status bar calls this so the user can
  // see what the agent's shell is doing.
  reveal = (id: string) => {
    const shell = this.shells.get(id)
    if (shell === undefined) {
      return
    }
    this.log.action("reveal-terminal", { id })
    this.store.revealTab(id)
    shell.emulator.focus()
  }

  // A terminal a status bar entry owns. The shell already runs in the main
  // process; this only adds a drawer tab and an emulator for it. A task that
  // already finished shows its exit line instead of waiting for an event that
  // has already passed.
  adoptTask = (session: TerminalSession, exited: boolean, exitCode: number | null): boolean => {
    if (this.shells.has(session.id)) {
      return true
    }
    this.log.action("adopt-task-terminal", { id: session.id })
    this.shells.set(session.id, { emulator: this.buildEmulator(session), element: null })
    this.store.addTab(session, "task")
    if (exited) {
      this.shells.get(session.id)?.emulator.write(`\r\n\x1b[2m[exited with code ${exitCode ?? "unknown"}]\x1b[0m\r\n`)
      this.store.setExited(session.id)
    }
    return true
  }

  toggle = () => {
    if (this.store.open) {
      this.close()
      return
    }
    this.log.action("toggle", { open: true })
    this.store.setOpen(true)
    if (this.store.empty) {
      void this.create()
    }
  }

  close = () => {
    this.log.action("close")
    this.store.setOpen(false)
    // A collapsed drawer cannot hold focus, so hand typing back to the composer.
    this.composerPort.focus()
  }

  create = async () => {
    if (!this.store.canCreate) {
      return
    }
    this.log.action("new-tab")
    this.store.setBusy(true)
    const session = await this.spawnShell()
    this.store.setBusy(false)
    if (session === null) {
      return
    }
    this.shells.set(session.id, { emulator: this.buildEmulator(session), element: null })
    this.store.addTab(session)
  }

  // Spawns a shell and puts it to the right of the active one, both joined as
  // one tab group. The drawer then shows the two shells side by side.
  splitRight = async () => {
    const active = this.store.active
    if (active === null || !this.store.canSplit) {
      return
    }
    this.log.action("split-right", { id: active.id })
    this.store.setBusy(true)
    const session = await this.spawnShell()
    this.store.setBusy(false)
    if (session === null) {
      return
    }
    this.shells.set(session.id, { emulator: this.buildEmulator(session), element: null })
    this.store.addTab(session, "user", null)
    this.store.groupWith(active.id, session.id)
  }

  // Opens the pane's menu items for the shell the user right-clicked. Radix's
  // context menu anchors itself at the cursor, so only the actions are stored.
  handleMenuSplit = (id: string) => {
    this.store.setActive(id)
    void this.splitRight()
  }

  handleMenuRename = (id: string) => {
    this.store.setRenaming(id)
  }

  handleMenuClose = (id: string) => {
    this.closeTab(id)
  }

  // Cmd+R from the terminal or the bar: rename the tab the user is looking at.
  renameActive = () => {
    if (this.store.activeId === null) {
      return
    }
    this.store.setRenaming(this.store.activeId)
  }

  handleRenameSave = (id: string) => {
    this.log.action("rename-tab", { id })
    this.store.renameTab(id, this.store.renameDraft)
  }

  handleRenameCancel = () => {
    this.store.cancelRename()
  }

  setRenameDraft = (value: string) => {
    this.store.setRenameDraft(value)
  }

  // Drags the divider between a group's panes. The divider's parent is the
  // pane row, so the ratio is the pointer's share of the row's width.
  handleDividerDragStart = (groupId: string, event: DividerEvent) => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    const row = event.currentTarget.parentElement
    if (row === null) {
      return
    }
    const move = (next: PointerEvent) => {
      const rect = row.getBoundingClientRect()
      this.store.setSplitRatio(groupId, (next.clientX - rect.left) / rect.width)
    }
    const end = () => {
      this.window.removeEventListener("pointermove", move)
      this.window.removeEventListener("pointerup", end)
      this.window.removeEventListener("pointercancel", end)
    }
    this.window.addEventListener("pointermove", move)
    this.window.addEventListener("pointerup", end)
    this.window.addEventListener("pointercancel", end)
  }

  select = (id: string) => {
    if (this.store.activeId === id) {
      return
    }
    this.log.action("select-tab", { id })
    this.store.setActive(id)
    this.shells.get(id)?.emulator.focus()
  }

  closeTab = (id: string) => {
    const shell = this.shells.get(id)
    const origin = this.store.tabs.find((tab) => tab.id === id)?.origin
    if (shell !== undefined) {
      if (shell.element !== null) {
        this.observer?.unobserve(shell.element)
      }
      shell.emulator.dispose()
      this.shells.delete(id)
    }
    // A task's shell keeps running in the main process, so closing its tab
    // only hides it. A user shell dies with its tab.
    if (origin === "task") {
      this.log.action("dismiss-task-terminal", { id })
      this.store.removeTab(id)
      return
    }
    this.log.action("close-tab", { id })
    this.api.closeTerminal(id)
    this.store.removeTab(id)
  }

  // Bound to each tab's surface as a ref. React re-runs the ref on every render,
  // so a surface that is already attached to this shell is left alone.
  attachSession = (id: string, element: HTMLDivElement | null) => {
    const shell = this.shells.get(id)
    if (shell === undefined || element === null || shell.element === element) {
      return
    }
    shell.element = element
    shell.emulator.attach(element)
    this.observer?.observe(element)
    shell.emulator.fit()
    shell.emulator.focus()
  }

  handleResizeStart = (event: Pick<PointerEvent, "button" | "clientX" | "clientY" | "preventDefault">) => {
    this.layoutPresenter.handleResizeStart("terminal", event)
  }

  handleResizeReset = () => {
    this.log.action("reset-size")
    this.layoutPresenter.handleResizeReset("terminal")
  }

  handleEvent = (event: TerminalEvent) => {
    const shell = this.shells.get(event.id)
    if (shell === undefined) {
      return
    }
    if (event.type === "data") {
      shell.emulator.write(event.data)
      return
    }
    // The exit code is drawn in the grid: the tab keeps its output until it is closed.
    shell.emulator.write(`\r\n\x1b[2m[exited with code ${event.exitCode}]\x1b[0m\r\n`)
    this.store.setExited(event.id)
  }

  // Every surface fills the same slot, so one that changed size means they all did.
  private handleResize = () => {
    for (const shell of this.shells.values()) {
      shell.emulator.fit()
    }
  }

  private handleThemeChange = () => {
    const theme = this.readTheme()
    for (const shell of this.shells.values()) {
      shell.emulator.setTheme(theme)
    }
  }

  private spawnShell = async (): Promise<TerminalSession | null> => {
    try {
      return await this.api.createTerminal()
    } catch (error) {
      this.store.setError(errorText(error))
      this.log.warn("create-failed", { error })
      return null
    }
  }

  private buildEmulator = (session: TerminalSession): TerminalEmulator => {
    return this.createEmulator({
      theme: this.readTheme(),
      onData: (data) => this.api.writeTerminal(session.id, data),
      onResize: (cols, rows) => this.api.resizeTerminal(session.id, cols, rows),
      onTitle: (title) => this.store.setTitle(session.id, terminalTitle(title)),
      onLink: (url) => {
        void this.api.openExternal(url).catch((error) => this.log.warn("link-failed", { url, error }))
      },
    })
  }

  private readTheme = (): ITheme => {
    const styles = this.window.getComputedStyle(this.window.document.documentElement)
    return terminalTheme((token) => styles.getPropertyValue(token).trim())
  }
}

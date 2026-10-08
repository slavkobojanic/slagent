import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ITheme } from "@xterm/xterm"
import type { TerminalEmulator, TerminalEmulatorOptions } from "@/features/terminal/terminal-emulator"
import { TerminalPresenter } from "@/features/terminal/terminal-presenter/terminal-presenter"
import { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { createMockInstance } from "@/test/create-mock-instance"
import type { TerminalSession } from "@shared/types"

type FakeEmulator = TerminalEmulator & {
  options: TerminalEmulatorOptions
  attached: HTMLElement[]
  written: string[]
  themes: ITheme[]
  fits: number
  focuses: number
  disposed: boolean
}

type FakeObserver = {
  callback: ResizeObserverCallback
  observed: Element[]
}

function session(id: string): TerminalSession {
  return { id, title: "zsh", cwd: "/code/app" }
}

function fakeEmulator(options: TerminalEmulatorOptions): FakeEmulator {
  const emulator: FakeEmulator = {
    options,
    attached: [],
    written: [],
    themes: [],
    fits: 0,
    focuses: 0,
    disposed: false,
    attach: (element) => {
      emulator.attached.push(element)
    },
    write: (data) => {
      emulator.written.push(data)
    },
    focus: () => {
      emulator.focuses += 1
    },
    fit: () => {
      emulator.fits += 1
    },
    setTheme: (theme) => {
      emulator.themes.push(theme)
    },
    dispose: () => {
      emulator.disposed = true
    },
  }
  return emulator
}

function installResizeObserver(): FakeObserver[] {
  const observers: FakeObserver[] = []
  class FakeResizeObserver {
    private readonly record: FakeObserver
    constructor(callback: ResizeObserverCallback) {
      this.record = { callback, observed: [] }
      observers.push(this.record)
    }
    observe = (element: Element) => {
      this.record.observed.push(element)
    }
    unobserve = () => undefined
    disconnect = () => undefined
  }
  window.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver
  return observers
}

// setTimeout, not a microtask: spawnShell awaits the bridge and then the store.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function setup() {
  const store = new TerminalStore()
  const api = createMockInstance<API>(["createTerminal", "onTerminalEvent", "writeTerminal", "resizeTerminal", "closeTerminal", "openExternal"])
  api.createTerminal.mockResolvedValue(session("a"))
  api.onTerminalEvent.mockReturnValue(() => undefined)
  api.openExternal.mockResolvedValue(undefined)
  const layout = new LayoutPresenter(new LayoutStore(), window, nullLog())
  vi.spyOn(layout, "handleResizeStart").mockImplementation(() => undefined)
  vi.spyOn(layout, "handleResizeReset").mockImplementation(() => undefined)
  const commands = new CommandRegistry()
  const composerPort = new ComposerPort()
  vi.spyOn(composerPort, "focus").mockImplementation(() => undefined)
  const observers = installResizeObserver()
  const theme = { background: "#123456" }
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    getPropertyValue: (token: string) => (token === "--background" ? theme.background : `value:${token}`),
  } as unknown as CSSStyleDeclaration)
  const emulators: FakeEmulator[] = []
  const presenter = new TerminalPresenter(
    store,
    api,
    layout,
    commands,
    composerPort,
    window,
    (options) => {
      const emulator = fakeEmulator(options)
      emulators.push(emulator)
      return emulator
    },
    nullLog(),
  )
  return { store, api, layout, commands, composerPort, observers, theme, emulators, presenter }
}

describe("TerminalPresenter", () => {
  let parts: ReturnType<typeof setup>

  beforeEach(() => {
    parts = setup()
  })

  afterEach(() => {
    parts.presenter.stop()
    document.documentElement.classList.remove("light")
    vi.restoreAllMocks()
  })

  describe("start", () => {
    it("can register the terminal command with the Cmd+J shortcut", () => {
      const { commands, presenter } = parts

      presenter.start()

      const command = commands.commands.find((item) => item.id === "terminal.toggle")
      expect(command?.shortcut).toEqual({ key: "j", mod: true })
      expect(command?.group).toBe("Actions")
    })

    it("can listen for shell output", () => {
      const { api, presenter } = parts

      presenter.start()

      expect(api.onTerminalEvent).toHaveBeenCalledTimes(1)
    })

    it("can register the command and subscribe once when started twice", () => {
      const { api, commands, presenter } = parts

      presenter.start()
      presenter.start()

      expect(commands.commands.filter((item) => item.id === "terminal.toggle")).toHaveLength(1)
      expect(api.onTerminalEvent).toHaveBeenCalledTimes(1)
    })
  })

  describe("toggle", () => {
    it("can open the drawer and start the first shell", async () => {
      const { store, api, emulators, presenter } = parts

      presenter.toggle()
      await flush()

      expect(store.open).toBe(true)
      expect(api.createTerminal).toHaveBeenCalledTimes(1)
      expect(store.tabs.map((tab) => tab.id)).toEqual(["a"])
      expect(store.activeId).toBe("a")
      expect(emulators).toHaveLength(1)
    })

    it("can close the drawer again and hand typing back to the composer", () => {
      const { store, composerPort, presenter } = parts

      presenter.toggle()
      presenter.toggle()

      expect(store.open).toBe(false)
      expect(composerPort.focus).toHaveBeenCalledTimes(1)
    })

    it("can keep the running shell when the drawer reopens", async () => {
      const { store, api, presenter } = parts

      presenter.toggle()
      await flush()
      presenter.toggle()
      presenter.toggle()
      await flush()

      expect(api.createTerminal).toHaveBeenCalledTimes(1)
      expect(store.tabs).toHaveLength(1)
    })
  })

  describe("create", () => {
    it("can refuse a second shell while one is spawning", async () => {
      const { api, store, presenter } = parts
      store.setBusy(true)

      await presenter.create()

      expect(api.createTerminal).not.toHaveBeenCalled()
    })

    it("can build the emulator from the current theme tokens", async () => {
      const { emulators, presenter } = parts

      await presenter.create()

      expect(emulators[0]?.options.theme.background).toBe("#123456")
      expect(emulators[0]?.options.theme.red).toBe("value:--terminal-red")
    })

    it("can name the tab after the path in the title the shell reported", async () => {
      const { store, emulators, presenter } = parts
      await presenter.create()

      emulators[0]?.options.onTitle("slavko@Slavkos-MacBook-Pro: ~/code/app")

      expect(store.tabs[0]?.title).toBe("~/code/app")
    })

    it("can put the shell error on the store and stop being busy", async () => {
      const { api, store, presenter } = parts
      api.createTerminal.mockRejectedValue(new Error("no shell"))

      await presenter.create()

      expect(store.error).toBe("no shell")
      expect(store.busy).toBe(false)
      expect(store.tabs).toHaveLength(0)
    })
  })

  describe("attachSession", () => {
    it("can attach the emulator to the tab surface and fit it", async () => {
      const { emulators, observers, presenter } = parts
      presenter.start()
      await presenter.create()
      const surface = document.createElement("div")

      presenter.attachSession("a", surface)

      expect(emulators[0]?.attached).toEqual([surface])
      expect(emulators[0]?.fits).toBe(1)
      expect(observers[0]?.observed).toEqual([surface])
    })

    it("can leave an already attached surface alone", async () => {
      const { emulators, presenter } = parts
      await presenter.create()
      const surface = document.createElement("div")

      presenter.attachSession("a", surface)
      presenter.attachSession("a", surface)

      expect(emulators[0]?.attached).toEqual([surface])
    })

    it("can ignore a session that is not open", () => {
      const { emulators, presenter } = parts

      presenter.attachSession("gone", document.createElement("div"))

      expect(emulators).toHaveLength(0)
    })
  })

  describe("select", () => {
    it("can activate the tab and focus its emulator", async () => {
      const { api, store, emulators, presenter } = parts
      await presenter.create()
      api.createTerminal.mockResolvedValue(session("b"))
      await presenter.create()

      presenter.select("a")

      expect(store.activeId).toBe("a")
      expect(emulators[0]?.focuses).toBe(1)
    })

    it("can leave the active tab alone", async () => {
      const { emulators, presenter } = parts
      await presenter.create()

      presenter.select("a")

      expect(emulators[0]?.focuses).toBe(0)
    })
  })

  describe("closeTab", () => {
    it("can dispose the emulator, close the shell and drop the tab", async () => {
      const { api, store, emulators, presenter } = parts
      await presenter.create()

      presenter.closeTab("a")

      expect(emulators[0]?.disposed).toBe(true)
      expect(api.closeTerminal).toHaveBeenCalledWith("a")
      expect(store.tabs).toHaveLength(0)
      expect(store.activeId).toBeNull()
    })
  })

  describe("handleEvent", () => {
    it("can write shell output into the emulator", async () => {
      const { emulators, presenter } = parts
      await presenter.create()

      presenter.handleEvent({ type: "data", id: "a", data: "hello" })

      expect(emulators[0]?.written).toEqual(["hello"])
    })

    it("can draw the exit notice and mark the tab as exited", async () => {
      const { store, emulators, presenter } = parts
      await presenter.create()

      presenter.handleEvent({ type: "exit", id: "a", exitCode: 3 })

      expect(emulators[0]?.written[0]).toContain("exited with code 3")
      expect(store.tabs[0]?.exited).toBe(true)
    })

    it("can ignore output for a shell that is not open", () => {
      const { emulators, presenter } = parts

      presenter.handleEvent({ type: "data", id: "gone", data: "hello" })

      expect(emulators).toHaveLength(0)
    })
  })

  describe("resize", () => {
    it("can fit every shell when a surface changes size", async () => {
      const { emulators, observers, presenter } = parts
      presenter.start()
      await presenter.create()

      observers[0]?.callback([], {} as ResizeObserver)

      expect(emulators[0]?.fits).toBe(1)
    })
  })

  describe("theme", () => {
    it("can hand the new theme to every shell when the html class changes", async () => {
      const { theme, emulators, presenter } = parts
      presenter.start()
      await presenter.create()
      theme.background = "#ffffff"

      document.documentElement.classList.add("light")
      await flush()

      expect(emulators[0]?.themes).toHaveLength(1)
      expect(emulators[0]?.themes[0]?.background).toBe("#ffffff")
    })
  })

  describe("handleResizeStart", () => {
    it("can delegate the drag to the layout presenter on the terminal edge", () => {
      const { layout, presenter } = parts
      const event = new MouseEvent("pointerdown", { clientY: 500, cancelable: true })

      presenter.handleResizeStart(event)

      expect(layout.handleResizeStart).toHaveBeenCalledWith("terminal", event)
    })
  })

  describe("handleResizeReset", () => {
    it("can reset the terminal height through the layout presenter", () => {
      const { layout, presenter } = parts

      presenter.handleResizeReset()

      expect(layout.handleResizeReset).toHaveBeenCalledWith("terminal")
    })
  })

  describe("stop", () => {
    it("can unsubscribe, unregister and close every shell", async () => {
      const { api, commands, emulators, presenter } = parts
      presenter.start()
      await presenter.create()

      presenter.stop()

      expect(api.closeTerminal).toHaveBeenCalledWith("a")
      expect(emulators[0]?.disposed).toBe(true)
      expect(commands.commands).toHaveLength(0)
    })
  })
})

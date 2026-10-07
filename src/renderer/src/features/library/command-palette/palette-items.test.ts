import { describe, expect, it, vi } from "vitest"
import type { ChatSummary, ModelOption, ProjectSummary, SlashCommand } from "@shared/types"
import { formatShortcut, paletteGroups, type PaletteSources } from "@/features/library/command-palette/palette-items"
import type { Command } from "@/state/command-registry"

function command(id: string, overrides: Partial<Command> = {}): Command {
  return { id, label: id, group: "Actions", run: vi.fn(), ...overrides }
}

function chat(id: string, updatedAt = 0): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt, running: false, status: "idle", finishedAt: null }
}

function project(id: string, lastOpenedAt: number): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt, running: false, attention: false }
}

const review: SlashCommand = { name: "review", insert: "/review", description: "Review the changes", kind: "prompt" }

function model(id: string, name: string): ModelOption {
  return { id, name, contextWindow: 100_000, reasoning: false, provider: "openrouter" }
}

function sources(overrides: Partial<PaletteSources> = {}): PaletteSources {
  return {
    platform: "darwin",
    commands: [],
    chats: [],
    projects: [],
    slashCommands: [],
    query: "",
    models: [],
    currentModelId: null,
    streaming: false,
    onRunCommand: vi.fn(),
    onOpenChat: vi.fn(),
    onOpenProject: vi.fn(),
    onFillCommand: vi.fn(),
    onSelectModel: vi.fn(),
    ...overrides,
  }
}

function group(all: ReturnType<typeof paletteGroups>, heading: string) {
  const found = all.find((item) => item.heading === heading)
  if (found === undefined) {
    throw new Error(`no group ${heading}`)
  }
  return found
}

describe("paletteGroups", () => {
  it("can list the enabled commands of the Actions group with their shortcut hints", () => {
    const commands = [
      command("chat.new", { label: "New chat", shortcut: { key: "n", mod: true } }),
      command("off", { label: "Off", enabled: () => false }),
      command("hidden", { label: "Hidden", inPalette: false }),
      command("search", { label: "Search chats" }),
    ]

    const actions = group(paletteGroups(sources({ commands })), "Actions")

    expect(actions.items.map((item) => item.label)).toEqual(["New chat", "Search chats"])
    expect(actions.items[0]?.shortcut).toBe("⌘N")
  })

  it("can keep a command listed when its inPalette flag is left unset", () => {
    const commands = [command("stop", { label: "Stop the run", shortcut: { key: "Escape" }, enabled: () => true })]

    const actions = group(paletteGroups(sources({ commands })), "Actions")

    expect(actions.items.map((item) => item.label)).toEqual(["Stop the run"])
    expect(actions.items[0]?.shortcut).toBe("Esc")
  })

  it("can leave out a command that sets inPalette to false, even when it is enabled", () => {
    const commands = [command("composer.focus", { label: "Focus the composer", inPalette: false })]

    expect(paletteGroups(sources({ commands }))).toEqual([])
  })

  it("can drop a group that has no items", () => {
    const headings = paletteGroups(sources({ commands: [command("search")] })).map((item) => item.heading)

    expect(headings).toEqual(["Actions"])
  })

  it("can list chats in their ordered sequence with a number hint for the first nine", () => {
    const chats = Array.from({ length: 10 }, (_, index) => chat(`c${index}`, index))

    const items = group(paletteGroups(sources({ chats })), "Chats").items

    expect(items).toHaveLength(10)
    expect(items[0]?.label).toBe("c9")
    expect(items[0]?.shortcut).toBe("⌘1")
    expect(items[8]?.shortcut).toBe("⌘9")
    expect(items[9]?.shortcut).toBeUndefined()
  })

  it("can label chat hints with Ctrl on platforms other than macOS", () => {
    const items = group(paletteGroups(sources({ platform: "linux", chats: [chat("c1")] })), "Chats").items

    expect(items[0]?.shortcut).toBe("Ctrl+1")
  })

  it("can list skills and slash commands with their description, and fill the prompt box when one is chosen", () => {
    const onFillCommand = vi.fn()

    const items = group(paletteGroups(sources({ slashCommands: [review], onFillCommand })), "Skills and commands").items
    items[0]?.onSelect()

    expect(items[0]?.label).toBe("/review")
    expect(items[0]?.detail).toBe("Review the changes")
    expect(onFillCommand).toHaveBeenCalledWith("/review")
  })

  it("can list projects by most recent opening, and open one when it is chosen", () => {
    const onOpenProject = vi.fn()
    const projects = [project("older", 1), project("newer", 9)]

    const items = group(paletteGroups(sources({ projects, onOpenProject })), "Projects").items
    items[0]?.onSelect()

    expect(items[0]?.label).toBe("newer")
    expect(onOpenProject).toHaveBeenCalledWith(projects[1])
  })

  it("can run a registered command by its id when it is chosen", () => {
    const onRunCommand = vi.fn()

    const items = group(paletteGroups(sources({ commands: [command("search", { label: "Search chats" })], onRunCommand })), "Actions").items
    items[0]?.onSelect()

    expect(onRunCommand).toHaveBeenCalledWith("search")
  })
})

describe("Models group", () => {
  const models = [model("m2", "Beta"), model("m1", "Alpha")]

  it("can stay out until the query has two characters", () => {
    const headings = paletteGroups(sources({ models, query: "g" })).map((item) => item.heading)

    expect(headings).not.toContain("Models")
  })

  it("can ignore spaces around the query when counting its characters", () => {
    const headings = paletteGroups(sources({ models, query: "  g  " })).map((item) => item.heading)

    expect(headings).not.toContain("Models")
  })

  it("can list the models in the order the app gives them, with their name and id", () => {
    const items = group(paletteGroups(sources({ models, query: "gp" })), "Models").items

    expect(items.map((item) => item.label)).toEqual(["Beta", "Alpha"])
    expect(items.map((item) => item.detail)).toEqual(["m2", "m1"])
  })

  it("can grey out the current model", () => {
    const items = group(paletteGroups(sources({ models, query: "gp", currentModelId: "m1" })), "Models").items

    expect(items.map((item) => item.disabled)).toEqual([false, true])
  })

  it("can grey out every model while a run streams", () => {
    const items = group(paletteGroups(sources({ models, query: "gp", streaming: true })), "Models").items

    expect(items.map((item) => item.disabled)).toEqual([true, true])
  })

  it("can switch to a model by passing its id to onSelectModel", () => {
    const onSelectModel = vi.fn()
    const items = group(paletteGroups(sources({ models, query: "gp", onSelectModel })), "Models").items

    items[0]?.onSelect()

    expect(onSelectModel).toHaveBeenCalledWith("m2")
  })

  it("can come after the projects group", () => {
    const headings = paletteGroups(sources({ models, query: "gp", projects: [project("p1", 1)] })).map((item) => item.heading)

    expect(headings[headings.length - 1]).toBe("Models")
  })
})

describe("formatShortcut", () => {
  it("can show the modifier as Cmd on macOS", () => {
    expect(formatShortcut({ key: "n", mod: true }, "darwin")).toBe("⌘N")
  })

  it("can show the modifier as Ctrl on other platforms", () => {
    expect(formatShortcut({ key: "n", mod: true }, "linux")).toBe("Ctrl+N")
  })

  it("can show Alt and then Shift before the key", () => {
    expect(formatShortcut({ key: "f", mod: true, shift: true, alt: true }, "darwin")).toBe("⌘⌥⇧F")
  })

  it("can name the Escape key Esc", () => {
    expect(formatShortcut({ key: "Escape" }, "darwin")).toBe("Esc")
  })

  it("can show a bracket key as it is", () => {
    expect(formatShortcut({ key: "[", mod: true }, "darwin")).toBe("⌘[")
  })
})

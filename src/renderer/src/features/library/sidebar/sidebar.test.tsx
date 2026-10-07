import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { ChatSearchResult, ChatSummary, ProjectSummary } from "@shared/types"
import { viewMarkup } from "@/test/view-markup"
import type { ChatActions, ChatRowModel } from "@/features/library/sidebar/chat-row"
import type { ProjectActions } from "@/features/library/sidebar/project-row"
import { Sidebar, type SidebarProps } from "@/features/library/sidebar/sidebar"

const noop = () => undefined

// Radix's scroll area observes its size, and jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

function chat(id: string, title: string): ChatSummary {
  return { id, title, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }
}

function project(id: string, name: string): ProjectSummary {
  return { id, path: `/work/${id}`, name, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false }
}

function row(summary: ChatSummary): ChatRowModel {
  return { chat: summary, status: "idle", active: false, renaming: false, menuOpen: false }
}

const chatActions: ChatActions = {
  onOpen: noop,
  onPin: noop,
  onRename: noop,
  onDraftChange: noop,
  onSave: noop,
  onCancel: noop,
  onDelete: noop,
  onCopy: noop,
  onMenuOpenChange: noop,
}

const projectActions: ProjectActions = {
  onOpen: noop,
  onToggle: noop,
  onNewChat: noop,
  onPin: noop,
  onRemove: noop,
}

const base: SidebarProps = {
  open: true,
  resizing: false,
  reduceMotion: false,
  modKey: "⌘",
  onResizeStart: noop,
  onResizeReset: noop,
  query: "",
  results: null,
  openChatId: null,
  onQueryChange: noop,
  onSearchKeyDown: noop,
  onClearSearch: noop,
  onOpenResult: noop,
  project: null,
  collapsed: false,
  rows: [],
  totalChats: 0,
  hiddenCount: 0,
  canShowLess: false,
  draft: "",
  chatActions,
  projectActions,
  onChooseFolder: noop,
  onShowAll: noop,
  onShowLess: noop,
  pinned: [],
}

function markup(overrides: Partial<SidebarProps>): string {
  return viewMarkup(<Sidebar {...base} {...overrides} />)
}

describe("Sidebar", () => {
  it("can render the search box inside an aside, the element the shell's slot styles", () => {
    const html = markup({})

    expect(html.startsWith("<aside")).toBe(true)
    expect(html).toContain('placeholder="Search chats"')
  })

  it("can show the clear button only while a query is typed", () => {
    expect(markup({ query: "pl" })).toContain('aria-label="Clear search"')
    expect(markup({ query: "" })).not.toContain('aria-label="Clear search"')
  })

  it("can list search results in place of the open project's chats", () => {
    const result: ChatSearchResult = {
      projectId: "p1",
      projectName: "Atlas",
      chatId: "c1",
      title: "Launch plan",
      snippet: "the launch",
      messageId: null,
      updatedAt: 1,
    }

    const html = markup({ results: [result], project: project("p1", "Atlas"), rows: [row(chat("c2", "Other chat"))], totalChats: 1 })

    expect(html).toContain("Launch plan")
    expect(html).toContain("the launch")
    expect(html).not.toContain("Other chat")
  })

  it("can say when no chat matches the search", () => {
    expect(markup({ results: [] })).toContain("No matching chats")
  })

  it("can ask for a folder when no project is open", () => {
    const html = markup({ project: null })

    expect(html).toContain("Choose a folder to start a project.")
    expect(html).toContain("Choose folder")
  })

  it("can list the open project's chats with the new chat hint", () => {
    const html = markup({ project: project("p1", "Atlas"), rows: [row(chat("c1", "Launch notes"))], totalChats: 1 })

    expect(html).toContain("Launch notes")
    expect(html).toContain("New chat in Atlas (⌘N)")
  })

  it("can say when the open project has no chats", () => {
    expect(markup({ project: project("p1", "Atlas"), totalChats: 0 })).toContain("No chats yet")
  })

  it("can hide the open project's chats while the project is collapsed", () => {
    const html = markup({ project: project("p1", "Atlas"), collapsed: true, rows: [row(chat("c1", "Launch notes"))], totalChats: 1 })

    expect(html).not.toContain("Launch notes")
  })

  it("can offer to show the rest of a long chat list", () => {
    expect(markup({ project: project("p1", "Atlas"), hiddenCount: 3, totalChats: 13 })).toContain("Show 3 more")
  })

  it("can offer to show fewer chats once the full list is showing", () => {
    expect(markup({ project: project("p1", "Atlas"), canShowLess: true, totalChats: 13 })).toContain("Show less")
  })

  it("can list pinned projects below the open project", () => {
    const html = markup({ project: project("p1", "Atlas"), pinned: [{ project: { ...project("p2", "Beta"), pinned: true }, status: "idle" }] })

    expect(html).toContain("Pinned")
    expect(html).toContain("Beta")
  })

  it("can show the resize handle while the sidebar is open", () => {
    expect(markup({ open: true })).toContain('aria-label="Resize sidebar"')
    expect(markup({ open: false })).not.toContain('aria-label="Resize sidebar"')
  })

  it("can mark the resize handle while the sidebar is being resized", () => {
    expect(markup({ resizing: true })).toContain('data-resizing="true"')
  })
})

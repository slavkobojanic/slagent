import { describe, expect, it, vi } from "vitest"
import type { ChatSummary, LibraryState, ProjectSummary } from "@shared/types"
import { Log } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { NavLogPresenter } from "@/state/nav-log/nav-log-presenter/nav-log-presenter"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { PanelStore } from "@/state/panel/panel-store/panel-store"

const project: ProjectSummary = { id: "p1", path: "/p1", name: "slagent", pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false }
const chat = (id: string, title: string): ChatSummary => ({ id, title, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null })

function setup() {
  const info = vi.fn()
  const log = Log.create({ sink: { debug: vi.fn(), info, warn: vi.fn(), error: vi.fn() }, clock: { now: () => 0, measure: vi.fn() }, verbose: true, spec: "nav" })
  const libraryStore = new LibraryStore()
  const panelStore = new PanelStore()
  const overlayStore = new OverlayStore()
  const presenter = new NavLogPresenter(libraryStore, panelStore, overlayStore, log.child("nav"))
  const library = (patch: Partial<LibraryState>) => libraryStore.setLibrary({ ...libraryStore.library, ...patch })
  const lines = () => info.mock.calls.map((call) => [String(call[0]).split(" ")[1], call.at(-1)])
  return { presenter, library, panelStore, overlayStore, lines }
}

describe("NavLogPresenter", () => {
  describe("start", () => {
    it("can log the chat move when the open chat changes", () => {
      const { presenter, library, lines } = setup()
      library({ projects: [project], openProjectId: "p1", chats: [chat("c1", "First"), chat("c2", "Second")], chatsByProject: {}, openChatId: "c1" })
      presenter.start()

      library({ openChatId: "c2" })

      expect(lines()).toEqual([["%cchat", { from: { id: "c1", name: "First" }, to: { id: "c2", name: "Second" } }]])
      presenter.stop()
    })

    it("can stay quiet when the open chat is only renamed", () => {
      const { presenter, library, lines } = setup()
      library({ chats: [chat("c1", "First")], chatsByProject: {}, openChatId: "c1" })
      presenter.start()

      library({ chats: [chat("c1", "Renamed")] })

      expect(lines()).toEqual([])
      presenter.stop()
    })

    it("can log the panel and overlay when they change", () => {
      const { presenter, panelStore, overlayStore, lines } = setup()
      presenter.start()

      panelStore.setOpen(true)
      overlayStore.setOpen("settings", true)

      expect(lines()).toEqual([
        ["%cpanel", { from: "closed", to: "changes" }],
        ["%coverlay", { from: null, to: "settings" }],
      ])
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can stop logging when stopped", () => {
      const { presenter, panelStore, lines } = setup()
      presenter.start()
      presenter.stop()

      panelStore.setOpen(true)

      expect(lines()).toEqual([])
    })
  })
})

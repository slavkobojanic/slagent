import { reaction } from "mobx"
import type { ChatSearchResult, ChatSummary, ProjectSummary } from "@shared/types"
import type { ChatDeletionPresenter } from "@/features/library/chat-deletion/chat-deletion-presenter/chat-deletion-presenter"
import type { LibraryPresenter } from "@/features/library/library-presenter/library-presenter"
import { nextDoneExpiry } from "@/features/library/library-utils"
import type { ProjectRemovalPresenter } from "@/features/library/project-removal/project-removal-presenter/project-removal-presenter"
import type { SidebarStore } from "@/features/library/sidebar/sidebar-store/sidebar-store"
import type { LibraryStore } from "@/mirror/library-store"
import type { AppEnv } from "@/state/app-deps"
import type { CommandRegistry } from "@/state/command-registry"
import type { JumpPort } from "@/state/jump-port"
import type { LayoutPresenter } from "@/state/layout-presenter"

const SEARCH_DELAY_MS = 150
const SEARCH_INPUT_ID = "chat-search"
// The clock re-reads a little after a done window closes, so the timer never fires before it.
const CLOCK_SLACK_MS = 50
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

// The sidebar's behaviour: search, rename, row menus, collapse, the done-dot clock, and the search shortcut.
// Library changes go through the library presenter. Dialogs are opened through their presenters.
export class SidebarPresenter {
  private started = false
  private disposers: (() => void)[] = []
  private searchTimer: number | null = null
  // Bumped on every query change, so a search still in flight for an older query is dropped.
  private searchToken = 0
  private clockTimer: number | null = null
  private media: MediaQueryList | null = null
  // Set when Escape cancels a rename. The input unmounts after that, and its blur must not save the draft.
  private skipRenameSave = false

  constructor(
    private readonly store: SidebarStore,
    private readonly library: Pick<
      LibraryPresenter,
      "openChat" | "openProject" | "newChat" | "pinProject" | "pinChat" | "renameChat" | "searchChats" | "copyTranscript" | "chooseFolder"
    >,
    private readonly layout: Pick<LayoutPresenter, "setSidebarOpen">,
    private readonly jump: Pick<JumpPort, "request">,
    private readonly chatDeletion: Pick<ChatDeletionPresenter, "handleRequest">,
    private readonly projectRemoval: Pick<ProjectRemovalPresenter, "handleRequest">,
    private readonly mirror: LibraryStore,
    private readonly commands: CommandRegistry,
    private readonly env: AppEnv,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.media = this.env.window.matchMedia(REDUCE_MOTION_QUERY)
    this.store.setReduceMotion(this.media.matches)
    this.media.addEventListener("change", this.handleMotionChange)
    this.disposers.push(reaction(() => this.mirror.library, this.refreshClock))
    this.disposers.push(
      reaction(
        () => this.mirror.openProjectId,
        () => {
          this.store.setShowAll(false)
        },
      ),
    )
    this.disposers.push(
      this.commands.register({
        id: "search.open",
        label: "Search chats",
        group: "Actions",
        shortcut: { key: "f", mod: true, shift: true },
        run: this.focusSearch,
      }),
    )
    this.refreshClock()
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.searchToken += 1
    this.clearSearchTimer()
    this.clearClockTimer()
    this.media?.removeEventListener("change", this.handleMotionChange)
    this.media = null
    this.started = false
  }

  handleQueryChange = (value: string) => {
    this.store.setQuery(value)
    this.searchFor(value)
  }

  // Escape clears the search. Enter opens the best match, as the old sidebar did.
  handleSearchKeyDown = (key: string) => {
    if (key === "Escape") {
      this.clearSearch()
      return
    }
    const first = this.store.results?.[0]
    if (key !== "Enter" || first === undefined) {
      return
    }
    this.openResult(first)
  }

  clearSearch = () => {
    this.handleQueryChange("")
  }

  // Clears the search and opens the hit's chat. Once that chat is open, the transcript scrolls to the matched
  // message. A title-only hit, or a chat that failed to open, does not jump.
  openResult = (result: ChatSearchResult) => {
    this.clearSearch()
    void this.openHit(result)
  }

  private openHit = async (result: ChatSearchResult) => {
    const opened = await this.library.openChat(result.chatId, result.projectId, result.messageId ?? undefined)
    if (!opened || result.messageId === null) {
      return
    }
    this.jump.request(result.messageId)
  }

  openChat = (chat: ChatSummary) => this.library.openChat(chat.id)

  openProject = (project: ProjectSummary) => this.library.openProject(project.id)

  newChat = (project: ProjectSummary) => this.library.newChat(project.id)

  pinProject = (project: ProjectSummary) => this.library.pinProject(project.id, !project.pinned)

  pinChat = (chat: ChatSummary) => this.library.pinChat(chat.id, !chat.pinned)

  removeProject = (project: ProjectSummary) => {
    this.projectRemoval.handleRequest(project)
  }

  deleteChat = (chat: ChatSummary) => {
    this.chatDeletion.handleRequest(chat)
  }

  copyTranscript = (chat: ChatSummary) => this.library.copyTranscript(chat)

  chooseFolder = () => this.library.chooseFolder()

  startRename = (chat: ChatSummary) => {
    this.skipRenameSave = false
    this.store.startRename(chat.id, chat.title)
  }

  handleDraftChange = (value: string) => {
    this.store.setDraft(value)
  }

  // Saves the title only for the row that is still being renamed. An empty title cancels the rename.
  saveRename = (chat: ChatSummary) => {
    if (this.skipRenameSave) {
      this.skipRenameSave = false
      return
    }
    if (this.store.renamingId !== chat.id) {
      return
    }
    const title = this.store.draft.trim()
    this.store.endRename()
    if (title === "") {
      return
    }
    void this.library.renameChat(chat.id, title)
  }

  cancelRename = () => {
    this.skipRenameSave = true
    this.store.endRename()
  }

  // Right-click and the "..." button both open a chat's menu. Only one menu is open at a time.
  setChatMenuOpen = (chat: ChatSummary, open: boolean) => {
    if (open) {
      this.store.setMenuChatId(chat.id)
      return
    }
    if (this.store.menuChatId !== chat.id) {
      return
    }
    this.store.setMenuChatId(null)
  }

  toggleProject = (project: ProjectSummary) => {
    this.store.setCollapsed(project.id, !this.store.isCollapsed(project.id))
  }

  handleShowAll = () => {
    this.store.setShowAll(true)
  }

  handleShowLess = () => {
    this.store.setShowAll(false)
  }

  // Opens the sidebar, then puts the caret in the search box once the pane has its width.
  private focusSearch = () => {
    this.layout.setSidebarOpen(true)
    this.env.window.requestAnimationFrame(() => {
      this.env.window.document.getElementById(SEARCH_INPUT_ID)?.focus()
    })
  }

  private searchFor = (query: string) => {
    this.clearSearchTimer()
    this.searchToken += 1
    const token = this.searchToken
    if (query.trim() === "") {
      this.store.setResults(null)
      return
    }
    this.searchTimer = this.env.window.setTimeout(() => {
      this.searchTimer = null
      void this.library.searchChats(query).then((next) => {
        if (token !== this.searchToken) {
          return
        }
        this.store.setResults(next)
      }, () => undefined)
    }, SEARCH_DELAY_MS)
  }

  private clearSearchTimer = () => {
    if (this.searchTimer === null) {
      return
    }
    this.env.window.clearTimeout(this.searchTimer)
    this.searchTimer = null
  }

  // Reads the clock, then schedules the next moment a done chat falls back to idle.
  private refreshClock = () => {
    const now = Date.now()
    this.store.setNow(now)
    this.clearClockTimer()
    const expiry = nextDoneExpiry(this.mirror.library.chats, now)
    if (expiry === null) {
      return
    }
    this.clockTimer = this.env.window.setTimeout(this.refreshClock, expiry - now + CLOCK_SLACK_MS)
  }

  private clearClockTimer = () => {
    if (this.clockTimer === null) {
      return
    }
    this.env.window.clearTimeout(this.clockTimer)
    this.clockTimer = null
  }

  private handleMotionChange = (event: MediaQueryListEvent) => {
    this.store.setReduceMotion(event.matches)
  }
}

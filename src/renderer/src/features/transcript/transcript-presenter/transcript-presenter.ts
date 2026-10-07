import { reaction } from "mobx"
import { toast } from "sonner"
import type { RewindMode, TranscriptPage, UserMessage } from "@shared/types"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import type { LibraryService } from "@/ipc/library-service/library-service"
import type { RunStore } from "@/mirror/run-store"
import { errorText } from "@/lib/format"
import { lastEditableMessage } from "@/features/transcript/transcript-blocks"
import { findMessage, nextPage, visibleMessage } from "@/features/transcript/transcript-scroll"
import type { TranscriptStore } from "@/features/transcript/transcript-store/transcript-store"
import type { AppEnv } from "@/state/app-deps"
import type { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"
import type { JumpPort } from "@/state/jump-port"
import type { OverlayStore } from "@/state/overlay-store"
import type { PanelPresenter } from "@/state/panel-presenter"

// What the presenter reads and drives on the conversation's scroller. The stick context from
// use-stick-to-bottom has all of these.
export type ScrollControls = {
  isAtBottom: boolean
  scrollRef: { current: HTMLElement | null }
  scrollToBottom: (options?: { animation?: "instant" }) => unknown
  stopScroll: () => void
}

// The message the reader was on, and its offset from the top of the scroller.
type Anchor = { id: string; top: number }

// A search result's scroll that is waiting for its next frame.
type Jump = { id: string; frame: number }

// The transcript's behaviour. It pages the window as the reader nears an edge, holds the
// reader's message in place while the window moves, scrolls to search results, edits and
// rewinds messages, and approves plans.
export class TranscriptPresenter {
  private stick: ScrollControls | null = null
  private scroller: HTMLElement | null = null
  private loading = false
  private toLatest = false
  private anchor: Anchor | null = null
  private jumping: Jump | null = null
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: TranscriptStore,
    private readonly run: Pick<RunStore, "messages" | "transcriptPage" | "transcriptChatId" | "streaming">,
    private readonly chat: Pick<ChatService, "pageTranscript" | "editMessage" | "rewind" | "undoRewind" | "approvePlan">,
    private readonly library: Pick<LibraryService, "chooseFolder">,
    private readonly composer: Pick<ComposerPort, "fill">,
    private readonly panel: Pick<PanelPresenter, "openFile">,
    private readonly overlay: Pick<OverlayStore, "setOpen">,
    private readonly commands: Pick<CommandRegistry, "register">,
    private readonly jump: Pick<JumpPort, "attach">,
    private readonly env: AppEnv,
  ) {}

  // Attaches the transcript's listeners: the chat-change reset, the edit-last command, the
  // jump handler that search results call, and the follow-up for a jump that is waiting.
  // stop() releases every one of them.
  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.disposers.push(
      reaction(() => this.run.transcriptChatId, this.handleChatChanged),
      reaction(() => this.store.jumpTo, this.followJump),
      this.jump.attach(this.jumpTo),
      this.commands.register({
        id: "transcript.edit-last",
        label: "Edit last message",
        group: "Actions",
        shortcut: { key: "e", mod: true, shift: true },
        enabled: this.canEditLast,
        run: this.editLast,
      }),
    )
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.detachScroller()
    this.cancelJump()
    this.stick = null
  }

  // Receives the stick context from the conversation on every commit, and null when it unmounts.
  attachScroll = (stick: ScrollControls | null) => {
    this.stick = stick
    if (stick === null) {
      return
    }
    this.store.setAtBottom(stick.isAtBottom)
    this.attachScroller(stick.scrollRef.current)
  }

  // Runs after each commit of the transcript: holds the reader's message in place, and
  // scrolls to a search result once it is rendered.
  handleSettle = () => {
    this.attachScroller(this.stick?.scrollRef.current ?? null)
    this.followWindow()
    this.followJump()
  }

  // The scroll-down button. It goes to the bottom, or loads the latest turns when the window is
  // not at the live end of the chat.
  handleScrollDown = () => {
    if (!this.run.transcriptPage.hasNewer) {
      void this.stick?.scrollToBottom()
      return
    }
    this.toLatest = true
    this.request("latest")
  }

  // A file link or a comment's location. The panel reads the file and shows it.
  openFile = (path: string, line?: number) => {
    void this.panel.openFile(path, line)
  }

  // The handler the jump port calls when a search result asks for a message. The scroll happens
  // once that message is rendered, so the request may arrive before its chat has loaded.
  jumpTo = (messageId: string) => {
    this.store.setJumpTo(messageId)
  }

  requestEdit = (messageId: string) => {
    const message = this.findUserMessage(messageId)
    if (message === undefined) {
      return
    }
    if (!this.isLatestEditable(messageId)) {
      this.store.setConfirmEditId(messageId)
      return
    }
    this.store.startEdit(messageId, message.text)
  }

  confirmEdit = () => {
    const messageId = this.store.confirmEditId
    const message = messageId === null ? undefined : this.findUserMessage(messageId)
    if (message === undefined) {
      this.store.setConfirmEditId(null)
      return
    }
    this.store.startEdit(message.id, message.text)
  }

  cancelConfirm = () => {
    this.store.setConfirmEditId(null)
  }

  cancelEdit = () => {
    this.store.stopEdit()
  }

  setEditDraft = (value: string) => {
    this.store.setEditDraft(value)
  }

  // Sends the edit. The message and everything after it are replaced by the server, so the
  // edit closes once the call succeeds. A failed call keeps the draft.
  saveEdit = async () => {
    const messageId = this.store.editingId
    if (messageId === null || !this.store.canSaveEdit) {
      return
    }
    const text = this.store.editDraft.trim()
    this.store.setEditSaving(true)
    try {
      await this.chat.editMessage(messageId, text)
      this.store.stopEdit()
    } catch (error) {
      toast.error(errorText(error))
      this.store.setEditSaving(false)
    }
  }

  // Edit last message (Cmd+Shift+E). Only the live end of the chat has an editable message.
  editLast = () => {
    if (this.run.transcriptPage.hasNewer) {
      return
    }
    const last = lastEditableMessage(this.run.messages)
    if (last === undefined) {
      return
    }
    this.store.startEdit(last.id, last.text)
  }

  // Enabled while nothing is streaming and the window is at the live end with an editable message.
  canEditLast = (): boolean => {
    if (this.run.streaming || this.run.transcriptPage.hasNewer) {
      return false
    }
    return lastEditableMessage(this.run.messages) !== undefined
  }

  // Rewinds to before a message. The rewritten prompt fills the composer unless only the code
  // rewinds, and an undo of the code stays on offer when the rewind saved one.
  rewind = async (messageId: string, mode: RewindMode) => {
    try {
      const result = await this.chat.rewind(messageId, mode)
      if (mode !== "code") {
        this.composer.fill(result.text)
      }
      const label = rewindLabel(mode)
      const undo = result.undo
      if (!undo) {
        toast.success(label)
        return
      }
      toast.success(label, {
        action: {
          label: "Undo code",
          onClick: () => {
            void this.chat.undoRewind(undo).catch((error: unknown) => {
              toast.error(errorText(error))
            })
          },
        },
      })
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  approvePlan = async () => {
    this.store.setApproving(true)
    try {
      await this.chat.approvePlan()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      this.store.setApproving(false)
    }
  }

  chooseFolder = async () => {
    try {
      await this.library.chooseFolder()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  openSettings = () => {
    this.overlay.setOpen("settings", true)
  }

  // A different chat opens with no edit, confirmation, held message or pending scroll of its own.
  private handleChatChanged = () => {
    this.toLatest = false
    this.anchor = null
    this.cancelJump()
    this.store.stopEdit()
    this.store.setConfirmEditId(null)
  }

  private attachScroller = (element: HTMLElement | null) => {
    if (element === this.scroller) {
      return
    }
    this.detachScroller()
    if (element === null) {
      return
    }
    this.scroller = element
    element.addEventListener("scroll", this.check, { passive: true })
    // Wheel too, so a window too short to scroll can still page.
    element.addEventListener("wheel", this.check, { passive: true })
  }

  private detachScroller = () => {
    this.scroller?.removeEventListener("scroll", this.check)
    this.scroller?.removeEventListener("wheel", this.check)
    this.scroller = null
  }

  // Asks for the next page when the reader is near an edge that has more turns.
  private check = () => {
    const scroller = this.scroller
    if (scroller === null || this.loading) {
      return
    }
    const fromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    const next = nextPage(this.run.transcriptPage, scroller.scrollTop, fromBottom)
    if (next === null) {
      return
    }
    // Keeps stick-to-bottom from chasing turns appended below the reader.
    if (next === "newer") {
      this.stick?.stopScroll()
    }
    this.anchor = visibleMessage(scroller)
    this.request(next)
  }

  private request = (next: TranscriptPage) => {
    this.loading = true
    this.chat
      .pageTranscript(next)
      // The new window renders before the next frame; the anchor is released after it.
      .then(() => new Promise<void>((resolve) => this.env.window.requestAnimationFrame(() => resolve())))
      .catch((error: unknown) => {
        toast.error(errorText(error))
      })
      .finally(() => {
        this.loading = false
        this.anchor = null
        this.check()
      })
  }

  // Keeps the held message where it was while the window moves. Once the reader has asked for
  // the latest turns and they are in, returns to the bottom instead.
  private followWindow = () => {
    if (this.toLatest && !this.run.transcriptPage.hasNewer) {
      this.toLatest = false
      this.anchor = null
      void this.stick?.scrollToBottom({ animation: "instant" })
      return
    }
    const held = this.anchor
    const scroller = this.scroller
    if (held === null || scroller === null) {
      return
    }
    const element = findMessage(scroller, held.id)
    if (element === null) {
      return
    }
    scroller.scrollTop += element.getBoundingClientRect().top - scroller.getBoundingClientRect().top - held.top
  }

  // Scrolls a search result's message into view once it has rendered, and releases the
  // stick-to-bottom lock so the chat does not snap back down. It flashes to show where it is.
  private followJump = () => {
    const id = this.store.jumpTo
    if (id === null || !this.run.messages.some((message) => message.id === id)) {
      this.cancelJump()
      return
    }
    if (this.jumping?.id === id) {
      return
    }
    this.cancelJump()
    const frame = this.env.window.requestAnimationFrame(() => this.finishJump(id))
    this.jumping = { id, frame }
  }

  private finishJump = (id: string) => {
    this.jumping = null
    this.store.setJumpTo(null)
    const element = findMessage(this.env.window.document, id)
    if (element === null) {
      return
    }
    this.stick?.stopScroll()
    element.scrollIntoView({ block: "center" })
    element.classList.remove("search-hit")
    void element.offsetWidth
    element.classList.add("search-hit")
  }

  private cancelJump = () => {
    if (this.jumping === null) {
      return
    }
    this.env.window.cancelAnimationFrame(this.jumping.frame)
    this.jumping = null
  }

  private findUserMessage = (messageId: string): UserMessage | undefined => {
    return this.run.messages.find((message): message is UserMessage => message.role === "user" && message.id === messageId)
  }

  private isLatestEditable = (messageId: string): boolean => {
    if (this.run.transcriptPage.hasNewer) {
      return false
    }
    return lastEditableMessage(this.run.messages)?.id === messageId
  }
}

// The toast text after a rewind.
function rewindLabel(mode: RewindMode): string {
  if (mode === "code") {
    return "Code rewound"
  }
  if (mode === "both") {
    return "Code and chat rewound"
  }
  return "Chat rewound"
}

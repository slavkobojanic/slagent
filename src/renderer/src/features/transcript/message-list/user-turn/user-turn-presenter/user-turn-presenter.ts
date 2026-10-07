import { reaction } from "mobx"
import { toast } from "sonner"
import type { RewindMode, UserMessage } from "@shared/types"
import type { API } from "@/ipc/api"
import type { RunStore } from "@/mirror/run-store/run-store"
import { errorText } from "@/lib/format"
import { lastEditableMessage } from "@/features/transcript/transcript-blocks"
import type { UserTurnStore } from "@/features/transcript/message-list/user-turn/user-turn-store/user-turn-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"

export class UserTurnPresenter {
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: UserTurnStore,
    private readonly runStore: RunStore,
    private readonly api: API,
    private readonly composerPort: ComposerPort,
    private readonly commandRegistry: CommandRegistry,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.disposers.push(
      reaction(() => this.runStore.transcriptChatId, this.handleChatChanged),
      this.commandRegistry.register({
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

  // The server replaces the message and everything after it, so the edit closes once the call
  // succeeds. A failed call keeps the draft.
  saveEdit = async () => {
    const messageId = this.store.editingId
    if (messageId === null || !this.store.canSaveEdit) {
      return
    }
    const text = this.store.editDraft.trim()
    this.store.setEditSaving(true)
    try {
      await this.api.editMessage(messageId, text)
      this.store.stopEdit()
    } catch (error) {
      toast.error(errorText(error))
      this.store.setEditSaving(false)
    }
  }

  // Only the live end of the chat has an editable message.
  editLast = () => {
    if (this.runStore.transcriptPage.hasNewer) {
      return
    }
    const last = lastEditableMessage(this.runStore.messages)
    if (last === undefined) {
      return
    }
    this.store.startEdit(last.id, last.text)
  }

  canEditLast = (): boolean => {
    if (this.runStore.streaming || this.runStore.transcriptPage.hasNewer) {
      return false
    }
    return lastEditableMessage(this.runStore.messages) !== undefined
  }

  // The rewritten prompt fills the composer unless only the code rewinds, and an undo of the
  // code stays on offer when the rewind saved one.
  rewind = async (messageId: string, mode: RewindMode) => {
    try {
      const result = await this.api.rewind(messageId, mode)
      if (mode !== "code") {
        this.composerPort.fill(result.text)
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
            void this.api.undoRewind(undo).catch((error: unknown) => {
              toast.error(errorText(error))
            })
          },
        },
      })
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  private handleChatChanged = () => {
    this.store.stopEdit()
    this.store.setConfirmEditId(null)
  }

  private findUserMessage = (messageId: string): UserMessage | undefined => {
    return this.runStore.messages.find((message): message is UserMessage => message.role === "user" && message.id === messageId)
  }

  private isLatestEditable = (messageId: string): boolean => {
    if (this.runStore.transcriptPage.hasNewer) {
      return false
    }
    return lastEditableMessage(this.runStore.messages)?.id === messageId
  }
}

function rewindLabel(mode: RewindMode): string {
  if (mode === "code") {
    return "Code rewound"
  }
  if (mode === "both") {
    return "Code and chat rewound"
  }
  return "Chat rewound"
}

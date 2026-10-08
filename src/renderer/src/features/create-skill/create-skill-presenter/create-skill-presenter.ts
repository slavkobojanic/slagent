import { toast } from "sonner"
import type { ChatMessage, DraftSkillInput, SkillLocation, SlashCommand } from "@shared/types"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { API } from "@/ipc/api"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import type { CreateSkillStore } from "../create-skill-store/create-skill-store"

// A skill folder name: kebab-case, no dots or slashes, so the path stays inside the skills directory.
export function isValidSkillName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(name)
}

// The last user message and the reply that followed it, scanning backwards through the transcript.
export function lastExchange(messages: ChatMessage[]): { userText: string; assistantText: string } | null {
  let assistantText = ""
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role === "assistant") {
      if (!message.streaming && assistantText === "") {
        assistantText = message.text
      }
      continue
    }
    if (message.role === "user" && message.text.trim() !== "") {
      if (assistantText.trim() === "") {
        return null
      }
      return { userText: message.text, assistantText }
    }
  }
  return null
}

export class CreateSkillPresenter {
  constructor(
    private readonly store: CreateSkillStore,
    private readonly runStore: RunStore,
    private readonly api: API,
    private readonly overlayStore: OverlayStore,
    private readonly log: Log,
  ) {}

  // The composer hands over the built-in command and any text typed after it.
  open = (command: SlashCommand, guidance: string) => {
    const exchange = lastExchange(this.runStore.messages)
    if (exchange === null) {
      toast.error("Send a message first", { description: "The skill is drafted from the last exchange." })
      return
    }
    this.log.action("open-create-skill", { command: command.insert, guidance })
    this.store.startDrafting(exchange.userText, exchange.assistantText, guidance)
    this.overlayStore.setOpen("create-skill", true)
    void this.draft()
  }

  setName = (name: string) => {
    this.store.setName(name)
  }

  setDescription = (description: string) => {
    this.store.setDescription(description)
  }

  setLocation = (location: SkillLocation) => {
    this.store.setLocation(location)
  }

  handleOpenChange = (open: boolean) => {
    if (!open) {
      this.close()
    }
  }

  close = () => {
    this.overlayStore.setOpen("create-skill", false)
    this.store.reset()
  }

  create = async () => {
    const name = this.store.name
    if (!isValidSkillName(name)) {
      this.store.setStatus("error")
      this.store.setError("Use a lowercase name with letters, numbers and dashes.")
      return
    }
    this.store.setStatus("saving")
    this.store.setError(null)
    try {
      const path = await this.api.createSkill({
        name,
        description: this.store.description,
        body: this.store.body,
        location: this.store.location,
      })
      this.log.action("create-skill", { name, location: this.store.location })
      toast.success(`Skill "${name}" created`, { description: path })
      this.close()
    } catch (error) {
      this.store.setStatus("error")
      this.store.setError(errorText(error))
    }
  }

  private draft = async () => {
    const request: DraftSkillInput = {
      userText: this.store.userText,
      assistantText: this.store.assistantText,
    }
    if (this.store.guidance !== "") {
      request.guidance = this.store.guidance
    }
    try {
      const draft = await this.api.draftSkill(request)
      this.store.setDraft(draft.name, draft.description, draft.body)
      this.store.setStatus("editing")
    } catch (error) {
      this.store.setStatus("error")
      this.store.setError(errorText(error))
    }
  }
}
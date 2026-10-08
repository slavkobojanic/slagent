import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class EmptyStatePresenter {
  constructor(
    private readonly api: API,
    private readonly overlayStore: OverlayStore,
    private readonly log: Log,
  ) {}

  chooseFolder = async () => {
    this.log.action("choose-folder")
    try {
      await this.api.chooseFolder()
    } catch (error) {
      this.log.warn("choose-folder-failed", { error })
      toast.error(errorText(error))
    }
  }

  createChatProject = async () => {
    this.log.action("create-chat-project")
    try {
      await this.api.createChatProject()
    } catch (error) {
      this.log.warn("create-chat-project-failed", { error })
      toast.error(errorText(error))
    }
  }

  openSettings = () => {
    this.log.action("open-settings")
    this.overlayStore.setOpen("settings", true)
  }
}

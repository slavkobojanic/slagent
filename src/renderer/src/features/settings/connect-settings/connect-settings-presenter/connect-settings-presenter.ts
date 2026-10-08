import { toast } from "sonner"
import type { Log } from "@/log/log"

export class ConnectSettingsPresenter {
  constructor(private readonly log: Log) {}

  handleCopy = async (text: string): Promise<void> => {
    if (!text) return
    this.log.action("copy-connect-url")
    await navigator.clipboard.writeText(text).catch((error) => {
      this.log.warn("copy-failed", { error })
    })
    toast.success("Connection address copied")
  }
}

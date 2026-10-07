import { getInstallContext } from "@/ipc/install-context"
import { FakeChatService } from "./fake-chat-service"
import { IpcChatService, type ChatService } from "./chat-service"

export function installChatService(): ChatService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeChatService()
  }

  return new IpcChatService(ctx.api)
}

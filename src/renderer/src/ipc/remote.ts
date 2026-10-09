import { createSlagentApi, WsClient } from "@shared/ws-client"
import { rewriteAttachmentLinks, socketUrl, type ServerAddress } from "@/lib/server-address"

// The phone has no preload: it opens the same websocket the desktop windows
// use, over Tailscale, and installs the same window.slagent the renderer reads.
// Links open on the phone, not on the Mac, and picked files go up as bytes.
export function connectRemote(window: Window, address: ServerAddress, clientId: string): WsClient {
  const client = new WsClient(socketUrl(address, clientId), (text) => rewriteAttachmentLinks(text, address))
  window.slagent = createSlagentApi(client, {
    platform: "ios",
    systemVersion: "",
    pathForFile: () => "",
    openExternal: async (url) => {
      window.open(url, "_blank")
    },
  })
  client.connect()
  return client
}


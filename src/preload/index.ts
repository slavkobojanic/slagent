import { contextBridge, webUtils } from "electron"
import { createSlagentApi, WsClient } from "../shared/ws-client"

// Connection details arrive from the main process as --slagent-key=value switches
// at the end of the sandboxed preload's argv.
function readArgument(key: string): string {
  const prefix = `--slagent-${key}=`
  const found = process.argv.find((arg) => typeof arg === "string" && arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : ""
}

const port = readArgument("port")
const token = readArgument("token")
const clientId = readArgument("client")
const windowToken = readArgument("window")

const client = new WsClient(
  `ws://127.0.0.1:${port}?token=${encodeURIComponent(token)}&client=${encodeURIComponent(clientId)}&window=${encodeURIComponent(windowToken)}`,
)
client.connect()

const api = createSlagentApi(client, {
  platform: process.platform,
  systemVersion: process.getSystemVersion(),
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ""
    }
  },
})

contextBridge.exposeInMainWorld("slagent", api)

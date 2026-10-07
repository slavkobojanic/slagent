import { app, BrowserWindow, ipcMain } from "electron"
import updater from "electron-updater"
import { channels } from "../shared/types"

// electron-updater is CommonJS and exposes `autoUpdater` through a getter, so default-import
// the module and destructure rather than relying on Node's named-export detection.
const { autoUpdater } = updater

type Options = {
  // Flush the agent session and stop helpers before the process is replaced by ShipIt.
  prepareQuit: () => Promise<void>
}

const checkInterval = 4 * 60 * 60 * 1000

// Version of the update that has finished downloading and is waiting for a restart.
let readyVersion: string | null = null
let restarting = false

export function startUpdater({ prepareQuit }: Options): void {
  // Registered even when updates are off so the renderer's calls always resolve.
  ipcMain.handle(channels.updateStatus, () => readyVersion)
  ipcMain.handle(channels.installUpdate, async () => {
    if (!readyVersion || restarting) return
    restarting = true
    await prepareQuit()
    autoUpdater.quitAndInstall()
  })

  if (!app.isPackaged || process.env.SLAGENT_DISABLE_UPDATER) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("error", (error) => {
    console.error("updater:", error)
  })
  autoUpdater.on("update-downloaded", (info) => {
    readyVersion = info.version
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(channels.updateReady, info.version)
    }
  })

  const check = () => void autoUpdater.checkForUpdates().catch((error) => console.error("updater:", error))
  check()
  setInterval(check, checkInterval)
}

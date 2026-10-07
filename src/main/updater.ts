import { app, BrowserWindow, dialog } from "electron"
import updater from "electron-updater"

// electron-updater is CommonJS and exposes `autoUpdater` through a getter, so default-import
// the module and destructure rather than relying on Node's named-export detection.
const { autoUpdater } = updater

type Options = {
  // Flush the agent session and stop helpers before the process is replaced by ShipIt.
  prepareQuit: () => Promise<void>
}

let restarting = false

export function startUpdater({ prepareQuit }: Options): void {
  if (!app.isPackaged || process.env.SLAGENT_DISABLE_UPDATER) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("error", (error) => {
    console.error("updater:", error)
  })
  autoUpdater.on("update-downloaded", (info) => {
    void promptToRestart(info.version, prepareQuit)
  })

  void autoUpdater.checkForUpdates().catch((error) => console.error("updater:", error))
}

async function promptToRestart(version: string, prepareQuit: () => Promise<void>): Promise<void> {
  if (restarting) return
  const options = {
    type: "info" as const,
    buttons: ["Restart", "Later"],
    defaultId: 0,
    cancelId: 1,
    message: `slagent ${version} is ready`,
    detail: "Restart to apply the update. It will also install the next time you quit.",
  }
  const win = BrowserWindow.getAllWindows()[0]
  const result = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options)
  if (result.response !== 0) return
  restarting = true
  await prepareQuit()
  autoUpdater.quitAndInstall()
}

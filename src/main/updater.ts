import { app, BrowserWindow, dialog, ipcMain } from "electron"
import updater from "electron-updater"
import { channels } from "../shared/types"

// electron-updater is CommonJS and exposes `autoUpdater` through a getter, so default-import
// the module and destructure rather than relying on Node's named-export detection.
const { autoUpdater } = updater

type Options = {
  // Flush the agent session and stop helpers before the process is replaced by ShipIt.
  prepareQuit: () => Promise<void>
}

const checkInterval = 10 * 60 * 1000

// Version of the update that has finished downloading and is waiting for a restart.
let readyVersion: string | null = null
let restarting = false
let prepare: (() => Promise<void>) | null = null

const enabled = () => app.isPackaged && !process.env.SLAGENT_DISABLE_UPDATER

async function install(): Promise<void> {
  if (!readyVersion || restarting || !prepare) return
  restarting = true
  await prepare()
  autoUpdater.quitAndInstall()
}

// Backs the Check for Updates… menu item. Unlike the background check, it always tells
// the user what happened.
export async function checkForUpdatesFromMenu(): Promise<void> {
  const window = BrowserWindow.getFocusedWindow() ?? undefined
  const show = (options: Electron.MessageBoxOptions) =>
    window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options)

  if (!enabled()) {
    await show({ type: "info", message: "Updates are only available in the released app." })
    return
  }
  if (readyVersion) {
    const { response } = await show({
      type: "info",
      message: `slagent ${readyVersion} is ready to install.`,
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
    })
    if (response === 0) await install()
    return
  }
  try {
    const result = await autoUpdater.checkForUpdates()
    if (result?.isUpdateAvailable) {
      await show({
        type: "info",
        message: `slagent ${result.updateInfo.version} is available.`,
        detail: "It's downloading in the background. A Restart button will appear when it's ready.",
      })
    } else {
      await show({ type: "info", message: "You're up to date.", detail: `slagent ${app.getVersion()} is the latest version.` })
    }
  } catch (error) {
    console.error("updater:", error)
    await show({
      type: "warning",
      message: "Couldn't check for updates.",
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

export function startUpdater({ prepareQuit }: Options): void {
  prepare = prepareQuit
  // Registered even when updates are off so the renderer's calls always resolve.
  ipcMain.handle(channels.updateStatus, () => readyVersion)
  ipcMain.handle(channels.installUpdate, install)

  if (!enabled()) return

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

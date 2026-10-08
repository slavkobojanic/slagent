import { app, BrowserWindow, dialog, ipcMain } from "electron"
import updater from "electron-updater"
import { channels, type UpdateCheckResult } from "../shared/types"
import { appVersion } from "./version"

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

// The check behind both the menu item and the settings About page.
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (!enabled()) {
    return { status: "disabled" }
  }
  if (readyVersion) {
    return { status: "ready", version: readyVersion }
  }
  try {
    const result = await autoUpdater.checkForUpdates()
    if (result?.isUpdateAvailable) {
      return { status: "available", version: result.updateInfo.version }
    }
    return { status: "up-to-date", version: appVersion }
  } catch (error) {
    console.error("updater:", error)
    return { status: "error", message: error instanceof Error ? error.message : String(error) }
  }
}

// Backs the Check for Updates… menu item. Unlike the background check, it always tells
// the user what happened.
export async function checkForUpdatesFromMenu(): Promise<void> {
  const window = BrowserWindow.getFocusedWindow() ?? undefined
  const show = (options: Electron.MessageBoxOptions) =>
    window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options)

  const result = await checkForUpdates()
  if (result.status === "disabled") {
    await show({ type: "info", message: "Updates are only available in the released app." })
    return
  }
  if (result.status === "ready") {
    const { response } = await show({
      type: "info",
      message: `slagent ${result.version} is ready to install.`,
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
    })
    if (response === 0) await install()
    return
  }
  if (result.status === "available") {
    await show({
      type: "info",
      message: `slagent ${result.version} is available.`,
      detail: "It's downloading in the background. A Restart button will appear when it's ready.",
    })
    return
  }
  if (result.status === "error") {
    await show({ type: "warning", message: "Couldn't check for updates.", detail: result.message })
    return
  }
  await show({ type: "info", message: "You're up to date.", detail: `slagent ${result.version} is the latest version.` })
}

export function startUpdater({ prepareQuit }: Options): void {
  prepare = prepareQuit
  // Registered even when updates are off so the renderer's calls always resolve.
  ipcMain.handle(channels.appVersion, () => appVersion)
  ipcMain.handle(channels.updateStatus, () => readyVersion)
  ipcMain.handle(channels.updateCheck, () => checkForUpdates())
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

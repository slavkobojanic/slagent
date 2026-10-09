import { app, BrowserWindow, dialog } from "electron"
import updater from "electron-updater"
import type { UpdateCheckResult } from "../shared/types"
import { appVersion } from "./version"

// electron-updater is CommonJS and exposes `autoUpdater` through a getter, so default-import
// the module and destructure rather than relying on Node's named-export detection.
const { autoUpdater } = updater

type Options = {
  // Flush the agent session and stop helpers before the process is replaced by ShipIt.
  // forUpdate is true when the quit is the install itself: ShipIt refuses to
  // replace the bundle while any instance of the app is running, so the caller
  // must not hand the port to the daemon, which runs the same bundle.
  prepareQuit: (forUpdate: boolean) => Promise<void>
  // A downloaded update waits for a restart; the websocket hub pushes it to clients.
  onReady: (version: string) => void
}

const checkInterval = 10 * 60 * 1000

// Version of the update that has finished downloading and is waiting for a restart.
let readyVersion: string | null = null
let restarting = false
let prepare: ((forUpdate: boolean) => Promise<void>) | null = null

const enabled = () => app.isPackaged && !process.env.SLAGENT_DISABLE_UPDATER

// Installs the update that has finished downloading and is waiting for a restart.
export async function installUpdate(): Promise<void> {
  if (!readyVersion || restarting || !prepare) return
  restarting = true
  try {
    await prepare(true)
    autoUpdater.quitAndInstall()
  } catch (error) {
    // The next click must be able to try again instead of silently doing nothing.
    restarting = false
    throw error
  }
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
    if (response === 0) await installUpdate()
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

// The renderer reads both from the websocket; appVersion comes from ./version.
export function updateStatus(): string | null {
  return readyVersion
}

export { appVersion }

export function startUpdater({ prepareQuit, onReady }: Options): void {
  prepare = prepareQuit

  if (!enabled()) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("error", (error) => {
    console.error("updater:", error)
  })
  autoUpdater.on("update-downloaded", (info) => {
    readyVersion = info.version
    onReady(info.version)
  })

  const check = () => void autoUpdater.checkForUpdates().catch((error) => console.error("updater:", error))
  check()
  setInterval(check, checkInterval)
}

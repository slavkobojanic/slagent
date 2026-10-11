import { app, Menu } from "electron"
import { appLog } from "./app-log"
import { bundleLogs } from "./log"
import { checkForUpdatesFromMenu } from "./updater"

// Gathers the app's log files into a folder and reveals it, so the user can
// attach them to a bug report without hunting through Library.
export async function saveLogsFromMenu(): Promise<void> {
  const result = await bundleLogs({ userData: app.getPath("userData"), appVersion: app.getVersion(), platform: process.platform })
  if ("error" in result) {
    appLog().error("menu", "save-logs-failed", { error: result.error })
    return
  }
  appLog().info("menu", "save-logs", { folder: result.archivePath })
}

// Electron's default menu plus a New Window item, a Check for Updates… item and
// a Save Logs item under Help. New windows each open their own websocket
// client, so two of them can sit in different projects.
export function setApplicationMenu(newWindow: () => void, saveLogs: () => void): void {
  const menu = Menu.buildFromTemplate([
    { role: "appMenu" },
    {
      label: "File",
      submenu: [
        { label: "New Window", accelerator: "CmdOrCtrl+N", click: newWindow },
        { type: "separator" },
        { role: "close" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "Check for Updates…", click: () => void checkForUpdatesFromMenu() },
        { label: "Save Logs", click: saveLogs },
      ],
    },
  ])
  Menu.setApplicationMenu(menu)
}

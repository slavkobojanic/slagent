import { Menu } from "electron"
import { checkForUpdatesFromMenu } from "./updater"

// Electron's default menu plus a New Window item and a Check for Updates… item
// under Help. New windows each open their own websocket client, so two of them
// can sit in different projects.
export function setApplicationMenu(newWindow: () => void): void {
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
    { role: "help", submenu: [{ label: "Check for Updates…", click: () => void checkForUpdatesFromMenu() }] },
  ])
  Menu.setApplicationMenu(menu)
}

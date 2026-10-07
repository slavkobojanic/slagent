import { Menu } from "electron"
import { checkForUpdatesFromMenu } from "./updater"

// Electron's default menu plus a Check for Updates… item under Help.
export function setApplicationMenu(): void {
  const menu = Menu.buildFromTemplate([
    { role: "appMenu" },
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    { role: "help", submenu: [{ label: "Check for Updates…", click: () => void checkForUpdatesFromMenu() }] },
  ])
  Menu.setApplicationMenu(menu)
}

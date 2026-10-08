import { readFileSync } from "node:fs"
import { join } from "node:path"
import { app } from "electron"

// The app's own version. Packaged builds carry it in the bundle metadata, but in dev
// app.getVersion() is Electron's version, so the app's package.json is read instead.
export const appVersion: string = app.isPackaged
  ? app.getVersion()
  : (JSON.parse(readFileSync(join(app.getAppPath(), "package.json"), "utf8")) as { version: string }).version

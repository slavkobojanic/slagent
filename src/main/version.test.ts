import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { app } from "electron"
import { vi } from "vitest"
import { appVersion } from "./version"

vi.mock("electron", () => ({ app: { isPackaged: false, getVersion: () => "99.0.0-electron", getAppPath: () => process.cwd() } }))

describe("appVersion", () => {
  it("can read the app's version from package.json in dev instead of Electron's", () => {
    const packageVersion = (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version

    expect(app.isPackaged).toBe(false)
    expect(appVersion).toBe(packageVersion)
    expect(appVersion).not.toBe("99.0.0-electron")
  })
})

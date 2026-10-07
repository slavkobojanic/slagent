import { execFileSync } from "node:child_process"
import { copyFileSync, renameSync, statSync, unlinkSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const name = "slagent"
const require = createRequire(import.meta.url)
const executable = require("electron")
const appBundle = join(dirname(executable), "../..")
const plist = join(appBundle, "Contents", "Info.plist")

function readKey(key) {
  return execFileSync("plutil", ["-extract", key, "raw", plist], { encoding: "utf8" }).trim()
}

if (readKey("CFBundleName") === name && readKey("CFBundleDisplayName") === name) {
  process.exit(0)
}

if (statSync(plist).nlink > 1) {
  const copy = `${plist}.copy`
  copyFileSync(plist, copy)
  unlinkSync(plist)
  renameSync(copy, plist)
}

for (const key of ["CFBundleName", "CFBundleDisplayName"]) {
  execFileSync("plutil", ["-replace", key, "-string", name, plist])
}

execFileSync("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister", [
  "-f",
  appBundle,
])

// Copies the editor's VS Code server into the app. electron-builder's extraResources always drops
// node_modules folders, which the server cannot run without, so the copy happens here instead. This
// runs before signing, so the server's binaries are signed and notarized with the rest of the app.
const { cpSync, existsSync } = require("node:fs")
const path = require("node:path")
const { Arch } = require("electron-builder")

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return
  const arch = Arch[context.arch]
  const source = path.join(__dirname, "..", "vendor", "vscode-server", "dist", `darwin-${arch}`)
  if (!existsSync(source)) {
    throw new Error(`The editor server is not built for ${arch}: run vendor/vscode-server/build.sh first (${source}).`)
  }
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  cpSync(source, path.join(app, "Contents", "Resources", "vscode-server"), { recursive: true, verbatimSymlinks: true })
}

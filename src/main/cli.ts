import { execFile } from "node:child_process"
import { access, constants, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ipcMain } from "electron"
import { channels, type CliStatus } from "../shared/types"

// /usr/local/bin is on PATH by default on macOS (/etc/paths), so the command works
// in any shell without editing a profile. It is root-owned on most machines, so
// writing there goes through the system's admin prompt.
const CLI_PATH = "/usr/local/bin/slagent"
const BUNDLE_ID = "com.slagent.app"
const MARKER = "# Installed by slagent from Settings > CLI."

// The script finds the app by bundle id rather than by path, so it keeps working
// when the app is moved or updated. `open` hands the folder to the running app
// (or launches it) as an open-file event.
const SCRIPT = `#!/bin/sh
${MARKER}
set -e
usage="usage: slagent [folder]"
case "\${1:-}" in
  -h|--help)
    echo "$usage"
    echo "Opens slagent, or opens the folder as a project in slagent."
    exit 0
    ;;
esac
if [ $# -gt 1 ]; then
  echo "$usage" >&2
  exit 2
fi
if [ $# -eq 0 ]; then
  exec open -b ${BUNDLE_ID}
fi
if [ ! -d "$1" ]; then
  echo "slagent: $1 is not a folder" >&2
  exit 1
fi
exec open -b ${BUNDLE_ID} "$(cd "$1" && pwd -P)"
`

export function registerCli(): void {
  ipcMain.handle(channels.cliStatus, () => cliStatus())
  ipcMain.handle(channels.cliInstall, async () => {
    await install()
    return cliStatus()
  })
  ipcMain.handle(channels.cliUninstall, async () => {
    await uninstall()
    return cliStatus()
  })
}

async function cliStatus(): Promise<CliStatus> {
  if (process.platform !== "darwin") return { path: CLI_PATH, state: "unsupported" }
  const current = await readFile(CLI_PATH, "utf8").catch(() => null)
  if (current === null) return { path: CLI_PATH, state: "missing" }
  if (!current.includes(MARKER)) return { path: CLI_PATH, state: "conflict" }
  return { path: CLI_PATH, state: current === SCRIPT ? "installed" : "outdated" }
}

async function install(): Promise<void> {
  const status = await cliStatus()
  if (status.state === "unsupported") throw new Error("The slagent command is only available on macOS.")
  if (status.state === "conflict") throw new Error(`${CLI_PATH} belongs to another program. Remove it first.`)
  const dir = await mkdtemp(join(tmpdir(), "slagent-cli-"))
  const staged = join(dir, "slagent")
  try {
    await writeFile(staged, SCRIPT, { mode: 0o755 })
    await privileged(`/bin/mkdir -p /usr/local/bin && /usr/bin/install -m 755 '${staged}' '${CLI_PATH}'`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function uninstall(): Promise<void> {
  const status = await cliStatus()
  if (status.state === "missing") return
  if (status.state !== "installed" && status.state !== "outdated") {
    throw new Error(`${CLI_PATH} was not installed by slagent, so it was left alone.`)
  }
  await privileged(`/bin/rm -f '${CLI_PATH}'`)
}

// Runs directly when /usr/local/bin is writable (Intel Homebrew setups), and
// otherwise asks for an admin password through the standard macOS prompt.
async function privileged(command: string): Promise<void> {
  if (await writable("/usr/local/bin")) {
    await exec("/bin/sh", ["-c", command])
    return
  }
  const script = `do shell script "${command.replace(/[\\"]/g, "\\$&")}" with administrator privileges`
  try {
    await exec("/usr/bin/osascript", ["-e", script])
  } catch (error) {
    // -128 is the user pressing Cancel on the password prompt.
    if (String(error).includes("-128")) throw new Error("Cancelled.")
    throw error
  }
}

async function writable(dir: string): Promise<boolean> {
  try {
    await access(dir, constants.W_OK)
    return true
  } catch {
    return false
  }
}

function exec(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 120_000 }, (error, _stdout, stderr) => {
      if (error) reject(new Error(String(stderr || error.message).trim()))
      else resolve()
    })
  })
}

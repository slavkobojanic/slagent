import { execFile } from "node:child_process"
import { readFile, rm, writeFile, mkdir } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import type { DaemonStatus } from "../shared/types"

export const DAEMON_LABEL = "com.slagent.daemon"
const MARKER = "<!-- Installed by slagent from Settings. -->"

const plistPath = (): string => join(homedir(), "Library", "LaunchAgents", `${DAEMON_LABEL}.plist`)

// The launchd domain of the logged-in user; daemons for one user live there.
const guiDomain = (): string => `gui/${process.getuid?.() ?? 0}`

export type DaemonProgram = {
  // The Electron binary, which runs this app headless with --daemon.
  program: string
  args: string[]
  // launchd captures the daemon's console output here.
  logPath: string
}

// Pure, so tests can check the plist without touching launchd.
export function daemonPlist({ program, args, logPath }: DaemonProgram): string {
  const strings = [program, ...args].map(escapeXml).map((value) => `      <string>${value}</string>`)
  return `${MARKER}
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${DAEMON_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
${strings.join("\n")}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ProcessType</key>
    <string>Background</string>
    <key>StandardOutPath</key>
    <string>${escapeXml(logPath)}</string>
    <key>StandardErrorPath</key>
    <string>${escapeXml(logPath)}</string>
</dict>
</plist>
`
}

export async function daemonStatus(): Promise<DaemonStatus> {
  if (process.platform !== "darwin") return { supported: false, installed: false, running: false }
  const current = await readFile(plistPath(), "utf8").catch(() => null)
  const installed = current !== null && current.includes(DAEMON_LABEL) && current.includes(MARKER)
  return { supported: true, installed, running: installed && (await isLoaded()) }
}

// Installs the LaunchAgent. It does not start the daemon here: the open app
// owns the server, so the daemon takes over when the app quits or the Mac
// restarts. uninstallDaemon stops a running one.
export async function installDaemon(launch: DaemonProgram): Promise<void> {
  if (process.platform !== "darwin") throw new Error("The daemon is only available on macOS.")
  await bootout().catch(() => undefined)
  await mkdir(join(homedir(), "Library", "LaunchAgents"), { recursive: true })
  await writeFile(plistPath(), daemonPlist(launch))
}

export async function uninstallDaemon(): Promise<void> {
  const status = await daemonStatus()
  if (!status.installed) return
  await bootout().catch(() => undefined)
  await rm(plistPath(), { force: true })
}

// Loads the service now, which starts the daemon because of RunAtLoad.
export async function startDaemon(): Promise<void> {
  const status = await daemonStatus()
  if (!status.installed) throw new Error("The daemon is not installed.")
  // A stale entry from a previous install cannot be bootstrapped twice.
  await bootout().catch(() => undefined)
  await launchctl("bootstrap", guiDomain(), plistPath())
}

// Unloads the service, which sends the daemon SIGTERM so it can flush first.
export async function stopDaemon(): Promise<void> {
  await bootout().catch(() => undefined)
}

// Whether launchd has the service loaded. KeepAlive keeps it there, so this
// doubles as "the daemon is running".
async function isLoaded(): Promise<boolean> {
  try {
    await launchctl("print", `${guiDomain()}/${DAEMON_LABEL}`)
    return true
  } catch {
    return false
  }
}

async function bootout(): Promise<void> {
  await launchctl("bootout", `${guiDomain()}/${DAEMON_LABEL}`)
}

function launchctl(...args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("/bin/launchctl", args, (error, stdout, stderr) => {
      if (error) reject(new Error(String(stderr || error.message).trim()))
      else resolve(String(stdout))
    })
  })
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

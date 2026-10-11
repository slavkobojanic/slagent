import { execFile } from "node:child_process"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { promisify } from "node:util"

const run = promisify(execFile)

export type ProcessTools = {
  // The command line of a running process, or null when there is none.
  command: (pid: number) => Promise<string | null>
  kill: (pid: number) => void
}

export const systemProcesses: ProcessTools = {
  command: async (pid) => {
    try {
      const { stdout } = await run("ps", ["-p", String(pid), "-o", "command="])
      return stdout.trim() || null
    } catch {
      return null
    }
  },
  kill: (pid) => {
    try {
      process.kill(pid, "SIGTERM")
    } catch {
      // Already gone.
    }
  },
}

const pidFile = (dataDir: string): string => join(dataDir, "server.pid")

export async function recordServer(dataDir: string, pid: number | undefined): Promise<void> {
  if (pid === undefined) return
  await mkdir(dirname(pidFile(dataDir)), { recursive: true })
  await writeFile(pidFile(dataDir), String(pid))
}

export async function forgetServer(dataDir: string): Promise<void> {
  await rm(pidFile(dataDir), { force: true })
}

// An editor server left over from an earlier launch that was killed instead of quit keeps the
// stable port, which would push this launch onto a new origin and its empty browser storage. Only a
// process whose command line is still this server is stopped; a reused pid is left alone.
export async function stopStaleServer(dataDir: string, tools: ProcessTools = systemProcesses): Promise<boolean> {
  let pid: number
  try {
    pid = Number((await readFile(pidFile(dataDir), "utf8")).trim())
  } catch {
    return false
  }
  await forgetServer(dataDir)
  if (!Number.isInteger(pid) || pid <= 1) return false
  const command = await tools.command(pid)
  if (command === null || !command.includes("server-main.js")) return false
  tools.kill(pid)
  // The port frees once the process has gone.
  for (let waited = 0; waited < 3000 && (await tools.command(pid)) !== null; waited += 100) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return true
}

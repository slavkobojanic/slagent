import { execFile } from "node:child_process"
import { connect } from "node:net"
import { delimiter } from "node:path"

// One machine on the tailnet, as the connected Mac sees it.
export type TailscalePeer = {
  name: string
  host: string
  port: number
  online: boolean
}

// Apps opened from the Dock get a bare PATH, and the Tailscale CLI lives inside
// the app bundle when no shim was installed, so both are tried.
const EXTRA_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]
const CLI_FALLBACKS = ["/Applications/Tailscale.app/Contents/MacOS/Tailscale"]
const SERVE_PORT = 8747
const PROBE_TIMEOUT_MS = 800

function env(): NodeJS.ProcessEnv {
  const parts = (process.env.PATH ?? "").split(delimiter).filter(Boolean)
  for (const extra of EXTRA_PATHS) if (!parts.includes(extra)) parts.push(extra)
  return { ...process.env, PATH: parts.join(delimiter) }
}

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 10_000, maxBuffer: 16 * 1024 * 1024, env: env() }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(String(stderr || stdout || "").trim() || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

// Every machine on the tailnet that answers on slagent's serve port, online
// ones first. Tailscale not installed, or its CLI absent, is an empty list.
export async function tailscalePeers(): Promise<TailscalePeer[]> {
  const raw = await statusJson()
  const peers = parsePeers(raw)
  const answered = await Promise.all(peers.map((peer) => answersOnServePort(peer.host)))
  return peers
    .filter((_, index) => answered[index])
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name))
}

async function statusJson(): Promise<string> {
  const attempts = ["tailscale", ...CLI_FALLBACKS]
  let last: unknown = null
  for (const command of attempts) {
    try {
      return await run(command, ["status", "--json"])
    } catch (error) {
      last = error
    }
  }
  throw last instanceof Error ? last : new Error("tailscale is not available.")
}

type StatusPeer = {
  DNSName?: string
  HostName?: string
  TailscaleIPs?: string[]
  Online?: boolean
}

// Splits `tailscale status --json` into slagent candidates. The reporting Mac
// itself arrives as Self, not Peer, and the connected phone needs it in the
// list too, so both are read.
export function parsePeers(raw: string): TailscalePeer[] {
  let parsed: { Self?: StatusPeer; Peer?: Record<string, StatusPeer> }
  try {
    parsed = JSON.parse(raw) as { Self?: StatusPeer; Peer?: Record<string, StatusPeer> }
  } catch {
    return []
  }
  const entries = [...Object.values(parsed.Peer ?? {}), ...(parsed.Self ? [parsed.Self] : [])]
  const peers: TailscalePeer[] = []
  for (const peer of entries) {
    const host = peer.TailscaleIPs?.[0]
    const name = (peer.DNSName ?? peer.HostName ?? "").replace(/\.$/, "")
    if (!host || name === "") continue
    peers.push({ name, host, port: SERVE_PORT, online: peer.Online ?? true })
  }
  return peers
}

// Whether that machine answers on the port slagent serves on, so only real
// candidates fill the list. A plain TCP connect is enough: an open serve port
// on a tailnet address is this app's server in practice.
function answersOnServePort(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port: SERVE_PORT })
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(PROBE_TIMEOUT_MS, () => done(false))
    socket.once("connect", () => done(true))
    socket.once("error", () => done(false))
  })
}

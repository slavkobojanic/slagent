import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { getAgentDir, VERSION, type McpServerConfig } from "@earendil-works/pi-coding-agent"
import {
  McpAuthRequiredError,
  McpClient,
  StdioTransport,
  StreamableHttpTransport,
  type AuthProvider,
  type McpTransport,
} from "@earendil-works/pi-mcp"
import {
  authorizeMcp,
  McpOAuthAuthorizationRequiredError,
  McpOAuthProvider,
  OAuthCallbackServer,
  type McpOAuthState,
  type McpOAuthStateStore,
} from "@earendil-works/pi-mcp/oauth"
import type { McpServerStatus, McpServerState } from "../shared/types"

// slagent stores its own MCP servers here, in the shared `mcpServers` shape.
// Pi also reads its user-level `~/.pi/agent/mcp.json` for sessions, but this
// file is what the settings panel manages.
export type McpServersFile = { mcpServers?: Record<string, McpServerConfig> }

const DEFAULT_SERVERS: Record<string, McpServerConfig> = {
  mobbin: {
    url: "https://api.mobbin.com/mcp",
    exposure: "direct",
    description:
      "Search Mobbin's library of real screens, flows, and website sections for design references.",
  },
  linear: {
    url: "https://mcp.linear.app/mcp",
    exposure: "direct",
    description: "Find, create, and update Linear issues, projects, and comments.",
  },
}

const PROBE_TIMEOUT_MS = 25_000

// Same rule Pi enforces for server names, so tools keep the `mcp__<server>__<tool>` shape.
const SERVER_NAME = /^[A-Za-z0-9_-]+$/

export type McpManagerOptions = {
  configPath: string
  authPath?: string
  openUrl: (url: string) => Promise<void> | void
}

export class McpManager {
  private servers: Record<string, McpServerConfig> = {}
  private readonly authPath: string
  private readonly openUrl: (url: string) => Promise<void> | void

  constructor(private readonly options: McpManagerOptions) {
    this.authPath = options.authPath ?? joinAgent("mcp-auth.json")
    this.openUrl = options.openUrl
  }

  /** Servers the sessions should register, disabled ones included. */
  serversForSession(): Record<string, McpServerConfig> {
    return this.servers
  }

  async start(): Promise<void> {
    const loaded = await this.readConfig()
    if (loaded) {
      this.servers = loaded
      return
    }
    this.servers = { ...DEFAULT_SERVERS }
    await this.writeConfig()
  }

  async list(): Promise<McpServerStatus[]> {
    const entries = Object.entries(this.servers).sort(([a], [b]) => a.localeCompare(b))
    return Promise.all(entries.map(([name, config]) => this.statusOf(name, config)))
  }

  // Names follow Pi's rule so session tools stay `mcp__<name>__<tool>`. Failing on
  // an existing name keeps the agent from silently replacing a server the user
  // configured; removal stays in Settings > MCP.
  async addServer(name: string, config: McpServerConfig): Promise<void> {
    if (!SERVER_NAME.test(name)) {
      throw new Error(`"${name}" is not a valid server name; use letters, digits, "_" and "-".`)
    }
    if (this.servers[name]) {
      throw new Error(`An MCP server named "${name}" already exists. Remove it in Settings > MCP first.`)
    }
    if ("url" in config) {
      if (!/^https?:\/\//.test(config.url)) throw new Error(`"${config.url}" is not an http(s) URL.`)
    } else if (typeof config.command !== "string" || !config.command.trim()) {
      throw new Error("A stdio server needs a command.")
    }
    this.servers = { ...this.servers, [name]: config }
    await this.writeConfig()
  }

  async setEnabled(name: string, enabled: boolean): Promise<McpServerStatus[]> {
    const config = this.servers[name]
    if (!config) throw new Error(`No MCP server named "${name}".`)
    this.servers = { ...this.servers, [name]: { ...config, enabled } }
    await this.writeConfig()
    return this.list()
  }

  async signIn(name: string): Promise<McpServerStatus[]> {
    const config = this.servers[name]
    if (!config) throw new Error(`No MCP server named "${name}".`)
    if (!("url" in config)) throw new Error(`"${name}" is a stdio server and does not sign in.`)
    if (config.auth) throw new Error(`"${name}" uses a stored provider token, not OAuth.`)

    const callback = await OAuthCallbackServer.listen({
      host: "127.0.0.1",
      path: "/callback",
      timeoutMs: 5 * 60_000,
    })
    try {
      await this.forgetStaleClient(name, config, callback.redirectUrl)
      const provider = this.provider(name, config, callback.redirectUrl, (url) => {
        void this.openUrl(url.toString())
      })
      const state = await provider.state()
      const result = await authorizeMcp(provider, {
        serverUrl: config.url,
        authorizationServerMetadataUrl: config.oauth?.authServerMetadataUrl
          ? new URL(config.oauth.authServerMetadataUrl)
          : undefined,
        scope: config.oauth?.scope,
      })
      if (result === "REDIRECT") {
        const { code, iss } = await callback.waitForCallback(state, new URL(callback.redirectUrl).pathname)
        await authorizeMcp(provider, { serverUrl: config.url, authorizationCode: code, iss })
      }
    } finally {
      await callback.close()
    }
    return this.list()
  }

  async signOut(name: string): Promise<McpServerStatus[]> {
    const config = this.servers[name]
    if (!config) throw new Error(`No MCP server named "${name}".`)
    if (!("url" in config)) throw new Error(`"${name}" is a stdio server and has no credentials.`)
    const states = await this.readAuth()
    if (delete states[this.storeKey(name, config.url)]) await this.writeAuth(states)
    return this.list()
  }

  // Dynamic client registration is stored on disk, but the loopback callback
  // binds a fresh port on every sign-in. Authorization servers that match
  // redirect URIs exactly reject the stale registered port at /authorize and
  // never call back, so the sign-in would wait out its whole timeout. Forget the
  // stored client when its redirect URIs no longer include this callback.
  private async forgetStaleClient(
    name: string,
    config: Extract<McpServerConfig, { url: string }>,
    redirectUrl: string,
  ): Promise<void> {
    if (config.oauth?.clientId) return
    const key = this.storeKey(name, config.url)
    const states = await this.readAuth()
    const state = states[key]
    if (!state) return
    const registered = state.clientInformation
    if (!registered || !("redirect_uris" in registered)) return
    if (registered.redirect_uris.includes(redirectUrl)) return
    delete state.clientInformation
    delete state.oauthState
    delete state.codeVerifier
    await this.writeAuth(states)
  }

  private async statusOf(name: string, config: McpServerConfig): Promise<McpServerStatus> {
    const enabled = config.enabled !== false
    const oauth = "url" in config && !config.auth && !hasAuthHeader(config)
    const description = config.description ?? null
    if (!enabled) {
      return { name, state: "disabled", enabled, oauth, tools: 0, description, detail: null }
    }
    const client = new McpClient({ name: "slagent", version: VERSION, requestTimeoutMs: PROBE_TIMEOUT_MS })
    try {
      await withTimeout(client.connect(this.transport(name, config)), PROBE_TIMEOUT_MS + 5_000)
      const tools = await client.listTools({ timeoutMs: PROBE_TIMEOUT_MS })
      const detail = client.instructions?.trim() || null
      await client.close().catch(() => undefined)
      return { name, state: "connected", enabled, oauth, tools: tools.length, description, detail }
    } catch (error) {
      await client.close().catch(() => undefined)
      const state: McpServerState = isAuthRequired(error) ? "needs-auth" : "error"
      return { name, state, enabled, oauth, tools: 0, description, detail: errorText(error) }
    }
  }

  private transport(name: string, config: McpServerConfig): McpTransport {
    if ("url" in config) {
      const headers = resolveValues(config.headers)
      const oauth = !config.auth && !hasAuthHeader(config)
      const authProvider = oauth ? this.authProvider(name, config) : undefined
      return new StreamableHttpTransport({
        url: config.url,
        headers,
        authProvider,
        openGetStream: false,
      })
    }
    return new StdioTransport({
      command: config.command,
      args: config.args,
      cwd: config.cwd,
      env: resolveValues(config.env),
      stderr: "pipe",
    })
  }

  // Sends stored tokens and refreshes them when possible, but never starts a
  // browser flow: a probe should report that sign-in is needed, not open one.
  private authProvider(name: string, config: Extract<McpServerConfig, { url: string }>): AuthProvider {
    const store = this.store(name, config.url)
    return {
      token: async () => (await store.load())?.tokens?.access_token,
      onUnauthorized: async () => {
        const state = await store.load()
        if (!state?.tokens?.refresh_token) throw new McpOAuthAuthorizationRequiredError()
        const provider = this.provider(name, config, "http://127.0.0.1/callback", () => undefined)
        const result = await authorizeMcp(provider, { serverUrl: config.url })
        if (result === "REDIRECT") throw new McpOAuthAuthorizationRequiredError()
      },
    }
  }

  private provider(
    name: string,
    config: Extract<McpServerConfig, { url: string }>,
    redirectUrl: string,
    onRedirect: (url: URL) => void,
  ): McpOAuthProvider {
    return new McpOAuthProvider({
      serverUrl: config.url,
      redirectUrl,
      clientMetadata: { client_name: "slagent" },
      clientId: config.oauth?.clientId,
      clientSecret: config.oauth?.clientSecret ? resolveValue(config.oauth.clientSecret) : undefined,
      store: this.store(name, config.url),
      onRedirect: (url) => onRedirect(url),
    })
  }

  private store(name: string, serverUrl: string): McpOAuthStateStore {
    const key = this.storeKey(name, serverUrl)
    return {
      load: async () => (await this.readAuth())[key],
      save: async (state: McpOAuthState) => {
        const states = await this.readAuth()
        states[key] = state
        await this.writeAuth(states)
      },
    }
  }

  private storeKey(name: string, serverUrl: string): string {
    return `${mcpNamespace(name)}|${String(new URL(serverUrl))}`
  }

  private async readAuth(): Promise<Record<string, McpOAuthState>> {
    try {
      const raw = await readFile(this.authPath, "utf8")
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== "object" || parsed === null) return {}
      return parsed as Record<string, McpOAuthState>
    } catch {
      return {}
    }
  }

  private async writeAuth(states: Record<string, McpOAuthState>): Promise<void> {
    await writeJsonAtomic(this.authPath, states)
  }

  private async readConfig(): Promise<Record<string, McpServerConfig> | null> {
    try {
      const raw = await readFile(this.options.configPath, "utf8")
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== "object" || parsed === null) return {}
      const servers = (parsed as McpServersFile).mcpServers
      if (typeof servers !== "object" || servers === null) return {}
      return servers as Record<string, McpServerConfig>
    } catch {
      return null
    }
  }

  private async writeConfig(): Promise<void> {
    await writeJsonAtomic(this.options.configPath, { mcpServers: this.servers })
  }
}

function joinAgent(file: string): string {
  return `${getAgentDir()}/${file}`
}

function mcpNamespace(name: string): string {
  return `mcp__${name.replace(/-/g, "_")}`
}

function hasAuthHeader(config: Extract<McpServerConfig, { url: string }>): boolean {
  if (!config.headers) return false
  return Object.keys(config.headers).some((key) => key.toLowerCase() === "authorization")
}

function isAuthRequired(error: unknown): boolean {
  return error instanceof McpOAuthAuthorizationRequiredError || error instanceof McpAuthRequiredError
}

function errorText(error: unknown): string | null {
  if (error instanceof Error) return error.message
  const text = String(error)
  return text === "[object Object]" ? null : text
}

function resolveValues(values: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!values) return undefined
  const resolved: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) resolved[key] = resolveValue(value)
  return resolved
}

function resolveValue(value: string): string {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, name: string) => process.env[name] ?? "")
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${randomUUID()}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temp, path)
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("The server did not respond in time.")), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

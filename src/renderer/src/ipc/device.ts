import { App } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { Keyboard } from "@capacitor/keyboard"
import { Preferences } from "@capacitor/preferences"
import { StatusBar, Style } from "@capacitor/status-bar"
import { socketUrl, type ServerAddress } from "@/lib/server-address"

const ADDRESS_KEY = "slagent:server-address"
const SERVERS_KEY = "slagent:servers"
const CLIENT_KEY = "slagent:client-id"
const NICKNAMES_KEY = "slagent:nicknames"
const PROBE_TIMEOUT_MS = 5000

export type SavedConnection = {
  address: ServerAddress | null
  // Stable across launches, so the desktop log can tell this phone's sessions apart.
  clientId: string
}

// The phone's side of the mobile app: saved settings, deep links and app
// lifecycle, through Capacitor's plugins. In a browser the plugins fall back to
// their web versions (localStorage), so the mobile build also runs in dev.
// Methods close over the plugins, so a test mock satisfies the type.
export class Device {
  readonly native: boolean
  readonly loadConnection: () => Promise<SavedConnection>
  // Saves the active Mac and keeps it in the roster, so the phone remembers
  // every machine it has connected to and can switch between them.
  readonly saveAddress: (address: ServerAddress | null) => Promise<void>
  readonly loadServers: () => Promise<ServerAddress[]>
  // Drops one machine from the roster; the active one is dropped by saveAddress(null).
  readonly forgetServer: (address: ServerAddress) => Promise<void>
  // Nicknames keyed by "host:port", so a person can name their machines and the
  // roster's hostnames stop being the only label.
  readonly loadNicknames: () => Promise<Record<string, string>>
  readonly saveNickname: (address: ServerAddress, nickname: string) => Promise<void>
  // Whether the desktop app answers at the address with its token.
  readonly probe: (address: ServerAddress) => Promise<boolean>
  readonly launchUrl: () => Promise<string | null>
  readonly onUrlOpen: (listener: (url: string) => void) => () => void
  readonly onResume: (listener: () => void) => () => void
  readonly setDarkChrome: (dark: boolean) => void
  readonly hideKeyboardBar: () => void
  // Fire as the keyboard starts to show or hide, so the page can move with it.
  readonly onKeyboardShow: (listener: (height: number) => void) => () => void
  readonly onKeyboardHide: (listener: () => void) => () => void
  readonly reload: () => void

  constructor(window: Window) {
    this.native = Capacitor.isNativePlatform()
    this.loadConnection = async () => {
      const [address, clientId] = await Promise.all([Preferences.get({ key: ADDRESS_KEY }), Preferences.get({ key: CLIENT_KEY })])
      let id = clientId.value ?? ""
      if (id === "") {
        id = `phone-${randomId(window)}`
        await Preferences.set({ key: CLIENT_KEY, value: id })
      }
      return { address: parseSaved(address.value), clientId: id }
    }
    this.saveAddress = async (address) => {
      if (address === null) {
        await Preferences.remove({ key: ADDRESS_KEY })
        return
      }
      await Preferences.set({ key: ADDRESS_KEY, value: JSON.stringify(address) })
      const roster = (await this.loadServers()).filter((saved) => !sameMachine(saved, address))
      await Preferences.set({ key: SERVERS_KEY, value: JSON.stringify([address, ...roster]) })
    }
    this.loadServers = async () => {
      const stored = await Preferences.get({ key: SERVERS_KEY })
      const roster = parseList(stored.value)
      // The address saved before the roster existed joins it on first read.
      const legacy = parseSaved((await Preferences.get({ key: ADDRESS_KEY })).value)
      if (legacy !== null && !roster.some((saved) => sameMachine(saved, legacy))) {
        return [legacy, ...roster]
      }
      return roster
    }
    this.forgetServer = async (address) => {
      const roster = (await this.loadServers()).filter((saved) => !sameMachine(saved, address))
      await Preferences.set({ key: SERVERS_KEY, value: JSON.stringify(roster) })
    }
    this.loadNicknames = async () => {
      const stored = await Preferences.get({ key: NICKNAMES_KEY })
      return parseNicknames(stored.value)
    }
    this.saveNickname = async (address, nickname) => {
      const trimmed = nickname.trim()
      const nicknames = await this.loadNicknames()
      if (trimmed === "") {
        delete nicknames[key(address)]
      } else {
        nicknames[key(address)] = trimmed
      }
      await Preferences.set({ key: NICKNAMES_KEY, value: JSON.stringify(nicknames) })
    }
    // Opens the websocket itself, so any slagent build that accepts the token answers.
    this.probe = (address) =>
      new Promise((resolve) => {
        const socket = new WebSocket(socketUrl(address, `probe-${randomId(window)}`))
        const finish = (ok: boolean) => {
          window.clearTimeout(timer)
          socket.onopen = null
          socket.onerror = null
          socket.onclose = null
          socket.close()
          resolve(ok)
        }
        const timer = window.setTimeout(() => finish(false), PROBE_TIMEOUT_MS)
        socket.onopen = () => finish(true)
        socket.onerror = () => finish(false)
        socket.onclose = () => finish(false)
      })
    this.launchUrl = async () => {
      if (!this.native) {
        return null
      }
      const launch = await App.getLaunchUrl().catch(() => undefined)
      return launch?.url ?? null
    }
    this.onUrlOpen = (listener) => handle(App.addListener("appUrlOpen", (event) => listener(event.url)))
    this.onResume = (listener) => {
      // The web build has no app events, so a tab coming back counts as a resume too.
      const visible = () => {
        if (window.document.visibilityState === "visible") listener()
      }
      window.document.addEventListener("visibilitychange", visible)
      const resume = handle(App.addListener("resume", listener))
      return () => {
        window.document.removeEventListener("visibilitychange", visible)
        resume()
      }
    }
    this.setDarkChrome = (dark) => {
      if (!this.native) return
      void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined)
    }
    this.hideKeyboardBar = () => {
      if (!this.native) return
      void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => undefined)
    }
    this.onKeyboardShow = (listener) => {
      if (!this.native) return noop
      return handle(Keyboard.addListener("keyboardWillShow", (info) => listener(info.keyboardHeight)))
    }
    this.onKeyboardHide = (listener) => {
      if (!this.native) return noop
      return handle(Keyboard.addListener("keyboardWillHide", () => listener()))
    }
    this.reload = () => window.location.reload()
  }
}

function noop(): void {}

// Plugin listeners register asynchronously; the disposer removes them once they exist.
function handle(registration: Promise<{ remove: () => Promise<void> }>): () => void {
  return () => {
    void registration.then((listener) => listener.remove()).catch(() => undefined)
  }
}

function parseSaved(value: string | null): ServerAddress | null {
  if (value === null) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as Partial<ServerAddress>
    if (typeof parsed.host !== "string" || typeof parsed.port !== "number" || typeof parsed.token !== "string") {
      return null
    }
    return { host: parsed.host, port: parsed.port, token: parsed.token, name: parsed.name }
  } catch {
    return null
  }
}

function parseNicknames(value: string | null): Record<string, string> {
  if (value === null) {
    return {}
  }
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const nicknames: Record<string, string> = {}
    for (const [key, nickname] of Object.entries(parsed)) {
      if (typeof nickname === "string" && nickname.trim() !== "") nicknames[key] = nickname.trim()
    }
    return nicknames
  } catch {
    return {}
  }
}

function parseList(value: string | null): ServerAddress[] {
  if (value === null) {
    return []
  }
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    const list: ServerAddress[] = []
    for (const entry of parsed) {
      const address = entry as Partial<ServerAddress>
      if (typeof address.host !== "string" || typeof address.port !== "number" || typeof address.token !== "string") continue
      list.push({ host: address.host, port: address.port, token: address.token, name: address.name })
    }
    return list
  } catch {
    return []
  }
}

// One roster entry per Mac, matched by address without the token, so a new
// QR code replaces the old credentials instead of adding a duplicate.
function sameMachine(a: ServerAddress, b: ServerAddress): boolean {
  return a.host === b.host && a.port === b.port
}

// The stable key for a machine across the roster and the nicknames.
function key(address: ServerAddress): string {
  return `${address.host}:${address.port}`
}

function randomId(window: Window): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

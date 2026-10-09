import type { ServerInfo } from "@shared/types"

// Where a remote client finds the desktop app's websocket server.
export type ServerAddress = {
  host: string
  port: number
  token: string
}

// The link the desktop app shows as a QR code. The phone's camera opens it in
// the app, which saves the address and connects.
const CONNECT_LINK = "slagent://connect"
const ATTACHMENT_LINK = "slagent://attachment/"

// Reads what a person pastes or scans: the desktop app's websocket address
// (ws://100.64.0.1:8747?token=…) or its slagent://connect link.
export function parseServerAddress(text: string): ServerAddress | null {
  const trimmed = text.trim()
  if (trimmed === "") {
    return null
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (url.protocol === "slagent:") {
    return addressFromParams(url.searchParams)
  }
  if (url.protocol !== "ws:" && url.protocol !== "http:") {
    return null
  }
  const token = url.searchParams.get("token") ?? ""
  const port = Number(url.port || "80")
  if (url.hostname === "" || token === "" || !validPort(port)) {
    return null
  }
  return { host: url.hostname, port, token }
}

export function connectLink(server: ServerInfo): string {
  const params = new URLSearchParams({ host: server.host, port: String(server.port), token: server.token })
  return `${CONNECT_LINK}?${params.toString()}`
}

export function socketUrl(address: ServerAddress, clientId: string): string {
  const params = new URLSearchParams({ token: address.token, client: clientId })
  return `ws://${hostPart(address.host)}:${address.port}?${params.toString()}`
}

export function addressLabel(address: ServerAddress): string {
  return `${hostPart(address.host)}:${address.port}`
}

// The server's attachment links use the desktop's own slagent:// scheme, which a
// phone cannot load. The same files are served over HTTP, behind the token.
export function rewriteAttachmentLinks(text: string, address: ServerAddress): string {
  if (!text.includes(ATTACHMENT_LINK)) {
    return text
  }
  const base = `http://${hostPart(address.host)}:${address.port}/${encodeURIComponent(address.token)}/attachment/`
  return text.split(ATTACHMENT_LINK).join(base)
}

function addressFromParams(params: URLSearchParams): ServerAddress | null {
  const host = params.get("host") ?? ""
  const token = params.get("token") ?? ""
  const port = Number(params.get("port") ?? "")
  if (host === "" || token === "" || !validPort(port)) {
    return null
  }
  return { host, port, token }
}

function validPort(port: number): boolean {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return false
  }
  return true
}

// IPv6 hosts need brackets inside a URL.
function hostPart(host: string): string {
  if (host.includes(":") && !host.startsWith("[")) {
    return `[${host}]`
  }
  return host
}

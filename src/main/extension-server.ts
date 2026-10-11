import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { extname } from "node:path"
import { rendererFile } from "./renderer-file"

const TYPES: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".cjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".html": "text/html",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".md": "text/markdown",
}

export type ExtensionServer = {
  baseUrl: string
  close: () => void
}

// Serves installed extension files to the editor's extension host. That host runs in a sandboxed
// iframe whose content policy only reaches 'self' and localhost, so the files come from loopback.
// It listens on 127.0.0.1 only and serves nothing outside the extensions folder.
export function startExtensionServer(root: string): Promise<ExtensionServer> {
  const server: Server = createServer((request, response) => {
    void (async () => {
      const headers = { "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin" }
      const url = new URL(request.url ?? "/", "http://localhost")
      const file = request.method === "GET" ? rendererFile(root, url.pathname) : null
      const info = file ? await stat(file).catch(() => null) : null
      if (!file || !info?.isFile()) {
        response.writeHead(404, headers).end()
        return
      }
      response.writeHead(200, { ...headers, "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream", "Content-Length": info.size })
      createReadStream(file).pipe(response)
    })().catch(() => {
      if (!response.headersSent) response.writeHead(500)
      response.end()
    })
  })
  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo
      resolve({ baseUrl: `http://localhost:${port}`, close: () => server.close() })
    })
  })
}

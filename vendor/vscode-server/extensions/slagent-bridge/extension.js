// The host app (slagent) talks to the workbench through this loopback endpoint. Every request
// needs the shared token; the port and token arrive as environment variables.
const vscode = require("vscode")
const http = require("node:http")

const COMMAND = /^workbench\.(view|action)\.[A-Za-z0-9.]+$/
const SETTING = /^(editor|workbench|files|window)\.[A-Za-z0-9.]+$/

const routes = {
  // { path, line? }: shows a file, optionally on a line.
  "/open": async ({ path, line }) => {
    if (typeof path !== "string") throw new Error("path is required")
    const at = new vscode.Position(Math.max(0, (Number(line) || 1) - 1), 0)
    await vscode.window.showTextDocument(vscode.Uri.file(path), { selection: new vscode.Range(at, at), preview: false })
  },
  // { id }: runs one of the workbench's own view or action commands.
  "/command": async ({ id }) => {
    if (typeof id !== "string" || !COMMAND.test(id)) throw new Error("command not allowed")
    await vscode.commands.executeCommand(id)
  },
  // { values }: updates user settings, for the keys the host app owns.
  "/settings": async ({ values }) => {
    const config = vscode.workspace.getConfiguration()
    for (const [key, value] of Object.entries(values ?? {})) {
      if (!SETTING.test(key)) throw new Error(`setting not allowed: ${key}`)
      await config.update(key, value, vscode.ConfigurationTarget.Global)
    }
  },
}

exports.activate = (context) => {
  const port = Number(process.env.SLAGENT_BRIDGE_PORT)
  const token = process.env.SLAGENT_BRIDGE_TOKEN
  if (!port || !token) return
  const server = http.createServer((request, response) => {
    const route = request.method === "POST" ? routes[request.url ?? ""] : undefined
    if (!route || request.headers["x-slagent-token"] !== token) {
      response.writeHead(404).end()
      return
    }
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", async () => {
      try {
        await route(JSON.parse(body || "{}"))
        response.writeHead(204).end()
      } catch (error) {
        response.writeHead(400).end(String(error?.message ?? error))
      }
    })
  })
  server.listen(port, "127.0.0.1")
  context.subscriptions.push({ dispose: () => server.close() })
}

// The host app (slagent) talks to the workbench through this loopback endpoint. Every request
// needs the shared token; the port and token arrive as environment variables. Questions asked
// about selected code go the other way, to the host's own endpoint, with the same token.
const vscode = require("vscode")
const http = require("node:http")

const COMMAND = /^workbench\.(view|action)\.[A-Za-z0-9.]+$/
const SETTING = /^(editor|workbench|files|window)\.[A-Za-z0-9.]+$/

// Colours belong to the theme, which the user can change. An override here would sit on top of every
// theme, and a colour that is not #hex is read as pure red, so none is accepted.
const THEME_SETTINGS = new Set(["workbench.colorTheme", "workbench.colorCustomizations", "editor.tokenColorCustomizations"])

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
      if (!SETTING.test(key) || THEME_SETTINGS.has(key)) throw new Error(`setting not allowed: ${key}`)
      await config.update(key, value, vscode.ConfigurationTarget.Global)
    }
  },
}

// Earlier versions pushed colour overrides into the user's settings. They stay stored, hide theme
// changes and can render as red, so they are removed once.
async function clearOldThemeOverrides(context) {
  const flag = "slagent.themeOverridesCleared"
  if (context.globalState.get(flag)) return
  const config = vscode.workspace.getConfiguration()
  for (const key of THEME_SETTINGS) await config.update(key, undefined, vscode.ConfigurationTarget.Global)
  await context.globalState.update(flag, true)
}

// Sends one request to the host app's endpoint.
function postToHost(route, body) {
  const port = Number(process.env.SLAGENT_HOST_PORT)
  const token = process.env.SLAGENT_BRIDGE_TOKEN
  if (!port || !token) return Promise.reject(new Error("slagent is not connected"))
  return new Promise((resolve, reject) => {
    const request = http.request({ host: "127.0.0.1", port, path: route, method: "POST", headers: { "x-slagent-token": token, "content-type": "application/json" } }, (response) => {
      response.resume()
      if (response.statusCode && response.statusCode < 300) resolve()
      else reject(new Error(`slagent refused the question (${response.statusCode})`))
    })
    request.on("error", reject)
    request.end(JSON.stringify(body))
  })
}

// Questions about code use the workbench's comment widget: the gutter offers it on every line,
// and the hotkey opens it on the selection. Submitting queues the question in slagent's composer.
function registerQuestions(context) {
  const controller = vscode.comments.createCommentController("slagent", "Slagent")
  controller.options = { prompt: "Ask slagent about this code", placeHolder: "Ask a question…" }
  controller.commentingRangeProvider = {
    provideCommentingRanges: (document) => (document.uri.scheme === "file" ? [new vscode.Range(0, 0, Math.max(0, document.lineCount - 1), 0)] : []),
  }
  context.subscriptions.push(
    controller,
    vscode.commands.registerCommand("slagent.ask", () => vscode.commands.executeCommand("workbench.action.addComment")),
    vscode.commands.registerCommand("slagent.cancelQuestion", (reply) => reply?.thread?.dispose()),
    vscode.commands.registerCommand("slagent.submitQuestion", async (reply) => {
      const thread = reply?.thread
      const text = String(reply?.text ?? "").trim()
      if (!thread?.range || !text) return
      const document = await vscode.workspace.openTextDocument(thread.uri)
      const { start, end } = thread.range
      // A selection that ends at the start of a line does not include that line.
      const last = end.line > start.line && end.character === 0 ? end.line - 1 : end.line
      const range = new vscode.Range(start.line, 0, last, document.lineAt(last).range.end.character)
      try {
        await postToHost("/comment", {
          path: vscode.workspace.asRelativePath(thread.uri, false),
          line: start.line + 1,
          endLine: last + 1,
          code: document.getText(range),
          text,
        })
        thread.dispose()
      } catch (error) {
        void vscode.window.showErrorMessage(String(error?.message ?? error))
      }
    }),
  )
}

exports.activate = (context) => {
  void clearOldThemeOverrides(context).catch(() => undefined)
  registerQuestions(context)
  const port = Number(process.env.SLAGENT_BRIDGE_PORT)
  const token = process.env.SLAGENT_BRIDGE_TOKEN
  if (!port || !token) return
  try {
    void routes["/settings"]({ values: JSON.parse(process.env.SLAGENT_SETTINGS || "{}") })
  } catch {
    // Bad settings from the host are ignored; the workbench keeps its defaults.
  }
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
  // A closed editor frame can leave an older extension host holding the port until the server drops
  // it, so a refused bind is retried instead of leaving this session without a bridge.
  let attempts = 0
  const bind = () => server.listen(port, "127.0.0.1")
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attempts++ < 120) {
      setTimeout(bind, 500)
    }
  })
  bind()
  context.subscriptions.push({ dispose: () => server.close() })
}

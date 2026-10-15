const fs = require("node:fs/promises")
const vscode = require("vscode")
const { analyzeTranslationCalls } = require("./analysis")
const { configuredValue } = require("./configuration")
const { parseI18nextConfig, resolveTranslation, resourceTemplates } = require("./resources")

const CONFIG_FILES = [
  "**/{i18n,i18next,i18n.config,i18next.config}.{js,jsx,ts,tsx,mjs,cjs}",
  "**/i18n/index.{js,jsx,ts,tsx,mjs,cjs}",
]
const EXCLUDED = "**/{node_modules,dist,build,out,coverage,.git}/**"
const CONFIG_LANGUAGES = new Set(["javascript", "javascriptreact", "typescript", "typescriptreact"])
const configCache = new Map()
const resourceCache = new Map()

function folderFor(document) {
  return vscode.workspace.getWorkspaceFolder(document.uri) || vscode.workspace.workspaceFolders?.[0]
}

async function projectOptions(folder) {
  const root = folder.uri.fsPath
  if (configCache.has(root)) return configCache.get(root)
  const pending = (async () => {
    const result = {}
    const seen = new Set()
    for (const pattern of CONFIG_FILES) {
      const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, pattern), EXCLUDED, 20)
      for (const uri of files) {
        if (seen.has(uri.fsPath)) continue
        seen.add(uri.fsPath)
        try {
          const text = await fs.readFile(uri.fsPath, "utf8")
          const config = parseI18nextConfig(text, uri.fsPath)
          if (!config) continue
          for (const [key, value] of Object.entries(config)) {
            if (result[key] === undefined && value !== undefined) result[key] = value
          }
        } catch {
          // An unreadable or dynamic config is ignored; workspace settings and path conventions still work.
        }
      }
    }
    return result
  })()
  configCache.set(root, pending)
  try {
    return await pending
  } catch (error) {
    configCache.delete(root)
    throw error
  }
}

function mergeNamespaceSettings(workspaceConfig, discovered) {
  const defaultNamespace = configuredValue(workspaceConfig, "defaultNamespace", "") || discovered.defaultNamespace || "translation"
  const namespaces = configuredValue(workspaceConfig, "namespaces", [])
  return {
    defaultNamespace,
    namespaces: Array.isArray(namespaces) && namespaces.length ? namespaces : discovered.namespaces,
    keySeparator: discovered.keySeparator,
    namespaceSeparator: discovered.namespaceSeparator,
  }
}

function hintPosition(document, call) {
  return document.positionAt(call.start)
}

async function provideHints(document, range, token, emitter, output) {
  if (!CONFIG_LANGUAGES.has(document.languageId) || document.uri.scheme !== "file") return []
  const folder = folderFor(document)
  if (!folder) return []
  const settings = vscode.workspace.getConfiguration("slagent.i18nHints", document.uri)
  if (!configuredValue(settings, "enabled", true)) return []

  try {
    const discovered = await projectOptions(folder)
    const projectConfig = mergeNamespaceSettings(settings, discovered)
    const calls = analyzeTranslationCalls(document.getText(), document.languageId, projectConfig)
    if (!calls.length) return []

    const locale = configuredValue(settings, "locale", "en") || "en"
    const templates = resourceTemplates(configuredValue(settings, "resourcePath", ""), discovered.resourcePath)
    const hints = []
    for (const call of calls) {
      if (token.isCancellationRequested) break
      const position = hintPosition(document, call)
      if (range && !range.contains(position)) continue
      const result = await resolveTranslation({
        root: folder.uri.fsPath,
        call,
        locale,
        templates,
        defaultNamespace: projectConfig.defaultNamespace,
        cache: resourceCache,
      })
      if (result.kind === "ambiguous") continue
      const label = result.kind === "translation" ? result.value
        : result.kind === "missing-key" ? "Missing translation"
          : "Resource not found"
      const hint = new vscode.InlayHint(position, ` ${label}`)
      hint.paddingLeft = true
      hints.push(hint)
    }
    return hints
  } catch (error) {
    output.appendLine(`Could not provide hints for ${document.uri.fsPath}: ${error?.message ?? error}`)
    emitter.fire()
    return []
  }
}

function activate(context) {
  const output = vscode.window.createOutputChannel("Slagent i18n hints")
  const emitter = new vscode.EventEmitter()
  const provider = {
    onDidChangeInlayHints: emitter.event,
    provideInlayHints: (document, range, token) => provideHints(document, range, token, emitter, output),
  }
  context.subscriptions.push(
    output,
    emitter,
    vscode.languages.registerInlayHintsProvider(
      [
        { language: "javascript" },
        { language: "javascriptreact" },
        { language: "typescript" },
        { language: "typescriptreact" },
      ],
      provider,
    ),
  )

  const configWatcher = vscode.workspace.createFileSystemWatcher("**/{i18n,i18next,i18n.config,i18next.config}.{js,jsx,ts,tsx,mjs,cjs}")
  const resourceWatcher = vscode.workspace.createFileSystemWatcher("**/*.json")
  const refresh = (uri) => {
    const folder = vscode.workspace.getWorkspaceFolder(uri)
    if (folder) configCache.delete(folder.uri.fsPath)
    resourceCache.clear()
    emitter.fire()
  }
  context.subscriptions.push(
    configWatcher,
    configWatcher.onDidChange(refresh),
    configWatcher.onDidCreate(refresh),
    configWatcher.onDidDelete(refresh),
    resourceWatcher,
    resourceWatcher.onDidChange(refresh),
    resourceWatcher.onDidCreate(refresh),
    resourceWatcher.onDidDelete(refresh),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("slagent.i18nHints")) {
        configCache.clear()
        emitter.fire()
      }
    }),
  )
}

function deactivate() {
  configCache.clear()
  resourceCache.clear()
}

module.exports = { activate, deactivate }

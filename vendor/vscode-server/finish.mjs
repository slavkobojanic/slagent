// Turns the raw gulp output into the distribution slagent ships: merges product.overrides.json,
// drops built-in extensions we do not want, and adds the bridge extension.
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, "..", "..")
const dist = process.argv[2]
if (!dist) throw new Error("usage: finish.mjs <dist dir>")

const product = JSON.parse(await readFile(join(dist, "product.json"), "utf8"))
const overrides = JSON.parse(await readFile(join(here, "product.overrides.json"), "utf8"))
product.extensionsGallery = overrides.extensionsGallery
product.configurationDefaults = { ...product.configurationDefaults, ...overrides.configurationDefaults }
// Without the Copilot extension there is no GitHub sign-in provider, so the account config that
// would wait for one is dropped.
delete product.defaultChatAgent
await writeFile(join(dist, "product.json"), `${JSON.stringify(product, null, 2)}\n`)

// Our own chat, terminal, notebooks and sign-in replace these.
const REMOVE = [
  "copilot",
  "github",
  "github-authentication",
  "microsoft-authentication",
  "ipynb",
  "notebook-renderers",
  "simple-browser",
  "terminal-suggest",
  "tunnel-forwarding",
  "vscode-api-tests",
  "vscode-colorize-tests",
  "vscode-colorize-perf-tests",
  "vscode-test-resolver",
]
for (const name of REMOVE) await rm(join(dist, "extensions", name), { recursive: true, force: true })

await cp(join(here, "extensions", "slagent-bridge"), join(dist, "extensions", "slagent-bridge"), { recursive: true })
const i18nExtensionSource = join(here, "extensions", "slagent-i18n-hints")
const i18nExtensionDist = join(dist, "extensions", "slagent-i18n-hints")
await rm(i18nExtensionDist, { recursive: true, force: true })
await mkdir(i18nExtensionDist, { recursive: true })
for (const file of ["package.json", "extension.js", "analysis.js", "configuration.js", "resources.js"]) {
  await cp(join(i18nExtensionSource, file), join(i18nExtensionDist, file))
}
try {
  await access(join(dist, "extensions", "node_modules", "typescript", "lib", "typescript.js"))
} catch {
  throw new Error("The VS Code bundle must include its TypeScript compiler for Slagent i18n hints")
}
console.log(`finished ${dist}`)

// The Slagent themes, generated from the app's own tokens so the editor matches the interface. They
// are bundled like any built-in theme, so the user can pick a different one.
const { editorTheme } = await import(join(repo, "src", "shared", "editor-theme.ts"))
const css = await readFile(join(repo, "src", "renderer", "src", "index.css"), "utf8")

function block(selector) {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`index.css has no ${selector} block`)
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start))
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]))
}

// Theme files take hex colours, so an rgba() token becomes #rrggbbaa.
function hex(value) {
  const match = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/.exec(value)
  if (!match) return value
  const byte = (n) => Math.round(Number(n)).toString(16).padStart(2, "0")
  const alpha = match[4] === undefined ? "" : byte(Number(match[4]) * 255)
  return `#${byte(match[1])}${byte(match[2])}${byte(match[3])}${alpha}`
}

const dark = block(":root")
const tokens = { dark, light: { ...dark, ...block("html.light") } }
await mkdir(join(dist, "extensions", "slagent-theme", "themes"), { recursive: true })
for (const mode of ["dark", "light"]) {
  const theme = editorTheme(mode, (token) => hex(tokens[mode][token] ?? "#00000000"))
  await writeFile(join(dist, "extensions", "slagent-theme", "themes", `slagent-${mode}.json`), `${JSON.stringify(theme, null, 2)}\n`)
}
await cp(join(here, "extensions", "slagent-theme", "package.json"), join(dist, "extensions", "slagent-theme", "package.json"))

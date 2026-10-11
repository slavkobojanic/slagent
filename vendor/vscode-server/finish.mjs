// Turns the raw gulp output into the distribution slagent ships: merges product.overrides.json,
// drops built-in extensions we do not want, and adds the bridge extension.
import { cp, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const dist = process.argv[2]
if (!dist) throw new Error("usage: finish.mjs <dist dir>")

const product = JSON.parse(await readFile(join(dist, "product.json"), "utf8"))
const overrides = JSON.parse(await readFile(join(here, "product.overrides.json"), "utf8"))
product.extensionsGallery = overrides.extensionsGallery
product.configurationDefaults = { ...product.configurationDefaults, ...overrides.configurationDefaults }
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
console.log(`finished ${dist}`)

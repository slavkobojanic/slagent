const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const { parseI18nextConfig, resolveTranslation, resourceTemplates } = require("./resources")

test("reads statically declared i18next path and namespace options", () => {
  const config = parseI18nextConfig(`
    i18next.init({
      fallbackLng: "en",
      ns: ["common", "account"],
      defaultNS: "common",
      keySeparator: ".",
      backend: { loadPath: "public/locales/{{lng}}/{{ns}}.json" }
    })
  `, "i18n.ts")
  assert.deepEqual(config, {
    resourcePath: "public/locales/{{lng}}/{{ns}}.json",
    defaultNamespace: "common",
    namespaces: ["common", "account"],
    keySeparator: ".",
    namespaceSeparator: undefined,
  })
})

test("uses repo path template before discovered config and conventional paths", () => {
  assert.deepEqual(resourceTemplates(".vscode/locales/{{lng}}/{{ns}}.json", "public/locales/{{lng}}/{{ns}}.json"), [
    ".vscode/locales/{{lng}}/{{ns}}.json",
    "public/locales/{{lng}}/{{ns}}.json",
    "locales/{{lng}}/{{ns}}.json",
    "src/locales/{{lng}}/{{ns}}.json",
    "public/locales/{{lng}}.json",
    "locales/{{lng}}.json",
    "src/locales/{{lng}}.json",
  ])
})

async function withWorkspace(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "slagent-i18n-hints-"))
  try {
    await run(root)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

test("resolves namespaced nested JSON strings and preserves raw interpolation text", async () => {
  await withWorkspace(async (root) => {
    const file = path.join(root, "public/locales/en/common.json")
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify({ settings: { welcome: "Hello {{name}}" } }))
    const result = await resolveTranslation({
      root,
      call: { key: "welcome", namespaces: ["common"], keyPrefix: "settings", keySeparator: ".", namespaceSeparator: ":" },
      locale: "en",
      templates: ["public/locales/{{lng}}/{{ns}}.json"],
      defaultNamespace: "translation",
      cache: new Map(),
    })
    assert.equal(result.kind, "translation")
    assert.equal(result.value, "Hello {{name}}")
  })
})

test("distinguishes missing keys, ambiguous plural objects, and missing resources", async () => {
  await withWorkspace(async (root) => {
    const file = path.join(root, "locales/en/common.json")
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify({ present: "Found", item: { one: "One item", other: "{{count}} items" } }))
    const common = {
      root,
      call: { key: "absent", namespaces: ["common"], keyPrefix: "", keySeparator: ".", namespaceSeparator: ":" },
      locale: "en",
      templates: ["locales/{{lng}}/{{ns}}.json"],
      defaultNamespace: "translation",
      cache: new Map(),
    }
    assert.equal((await resolveTranslation(common)).kind, "missing-key")
    assert.equal((await resolveTranslation({ ...common, call: { ...common.call, key: "item" } })).kind, "ambiguous")
    assert.equal((await resolveTranslation({ ...common, locale: "fr", cache: new Map() })).kind, "missing-resource")
  })
})

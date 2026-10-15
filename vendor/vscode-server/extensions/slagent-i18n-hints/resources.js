const fs = require("node:fs/promises")
const path = require("node:path")
const ts = require("typescript")
const YAML = require("./yaml")

const COMMON_RESOURCE_PATHS = [
  "config/locales/{{lng}}.yml",
  "config/locales/{{lng}}.yaml",
  "public/locales/{{lng}}/{{ns}}.json",
  "locales/{{lng}}/{{ns}}.json",
  "src/locales/{{lng}}/{{ns}}.json",
  "public/locales/{{lng}}.json",
  "locales/{{lng}}.json",
  "src/locales/{{lng}}.json",
]

function propertyName(node) {
  if (!node) return undefined
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text
  return undefined
}

function unwrap(node) {
  while (node && (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node))) {
    node = node.expression
  }
  return node
}

function getProperty(object, name) {
  object = unwrap(object)
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || propertyName(property.name) !== name) continue
    return unwrap(property.initializer)
  }
  return undefined
}

function staticValue(node) {
  node = unwrap(node)
  if (!node) return undefined
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isArrayLiteralExpression(node)) {
    const values = node.elements.map(staticValue)
    return values.every((value) => value !== undefined) ? values : undefined
  }
  return undefined
}

function parseI18nextConfig(text, fileName = "i18n.ts") {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, /\.tsx?$/.test(fileName) ? ts.ScriptKind.TS : ts.ScriptKind.JS)
  let options
  function visit(node) {
    if (options) return
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "init") {
      const candidate = node.arguments.find((argument) => ts.isObjectLiteralExpression(unwrap(argument)))
      if (candidate) options = unwrap(candidate)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!options) return undefined

  const backend = getProperty(options, "backend")
  const defaultNamespace = staticValue(getProperty(options, "defaultNS"))
  const namespaces = staticValue(getProperty(options, "ns"))
  const keySeparator = staticValue(getProperty(options, "keySeparator"))
  const namespaceSeparator = staticValue(getProperty(options, "nsSeparator"))
  return {
    resourcePath: staticValue(getProperty(backend, "loadPath")),
    defaultNamespace: typeof defaultNamespace === "string" ? defaultNamespace : undefined,
    namespaces: Array.isArray(namespaces) ? namespaces.filter((value) => typeof value === "string") : undefined,
    keySeparator: keySeparator === false ? false : typeof keySeparator === "string" ? keySeparator : undefined,
    namespaceSeparator: namespaceSeparator === false ? false : typeof namespaceSeparator === "string" ? namespaceSeparator : undefined,
  }
}

function resourceTemplates(workspaceTemplate, configTemplate) {
  return [...new Set([workspaceTemplate, configTemplate, ...COMMON_RESOURCE_PATHS]
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim()))]
}

function expandResourcePath(root, template, locale, namespace) {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(template)) return undefined
  const expanded = template
    .replace(/\{\{lng\}\}/g, locale)
    .replace(/\{\{ns\}\}/g, namespace)
    .replace(/\{\{language\}\}/g, locale)
  return path.resolve(root, expanded)
}

async function readResource(filePath, cache) {
  try {
    const stat = await fs.stat(filePath)
    const cached = cache.get(filePath)
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.value
    const text = await fs.readFile(filePath, "utf8")
    const value = /\.ya?ml$/i.test(filePath) ? YAML.parse(text, { uniqueKeys: false }) : JSON.parse(text)
    cache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, value })
    return value
  } catch {
    return undefined
  }
}

function localeCandidates(locale) {
  const candidates = [locale]
  if (locale.toLowerCase() === "en") candidates.push("en-GB", "en-US")
  else if (/^en-/i.test(locale)) candidates.push("en")
  return [...new Set(candidates)]
}

function localeResource(resource, locale, filePath) {
  if (!resource || typeof resource !== "object") return undefined
  if (!/\.ya?ml$/i.test(filePath)) return resource
  const filenameLocale = path.basename(filePath).replace(/\.ya?ml$/i, "")
  const value = resource[locale] ?? resource[filenameLocale]
  return value && typeof value === "object" ? value : resource
}

function nestedValue(resource, key, separator) {
  if (!resource || typeof resource !== "object") return undefined
  if (separator === false || separator === "") return resource[key]
  return String(key).split(separator || ".").reduce((value, part) => value && typeof value === "object" ? value[part] : undefined, resource)
}

function findTranslation(resource, key, prefix, keySeparator) {
  const fullKey = prefix ? `${prefix}${keySeparator === false || keySeparator === "" ? "" : keySeparator || "."}${key}` : key
  const value = nestedValue(resource, fullKey, keySeparator)
  if (typeof value === "string") return { kind: "translation", value }
  if (value && typeof value === "object") return { kind: "ambiguous" }
  return undefined
}

function splitNamespaceKey(key, namespaces, separator) {
  if (separator === false || !separator) return { key, namespaces }
  const index = key.indexOf(separator)
  if (index <= 0) return { key, namespaces }
  return { key: key.slice(index + separator.length), namespaces: [key.slice(0, index)] }
}

async function resolveTranslation({ root, call, locale, templates, defaultNamespace, cache }) {
  const namespaced = splitNamespaceKey(call.key, call.namespaces?.length ? call.namespaces : [defaultNamespace || "translation"], call.namespaceSeparator)
  const namespaces = namespaced.namespaces.length ? namespaced.namespaces : [defaultNamespace || "translation"]
  let foundResource = false
  let foundAmbiguousValue = false

  for (const namespace of namespaces) {
    for (const candidateLocale of localeCandidates(locale)) {
      for (const template of templates) {
        const filePath = expandResourcePath(root, template, candidateLocale, namespace)
        if (!filePath) continue
        const storedResource = await readResource(filePath, cache)
        if (storedResource === undefined) continue
        foundResource = true
        const resource = localeResource(storedResource, candidateLocale, filePath)
        const result = findTranslation(resource, namespaced.key, call.keyPrefix, call.keySeparator)
        if (result?.kind === "translation") return { ...result, filePath, namespace }
        if (result?.kind === "ambiguous") foundAmbiguousValue = true
      }
    }
  }

  if (foundAmbiguousValue) return { kind: "ambiguous" }
  return foundResource ? { kind: "missing-key" } : { kind: "missing-resource" }
}

module.exports = {
  COMMON_RESOURCE_PATHS,
  expandResourcePath,
  parseI18nextConfig,
  readResource,
  resolveTranslation,
  resourceTemplates,
  localeCandidates,
  localeResource,
}

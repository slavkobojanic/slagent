// Checks renderer code against the SPC rules in GUIDELINES.md.
// Usage: node scripts/check-spc.mjs [paths...]   (default: src/renderer/src)
// Folder rules read the path below src/renderer/src/, so fixtures must mirror that layout.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import ts from "typescript"

const MARKER = "/src/renderer/src/"
const HOOK = /^use[A-Z]/
const DISPOSERS = ["reaction", "autorun", "when"]
const MUTABLE = ["Map", "Set", "WeakMap", "WeakSet"]
const ARBITRARY = /\[-?\d+(\.\d+)?(px|rem|em|%)\]/
const WINDOWS = ["window", "globalThis", "self"]
const SUFFIX = /-(store|presenter)(\.tsx?)?$/
const REACT = /^(react|mobx-react)(-|\/|$)/

const files = (process.argv.length > 2 ? process.argv.slice(2) : ["src/renderer/src"]).flatMap((path) => walk(resolve(path)))
let count = 0
for (const file of files) {
  for (const line of lint(file)) {
    console.log(line)
    count += 1
  }
}
console.log(`${count} violation${count === 1 ? "" : "s"}`)
process.exitCode = count === 0 ? 0 : 1

function walk(path) {
  if (!existsSync(path)) {
    console.error(`check-spc: no such path ${path}`)
    process.exit(2)
  }
  if (statSync(path).isFile()) {
    return /\.tsx?$/.test(path) ? [path] : []
  }
  return readdirSync(path).flatMap((name) => walk(join(path, name)))
}

function lint(file) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, kind)
  const area = areaOf(file)
  const out = []
  const report = (node, rule, message) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
    const shown = relative(process.cwd(), file)
    out.push(`${shown.startsWith("..") ? file : shown}:${line + 1} ${rule}: ${message}`)
  }
  const visit = (node) => {
    check(node, file, area, report)
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function areaOf(file) {
  const abs = file.split(sep).join("/")
  const at = abs.indexOf(MARKER)
  const rel = at < 0 ? abs : abs.slice(at + MARKER.length)
  const [top, sub] = rel.split("/")
  const name = rel.split("/").at(-1)
  const vendored = top === "components" && (sub === "ui" || sub === "ai-elements")
  return {
    top,
    name,
    vendored,
    rendererSrc: at < 0 ? null : abs.slice(0, at + MARKER.length - 1),
    isCreate: top === "features" && name === "create.tsx",
    isStore: name.endsWith("-store.ts"),
    isPresenter: name.endsWith("-presenter.ts"),
    hookHome: !vendored && ["features", "components", "state", "mirror", "ipc", "lib"].includes(top),
    logicHome: ["features", "state", "mirror", "ipc", "lib"].includes(top),
    styleHome: !vendored && ["features", "state", "components"].includes(top),
    viewHome: name.endsWith(".tsx") && !vendored && ["features", "components"].includes(top) && name !== "create.tsx",
  }
}

function check(node, file, area, report) {
  if (ts.isCallExpression(node)) {
    checkCall(node, area, report)
  } else if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    checkModule(node, file, area, report)
  } else if (ts.isExpressionStatement(node)) {
    checkDisposer(node, report)
  } else if (ts.isVariableDeclaration(node)) {
    checkDeclaration(node, area, report)
  } else if (ts.isFunctionDeclaration(node) && node.name && HOOK.test(node.name.text) && !area.vendored) {
    report(node, "no-custom-hooks", `${node.name.text} is a hook; move its state to a store and its effects to a presenter`)
  } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    checkBridge(node, area, report)
  } else if (isLiteral(node)) {
    checkClass(node, area, report)
  }
}

function checkCall(node, area, report) {
  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const arg = node.arguments[0]
    if (arg && ts.isStringLiteral(arg) && arg.text.startsWith("../")) {
      report(node, "no-parent-imports", `import("${arg.text}") reaches up a folder`)
    }
    return
  }
  // vi.useFakeTimers() and friends are vitest controls, not React hooks.
  if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "vi") {
    return
  }
  const name = calleeName(node)
  if (!HOOK.test(name) || !area.hookHome) {
    return
  }
  if (area.isCreate && name === "useEffect") {
    return
  }
  report(node, "no-hooks-in-features", `${name}() is a hook; take state from stores and presenters, and props from the owner`)
}

function checkModule(node, file, area, report) {
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
    return
  }
  const spec = node.moduleSpecifier.text
  const segments = spec.split("/")
  if (spec.startsWith("../")) {
    report(node, "no-parent-imports", `"${spec}" reaches up a folder; use @/ or a child path`)
  }
  if (area.viewHome && segments.some((s) => SUFFIX.test(s) || ["ipc", "mirror", "state"].includes(s))) {
    report(node, "view-layer-imports", `view imports "${spec}"; views take props only`)
  }
  if (!area.isStore && !area.isPresenter) {
    return
  }
  if (REACT.test(spec)) {
    report(node, "store-purity", `"${spec}" imports React`)
  }
  if (!area.isStore) {
    return
  }
  if (importsTsx(spec, file, area)) {
    report(node, "store-purity", `"${spec}" imports a .tsx module`)
  }
  if (segments.includes("ipc")) {
    report(node, "store-purity", `"${spec}" imports ipc/`)
  }
  if (segments.some((s) => /-presenter(\.tsx?)?$/.test(s))) {
    report(node, "store-purity", `"${spec}" imports a presenter`)
  }
}

function importsTsx(spec, file, area) {
  if (spec.endsWith(".tsx")) {
    return true
  }
  let base = null
  if (spec.startsWith(".")) {
    base = resolve(dirname(file), spec)
  } else if (spec.startsWith("@/") && area.rendererSrc) {
    base = join(area.rendererSrc, spec.slice(2))
  } else if (spec.startsWith("@shared/") && area.rendererSrc) {
    base = join(area.rendererSrc, "../../shared", spec.slice(8))
  }
  return base !== null && existsSync(`${base}.tsx`)
}

function checkDisposer(node, report) {
  let expr = node.expression
  while (ts.isVoidExpression(expr) || ts.isParenthesizedExpression(expr)) {
    expr = expr.expression
  }
  if (!ts.isCallExpression(expr)) {
    return
  }
  const name = calleeName(expr)
  if (DISPOSERS.includes(name)) {
    report(node, "keep-disposers", `${name}(...) returns a disposer; keep it and call it in stop()`)
  }
}

function checkDeclaration(node, area, report) {
  const list = node.parent
  const statement = list.parent
  const topLevel = ts.isVariableStatement(statement) && ts.isSourceFile(statement.parent)
  const isConst = (list.flags & ts.NodeFlags.Const) !== 0
  if (ts.isIdentifier(node.name) && HOOK.test(node.name.text) && isConst && !area.vendored) {
    report(node, "no-custom-hooks", `${node.name.text} is a hook; move its state to a store and its effects to a presenter`)
  }
  if (topLevel && area.logicHome) {
    checkModuleState(node, isConst, report)
  }
  const destructures = ts.isObjectBindingPattern(node.name) && node.name.elements.some(takesSlagent)
  if (destructures && node.initializer && isWindow(node.initializer) && area.top !== "ipc") {
    report(node, "window-slagent-only-in-ipc", "reads slagent from window; use the services in ipc/")
  }
}

function checkModuleState(node, isConst, report) {
  const init = node.initializer
  if (!isConst) {
    report(node, "no-module-mutable-state", "module-level let/var holds mutable state; keep it in a store or a closure")
  } else if (init && ts.isNewExpression(init) && ts.isIdentifier(init.expression) && MUTABLE.includes(init.expression.text)) {
    report(node, "no-module-mutable-state", `module-level new ${init.expression.text}() is shared mutable state`)
  } else if (init && ts.isArrayLiteralExpression(init) && init.elements.length === 0) {
    report(node, "no-module-mutable-state", "module-level [] is shared mutable state")
  }
}

function checkBridge(node, area, report) {
  if (area.top === "ipc") {
    return
  }
  const key = ts.isPropertyAccessExpression(node)
    ? node.name.text
    : ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : ""
  if (key === "slagent" && isWindow(node.expression)) {
    report(node, "window-slagent-only-in-ipc", "window.slagent is read only in ipc/; use the services")
  }
}

function checkClass(node, area, report) {
  if (!area.styleHome) {
    return
  }
  const match = ARBITRARY.exec(node.text)
  if (match) {
    report(node, "no-arbitrary-tailwind", `arbitrary value ${match[0]}; use a spacing scale or token class`)
  }
}

function calleeName(call) {
  const callee = call.expression
  if (ts.isIdentifier(callee)) {
    return callee.text
  }
  return ts.isPropertyAccessExpression(callee) ? callee.name.text : ""
}

function isWindow(expr) {
  let bare = expr
  while (ts.isParenthesizedExpression(bare) || ts.isAsExpression(bare) || ts.isNonNullExpression(bare) || ts.isSatisfiesExpression(bare)) {
    bare = bare.expression
  }
  return ts.isIdentifier(bare) && WINDOWS.includes(bare.text)
}

function takesSlagent(element) {
  const key = element.propertyName ?? element.name
  return ts.isIdentifier(key) && key.text === "slagent"
}

function isLiteral(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)
}

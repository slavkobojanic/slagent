const ts = require("typescript")

function propertyName(node) {
  if (!node) return undefined
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text
  return undefined
}

function objectProperty(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue
    if (propertyName(property.name) !== name) continue
    return ts.isPropertyAssignment(property) ? property.initializer : property.name
  }
  return undefined
}

function literalString(node) {
  if (!node) return undefined
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  return undefined
}

function literalStringArray(node) {
  if (!node) return undefined
  const single = literalString(node)
  if (single !== undefined) return [single]
  if (!ts.isArrayLiteralExpression(node)) return undefined
  const values = node.elements.map(literalString)
  return values.every((value) => value !== undefined) ? values : undefined
}

function unwrap(node) {
  while (node && (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node))) {
    node = node.expression
  }
  return node
}

function scopeFor(node, isVar = false) {
  let current = node.parent
  while (current && !ts.isSourceFile(current)) {
    if (ts.isFunctionLike(current)) return isVar ? current : nearestBlock(current.body) || current
    if (!isVar && (ts.isBlock(current) || ts.isModuleBlock(current) || ts.isCaseClause(current) || ts.isForStatement(current) || ts.isForInStatement(current) || ts.isForOfStatement(current))) return current
    if (isVar && (ts.isBlock(current) || ts.isModuleBlock(current))) return current
    current = current.parent
  }
  return node.getSourceFile()
}

function nearestBlock(node) {
  if (!node) return undefined
  if (ts.isBlock(node) || ts.isModuleBlock(node)) return node
  return nearestBlock(node.parent)
}

function collectBindingNames(name, output) {
  if (ts.isIdentifier(name)) {
    output.push(name.text)
  } else if (ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) collectBindingNames(element.name, output)
  } else if (ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) if (ts.isBindingElement(element)) collectBindingNames(element.name, output)
  }
}

function hookBindingElements(name) {
  if (!ts.isObjectBindingPattern(name)) return []
  const bindings = []
  for (const element of name.elements) {
    const sourceName = propertyName(element.propertyName) ?? (ts.isIdentifier(element.name) ? element.name.text : undefined)
    if (sourceName === "t" && ts.isIdentifier(element.name)) bindings.push(element.name.text)
  }
  return bindings
}

function namespaceOptions(call) {
  const args = call.arguments
  const namespaces = args.length ? literalStringArray(unwrap(args[0])) : undefined
  const optionsNode = args.length > 1 ? unwrap(args[1]) : args.length === 1 && !literalStringArray(unwrap(args[0])) ? unwrap(args[0]) : undefined
  const keyPrefixNode = objectProperty(optionsNode, "keyPrefix")
  return {
    namespaces,
    keyPrefix: literalString(keyPrefixNode),
  }
}

function getStaticString(node, constants, position) {
  node = unwrap(node)
  const direct = literalString(node)
  if (direct !== undefined) return direct
  if (!node || !ts.isIdentifier(node)) return undefined
  const binding = closestBinding(constants.filter((entry) => entry.name === node.text && contains(entry.scope, position)))
  return binding && binding.start <= position ? binding.value : undefined
}

function contains(node, position) {
  return node.getStart() <= position && position <= node.end
}

function closestBinding(candidates) {
  return candidates.sort((a, b) => {
    const aWidth = a.scope.end - a.scope.getStart()
    const bWidth = b.scope.end - b.scope.getStart()
    return aWidth - bWidth || b.start - a.start
  })[0]
}

function analyzeTranslationCalls(text, languageId, projectOptions = {}) {
  const scriptKind = languageId === "typescriptreact" ? ts.ScriptKind.TSX
    : languageId === "typescript" ? ts.ScriptKind.TS
      : languageId === "javascriptreact" ? ts.ScriptKind.JSX
        : ts.ScriptKind.JS
  const source = ts.createSourceFile("source", text, ts.ScriptTarget.Latest, true, scriptKind)
  const hookNames = new Set()
  const bindings = []
  const constants = []

  function collectImports(node) {
    if (ts.isImportDeclaration(node) && literalString(node.moduleSpecifier) === "react-i18next") {
      const named = node.importClause?.namedBindings
      if (named && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          if (element.propertyName?.text === "useTranslation" || (!element.propertyName && element.name.text === "useTranslation")) {
            hookNames.add(element.name.text)
          }
        }
      }
    }
    ts.forEachChild(node, collectImports)
  }
  collectImports(source)

  function visit(node) {
    if (ts.isVariableDeclaration(node)) {
      const isConst = !!(node.parent.flags & ts.NodeFlags.Const)
      const isHookCall = ts.isCallExpression(unwrap(node.initializer)) && ts.isIdentifier(unwrap(node.initializer).expression)
        && hookNames.has(unwrap(node.initializer).expression.text)
      const hookInfo = isHookCall ? namespaceOptions(unwrap(node.initializer)) : undefined
      const isBlockScoped = !!(node.parent.flags & ts.NodeFlags.BlockScoped)
      const scope = scopeFor(node, !isBlockScoped)
      const declarationPosition = node.getStart()
      const names = []
      collectBindingNames(node.name, names)
      const value = isConst && ts.isIdentifier(node.name) && node.initializer ? literalString(unwrap(node.initializer)) : undefined
      for (const name of names) {
        constants.push({ name, value: ts.isIdentifier(node.name) && name === node.name.text ? value : undefined, scope, start: declarationPosition })
      }

      const translationNames = ts.isObjectBindingPattern(node.name) && isHookCall ? new Set(hookBindingElements(node.name)) : new Set()
      for (const name of names) {
        bindings.push({ name, translation: translationNames.has(name), hookInfo, scope, start: declarationPosition })
      }
    }
    if (ts.isParameter(node)) {
      const names = []
      collectBindingNames(node.name, names)
      const scope = scopeFor(node, false)
      for (const name of names) {
        bindings.push({ name, translation: false, scope, start: node.getStart() })
        constants.push({ name, value: undefined, scope, start: node.getStart() })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  if (!hookNames.size) return []
  const defaultNamespace = projectOptions.defaultNamespace || "translation"
  const configuredNamespaces = projectOptions.namespaces?.length ? projectOptions.namespaces : [defaultNamespace]
  const calls = []

  function visitCalls(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const candidates = bindings.filter((entry) => entry.name === node.expression.text && contains(entry.scope, node.getStart()))
      const binding = closestBinding(candidates)
      const key = node.arguments.length ? getStaticString(node.arguments[0], constants, node.getStart()) : undefined
      if (binding?.translation && binding.start <= node.getStart() && key !== undefined) {
        const callOptions = node.arguments.length > 1 ? unwrap(node.arguments[1]) : undefined
        const overrideNamespaces = literalStringArray(objectProperty(callOptions, "ns"))
        const prefixNode = objectProperty(callOptions, "keyPrefix")
        const callPrefix = literalString(prefixNode)
        const namespaces = overrideNamespaces || binding.hookInfo?.namespaces || configuredNamespaces
        calls.push({
          key,
          namespaces,
          keyPrefix: callPrefix !== undefined ? callPrefix : binding.hookInfo?.keyPrefix || "",
          start: node.end,
          keySeparator: projectOptions.keySeparator === undefined ? "." : projectOptions.keySeparator,
          namespaceSeparator: projectOptions.namespaceSeparator === undefined ? ":" : projectOptions.namespaceSeparator,
        })
      }
    }
    ts.forEachChild(node, visitCalls)
  }
  visitCalls(source)
  return calls
}

module.exports = { analyzeTranslationCalls, literalString, literalStringArray, objectProperty }

const test = require("node:test")
const assert = require("node:assert/strict")
const { analyzeTranslationCalls } = require("./analysis")

test("resolves imported hook aliases, destructured t aliases, local constants, namespaces, and keyPrefix", () => {
  const source = `
    import { useTranslation as useI18n } from "react-i18next"
    const { t: translate } = useI18n(["common", "account"], { keyPrefix: "settings" })
    const key = "save"
    translate(key)
  `
  assert.deepEqual(analyzeTranslationCalls(source, "typescriptreact"), [
    {
      key: "save",
      namespaces: ["common", "account"],
      keyPrefix: "settings",
      start: source.lastIndexOf("translate(key)") + "translate(key)".length,
      keySeparator: ".",
      namespaceSeparator: ":",
    },
  ])
})

test("applies per-call namespace and keyPrefix overrides", () => {
  const source = `
    import { useTranslation } from "react-i18next"
    const { t } = useTranslation("common", { keyPrefix: "home" })
    t("save", { ns: ["account", "common"], keyPrefix: "profile" })
  `
  const [call] = analyzeTranslationCalls(source, "typescript")
  assert.equal(call.key, "save")
  assert.deepEqual(call.namespaces, ["account", "common"])
  assert.equal(call.keyPrefix, "profile")
})

test("skips dynamic keys and t calls shadowed by unrelated parameters", () => {
  const source = `
    import { useTranslation } from "react-i18next"
    const { t } = useTranslation()
    const key = getKey()
    t(key)
    function unrelated(t) { return t("not-a-translation") }
  `
  assert.deepEqual(analyzeTranslationCalls(source, "javascriptreact"), [])
})

test("does not treat arbitrary t functions as react-i18next translations", () => {
  assert.deepEqual(analyzeTranslationCalls(`const t = (key) => key; t("hello")`, "javascript"), [])
})

test("does not resolve shadowed or not-yet-declared key and t bindings", () => {
  const source = `
    import { useTranslation } from "react-i18next"
    const { t } = useTranslation()
    const key = "outer"
    function shadowedKey() {
      const key = getKey()
      t(key)
    }
    function shadowedT() {
      t("not-a-hook-call")
      const { t } = anotherHook()
    }
  `
  assert.deepEqual(analyzeTranslationCalls(source, "typescript"), [])
})

const test = require("node:test")
const assert = require("node:assert/strict")
const { configuredValue } = require("./configuration")

test("keeps checked-in workspace settings primary unless the user explicitly overrides them", () => {
  assert.equal(configuredValue({ inspect: () => ({ workspaceValue: "repo-value" }) }, "resourcePath", ""), "repo-value")
  assert.equal(configuredValue({ inspect: () => ({ globalValue: "user-override", workspaceValue: "repo-value" }) }, "resourcePath", ""), "user-override")
  assert.equal(configuredValue({ inspect: () => ({}) }, "resourcePath", "fallback"), "fallback")
})

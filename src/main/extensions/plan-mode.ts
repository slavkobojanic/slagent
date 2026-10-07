import type { ExtensionAPI, ExtensionContext, ExtensionFactory } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"

// Pi has no plan mode of its own. This follows Pi's plan-mode example, but the
// plan comes back through a propose_plan tool and slagent shows it as a card
// to approve, instead of parsing a "Plan:" section and asking in a TUI.

const ENTRY = "slagent-plan-mode"
const CONTEXT = "slagent-plan-mode-context"
const PROPOSE = "propose_plan"
const WRITE_TOOLS = new Set([
  "edit",
  "write",
  "computer_open",
  "computer_click",
  "computer_set_value",
  "computer_type",
  "computer_key",
  "computer_scroll",
])

const PROMPT = `[PLAN MODE]
You are in plan mode. Research and plan, but change nothing.
- edit, write and the computer tools that act on apps are off.
- bash only runs read-only commands such as ls, cat, grep, git status, git diff and git log.
- Ask the user when something important is unclear.
When the plan is ready, call ${PROPOSE} once with the whole plan as markdown: the goal, numbered steps that name the files to change, and how to check the result. Then stop and wait.`

const DESTRUCTIVE = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bmv\b/i,
  /\bcp\b/i,
  /\bmkdir\b/i,
  /\btouch\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bln\b/i,
  /\btee\b/i,
  /\btruncate\b/i,
  /\bdd\b/i,
  /(^|[^<])>(?!>)/,
  />>/,
  /\b(npm|pnpm|yarn|bun)\s+(add|remove|install|uninstall|update|ci|link|publish|run|exec)\b/i,
  /\bpip3?\s+(install|uninstall)/i,
  /\bbrew\s+(install|uninstall|upgrade)/i,
  /\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout|switch|restore|clean|branch\s+-[dD]|stash|cherry-pick|revert|tag|init|clone|apply|am)\b/i,
  /\bsudo\b/i,
  /\b(kill|pkill|killall|reboot|shutdown)\b/i,
  /\bsed\s+(-[a-zA-Z]*i|--in-place)/i,
  /\b(vim?|nano|emacs|code|subl|open)\b/i,
]

const SAFE = [
  /^\s*(cat|head|tail|less|grep|egrep|rg|find|fd|ls|eza|tree|pwd|echo|printf|wc|sort|uniq|diff|file|stat|du|df|which|whereis|type|env|printenv|uname|whoami|id|date|uptime|ps|jq|awk|bat|basename|dirname|realpath|readlink|cut|tr|nl|column|xxd|od|md5|shasum)\b/,
  /^\s*sed\s+-n\b/,
  /^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get|ls-files|ls-tree|blame|rev-parse|describe|shortlog)\b/i,
  /^\s*(npm|pnpm|yarn)\s+(list|ls|view|info|why|outdated|audit)\b/i,
  /^\s*(node|python3?|ruby|go|cargo|rustc|swift)\s+(--version|-v|version)\b/i,
  /^\s*curl\s/i,
]

export function isReadOnlyCommand(command: string): boolean {
  const segments = command.split(/&&|\|\||;|\||\n/).filter((part) => part.trim())
  if (segments.length === 0) return false
  if (DESTRUCTIVE.some((pattern) => pattern.test(command))) return false
  return segments.every((segment) => SAFE.some((pattern) => pattern.test(segment)))
}

export type PlanModeHooks = {
  onEnabled: (enabled: boolean) => void
  onProposal: (plan: string) => void
}

export type PlanModeControl = {
  extension: ExtensionFactory
  setEnabled: (enabled: boolean) => void
  enabled: () => boolean
}

export function planMode(hooks: PlanModeHooks): PlanModeControl {
  let api: ExtensionAPI | null = null
  let enabled = false
  let toolsBefore: string[] | null = null

  function applyTools() {
    if (!api) return
    if (enabled) {
      if (!toolsBefore) toolsBefore = api.getActiveTools().filter((name) => name !== PROPOSE)
      api.setActiveTools([...toolsBefore.filter((name) => !WRITE_TOOLS.has(name)), PROPOSE])
      return
    }
    const restored = toolsBefore ?? api.getActiveTools().filter((name) => name !== PROPOSE)
    toolsBefore = null
    api.setActiveTools(restored.filter((name) => name !== PROPOSE))
  }

  function setEnabled(next: boolean) {
    if (next === enabled) return
    enabled = next
    applyTools()
    api?.appendEntry(ENTRY, { enabled })
    hooks.onEnabled(enabled)
  }

  function restore(ctx: ExtensionContext) {
    let next = false
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "custom" || entry.customType !== ENTRY) continue
      next = Boolean((entry.data as { enabled?: boolean } | undefined)?.enabled)
    }
    enabled = next
    toolsBefore = null
    applyTools()
    hooks.onEnabled(enabled)
  }

  const extension: ExtensionFactory = (pi) => {
    api = pi

    pi.registerTool({
      name: PROPOSE,
      label: "Propose plan",
      description: "Plan mode only. Send the finished plan to the user for approval, then stop.",
      promptSnippet: "Submit a finished plan for the user to approve",
      parameters: Type.Object({
        plan: Type.String({ description: "The whole plan as markdown." }),
      }),
      async execute(_id, input) {
        const plan = String((input as { plan?: unknown }).plan ?? "").trim()
        if (!enabled) return { content: [{ type: "text", text: "Plan mode is off. Carry on with the task." }], details: { plan } }
        if (!plan) return { content: [{ type: "text", text: "The plan was empty. Send the whole plan." }], details: { plan }, isError: true }
        hooks.onProposal(plan)
        return {
          content: [{ type: "text", text: "The plan is with the user. Stop here and wait for their answer." }],
          details: { plan },
          terminate: true,
        }
      },
    })

    pi.on("session_start", (_event, ctx) => restore(ctx))
    pi.on("session_tree", (_event, ctx) => restore(ctx))

    pi.on("tool_call", (event) => {
      if (!enabled) return
      if (WRITE_TOOLS.has(event.toolName)) {
        return { block: true, reason: `Plan mode: ${event.toolName} is off until the user approves a plan.` }
      }
      if (event.toolName !== "bash") return
      const command = String((event.input as { command?: unknown }).command ?? "")
      if (isReadOnlyCommand(command)) return
      return {
        block: true,
        reason: `Plan mode: only read-only commands run until the user approves a plan.\nCommand: ${command}`,
      }
    })

    pi.on("before_agent_start", () => {
      if (!enabled) return
      return { message: { customType: CONTEXT, content: PROMPT, display: false } }
    })

    // Old plan-mode reminders would keep the model read-only after approval.
    pi.on("context", (event) => {
      if (enabled) return
      return {
        messages: event.messages.filter((message) => (message as { customType?: string }).customType !== CONTEXT),
      }
    })
  }

  return { extension, setEnabled, enabled: () => enabled }
}

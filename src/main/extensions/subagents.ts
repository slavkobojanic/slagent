import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import {
  type AgentSession,
  CONFIG_DIR_NAME,
  createAgentSession,
  DefaultResourceLoader,
  type ExtensionFactory,
  getAgentDir,
  isToolCallEventType,
  type ModelRuntime,
  parseFrontmatter,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent"
import type { Usage } from "@earendil-works/pi-ai"
import { Type } from "typebox"
import { isReadOnlyCommand } from "./plan-mode"

// Pi's subagent example runs each agent as a separate pi process. Inside the
// app the agents run in-process with the SDK instead: each gets a fresh
// in-memory session, its own system prompt and tools, and only its final
// answer goes back to the parent. Agent files use the same format as the
// example: markdown with name, description, tools and model in frontmatter,
// in ~/.pi/agent/agents or .pi/agents in the project.

type Model = NonNullable<ReturnType<ModelRuntime["getModel"]>>

export type AgentConfig = {
  name: string
  description: string
  tools: string[]
  model?: string
  readOnly: boolean
  systemPrompt: string
  source: "built-in" | "user" | "project"
}

const ALLOWED_TOOLS = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"])
const MAX_PARALLEL = 4
const PROVIDER = "openrouter"

const BUILT_IN: AgentConfig[] = [
  {
    name: "explore",
    description: "Read-only search of the codebase. Use it to find where things are and how they work, and get back a short answer instead of the file dumps.",
    tools: ["read", "grep", "find", "ls", "bash"],
    readOnly: true,
    source: "built-in",
    systemPrompt: [
      "You are a fast code scout working for another agent.",
      "Search and read only what the task needs. Do not change files. Bash is limited to read-only commands.",
      "Answer with the facts the other agent asked for: file paths with line numbers, the relevant code in short excerpts, and how the pieces connect. No preamble.",
    ].join("\n"),
  },
  {
    name: "general",
    description: "A full coding agent for a self-contained task, such as a refactor in one area or a research question that needs commands.",
    tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
    readOnly: false,
    source: "built-in",
    systemPrompt: [
      "You are a coding agent working on one task handed to you by another agent.",
      "Finish the task, then reply with what you did, the files you changed, and anything the other agent must know. Keep it short.",
    ].join("\n"),
  },
]

export function discoverAgents(cwd: string): AgentConfig[] {
  const byName = new Map<string, AgentConfig>()
  for (const agent of BUILT_IN) byName.set(agent.name, agent)
  for (const agent of loadDir(join(getAgentDir(), "agents"), "user")) byName.set(agent.name, agent)
  const projectDir = nearestAgentsDir(cwd)
  if (projectDir) for (const agent of loadDir(projectDir, "project")) byName.set(agent.name, agent)
  return [...byName.values()]
}

function loadDir(dir: string, source: "user" | "project"): AgentConfig[] {
  if (!existsSync(dir)) return []
  const agents: AgentConfig[] = []
  let names: string[] = []
  try {
    names = readdirSync(dir).filter((name) => name.endsWith(".md"))
  } catch {
    return []
  }
  for (const name of names) {
    try {
      const { frontmatter, body } = parseFrontmatter<Record<string, unknown>>(readFileSync(join(dir, name), "utf8"))
      if (typeof frontmatter.name !== "string" || typeof frontmatter.description !== "string") continue
      let tools = toolList(frontmatter.tools)
      if (tools.length === 0) tools = ["read", "bash", "edit", "write", "grep", "find", "ls"]
      agents.push({
        name: frontmatter.name,
        description: frontmatter.description,
        tools,
        model: typeof frontmatter.model === "string" ? frontmatter.model : undefined,
        readOnly: !tools.includes("edit") && !tools.includes("write"),
        systemPrompt: body,
        source,
      })
    } catch {
      // One bad file should not hide the other agents.
    }
  }
  return agents
}

function toolList(value: unknown): string[] {
  let raw: unknown[] = []
  if (Array.isArray(value)) raw = value
  else if (typeof value === "string") raw = value.split(",")
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => ALLOWED_TOOLS.has(item))
}

function nearestAgentsDir(cwd: string): string | null {
  let dir = cwd
  while (true) {
    const candidate = join(dir, CONFIG_DIR_NAME, "agents")
    try {
      if (statSync(candidate).isDirectory()) return candidate
    } catch {
      // Keep walking up.
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

const readOnlyGuard: ExtensionFactory = (pi) => {
  pi.on("tool_call", (event) => {
    if (!isToolCallEventType("bash", event)) return
    if (isReadOnlyCommand(event.input.command)) return
    return { block: true, reason: "This agent is read-only. Only commands like ls, cat, grep, git diff and git log run." }
  })
}

type Run = {
  agent: string
  task: string
  text: string
  steps: string[]
  error: string | null
  usage: Usage
}

export type SubagentDeps = {
  cwd: string
  modelRuntime: ModelRuntime
  model: () => Model
}

export function subagentExtension(deps: SubagentDeps): ExtensionFactory {
  return (pi) => {
    const agents = discoverAgents(deps.cwd)
    const catalog = agents.map((agent) => `- ${agent.name}: ${agent.description}`).join("\n")

    pi.registerTool({
      name: "subagent",
      label: "Subagent",
      description: `Hand a self-contained task to a subagent with its own fresh context. Only its final answer comes back, which keeps your context small. Pass tasks to run up to ${MAX_PARALLEL} in parallel.\n\nAgents:\n${catalog}`,
      promptSnippet: "Delegate searches and self-contained tasks to subagents",
      promptGuidelines: [
        "Use the explore subagent for broad searches across many files when you only need the conclusion.",
        "Give each subagent everything it needs in the task: it cannot see this conversation.",
        "Run independent subagents in parallel with tasks.",
      ],
      parameters: Type.Object({
        agent: Type.Optional(Type.String({ description: "Agent name. Default explore." })),
        task: Type.Optional(Type.String({ description: "The task, written so it stands alone." })),
        tasks: Type.Optional(
          Type.Array(
            Type.Object({
              agent: Type.Optional(Type.String()),
              task: Type.String(),
            }),
            { description: `Up to ${MAX_PARALLEL} tasks to run in parallel instead of one.` },
          ),
        ),
      }),
      async execute(_id, input, signal, onUpdate) {
        const params = input as { agent?: string; task?: string; tasks?: { agent?: string; task: string }[] }
        let jobs = params.tasks ?? []
        if (params.task) jobs = [{ agent: params.agent, task: params.task }, ...jobs]
        jobs = jobs.filter((job) => job.task?.trim()).slice(0, MAX_PARALLEL)
        if (jobs.length === 0) {
          return { content: [{ type: "text", text: "Give a task, or tasks." }], details: {}, isError: true }
        }

        const runs: Run[] = jobs.map((job) => ({
          agent: job.agent?.trim() || "explore",
          task: job.task.trim(),
          text: "",
          steps: [],
          error: null,
          usage: emptyUsage(),
        }))

        function progress() {
          const states = runStates(runs)
          onUpdate?.({
            content: [{ type: "text", text: runs.map((run) => progressLine(run)).join("\n\n") }],
            details: { runs: states },
          })
        }

        await Promise.all(
          runs.map(async (run) => {
            const agent = agents.find((item) => item.name === run.agent)
            if (!agent) {
              run.error = `No agent named ${run.agent}. Agents: ${agents.map((item) => item.name).join(", ")}`
              return
            }
            try {
              await runAgent(deps, agent, run, signal, progress)
            } catch (error) {
              run.error = error instanceof Error ? error.message : String(error)
            }
            progress()
          }),
        )

        const text = runs
          .map((run) => {
            const head = runs.length > 1 ? `## ${run.agent}: ${run.task.split("\n")[0]?.slice(0, 80)}\n\n` : ""
            if (run.error) return `${head}Failed: ${run.error}`
            return `${head}${run.text || "(no answer)"}`
          })
          .join("\n\n")
        return {
          content: [{ type: "text", text }],
          details: { runs: runStates(runs) },
          usage: sumUsage(runs.map((run) => run.usage)),
          isError: runs.every((run) => run.error !== null),
        }
      },
    })
  }
}

async function runAgent(deps: SubagentDeps, agent: AgentConfig, run: Run, signal: AbortSignal | undefined, progress: () => void) {
  const agentDir = getAgentDir()
  const settingsManager = SettingsManager.create(deps.cwd, agentDir)
  const loader = new DefaultResourceLoader({
    cwd: deps.cwd,
    agentDir,
    settingsManager,
    noExtensions: true,
    noPromptTemplates: true,
    noThemes: true,
    appendSystemPrompt: [agent.systemPrompt],
    extensionFactories: agent.readOnly ? [readOnlyGuard] : [],
  })
  await loader.reload()
  let model = deps.model()
  if (agent.model) model = deps.modelRuntime.getModel(PROVIDER, agent.model) ?? model
  const { session } = await createAgentSession({
    cwd: deps.cwd,
    modelRuntime: deps.modelRuntime,
    model,
    tools: agent.tools,
    sessionManager: SessionManager.inMemory(deps.cwd),
    settingsManager,
    resourceLoader: loader,
  })
  const abort = () => void session.abort()
  signal?.addEventListener("abort", abort)
  const unsubscribe = session.subscribe((event) => {
    if (event.type !== "tool_execution_start") return
    run.steps.push(stepLabel(event.toolName, event.args))
    progress()
  })
  try {
    await session.bindExtensions({ mode: "print" })
    if (signal?.aborted) throw new Error("Stopped.")
    await session.prompt(run.task)
    run.text = session.getLastAssistantText() ?? ""
    run.usage = usageOf(session)
  } finally {
    unsubscribe()
    signal?.removeEventListener("abort", abort)
    session.dispose()
  }
}

// Structured state for the transcript UI: every run with its full step list, so the
// renderer can show what each subagent is doing live.
export type SubagentRunState = {
  agent: string
  task: string
  steps: string[]
  state: string
  error: string | null
}

function runStates(runs: Run[]): SubagentRunState[] {
  return runs.map((run) => ({
    agent: run.agent,
    task: run.task,
    steps: [...run.steps],
    state: runState(run),
    error: run.error,
  }))
}

function runState(run: Run): string {
  if (run.error) return `failed: ${run.error}`
  if (run.text) return "done"
  return run.steps.at(-1) ?? "starting"
}

function progressLine(run: Run): string {
  const state = runState(run)
  const recent = run.steps.slice(-3).map((step) => `    ${step}`).join("\n")
  return `[${run.agent}] ${run.task.split("\n")[0]?.slice(0, 80)}\n  ${run.steps.length} steps · ${state}${recent ? `\n${recent}` : ""}`
}

function stepLabel(name: string, args: unknown): string {
  if (typeof args !== "object" || args === null) return name
  const record = args as Record<string, unknown>
  for (const field of ["path", "command", "pattern"]) {
    const value = record[field]
    if (typeof value === "string" && value) return `${name} ${value.slice(0, 80)}`
  }
  return name
}

function emptyUsage(): Usage {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  }
}

function usageOf(session: AgentSession): Usage {
  const stats = session.getSessionStats()
  const usage = emptyUsage()
  usage.input = stats.tokens.input
  usage.output = stats.tokens.output
  usage.cacheRead = stats.tokens.cacheRead
  usage.cacheWrite = stats.tokens.cacheWrite
  usage.totalTokens = stats.tokens.total
  usage.cost.total = stats.cost
  return usage
}

function sumUsage(items: Usage[]): Usage {
  const total = emptyUsage()
  for (const item of items) {
    total.input += item.input
    total.output += item.output
    total.cacheRead += item.cacheRead
    total.cacheWrite += item.cacheWrite
    total.totalTokens += item.totalTokens
    total.cost.total += item.cost.total
  }
  return total
}

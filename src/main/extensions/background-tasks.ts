import type { ExtensionAPI, ExtensionFactory } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import type { TaskInfo, TerminalSession } from "../../shared/types"

// Pi's bash tool waits for each command to finish. These tools start long
// commands, such as dev servers, watchers and slow test runs, in the
// background, and let the agent read their output or stop them later.

const OUTPUT_LIMIT = 200_000
const DEFAULT_TAIL = 80
const RESULT = "slagent-task-result"

// Every task runs in a real terminal owned by the TerminalManager, so the
// user can open it in the drawer while the agent only reads the buffer.
export type TaskTerminalSpawner = {
  createTask: (command: string, sink: TaskSink, cwd?: string) => Promise<TerminalSession>
  stopTask: (id: string) => void
}

export type TaskSink = {
  onData: (chunk: string) => void
  onExit: (exitCode: number, signal: string | null) => void
}

type Task = TaskInfo & {
  running: boolean
  output: string
}

export type BackgroundTasks = {
  extension: ExtensionFactory
  list: () => TaskInfo[]
  output: (id: string) => string
  stop: (id: string) => boolean
  stopAll: () => void
}

export function backgroundTasks(spawner: () => TaskTerminalSpawner | null, cwd: string, onChange: (tasks: TaskInfo[], finished: TaskInfo | null) => void): BackgroundTasks {
  const tasks = new Map<string, Task>()
  let api: ExtensionAPI | null = null
  let streaming = false

  function info(task: Task): TaskInfo {
    return {
      id: task.id,
      label: task.label,
      command: task.command,
      status: task.status,
      exitCode: task.exitCode,
      startedAt: task.startedAt,
      endedAt: task.endedAt,
    }
  }

  function list(): TaskInfo[] {
    return [...tasks.values()].map(info).sort((left, right) => right.startedAt - left.startedAt)
  }

  // The pty renders in a terminal for the user, but the buffer feeds the agent
  // and the output dialogs, so control sequences are stripped.
  function append(task: Task, chunk: string) {
    task.output += chunk.replace(ANSI, "")
    if (task.output.length > OUTPUT_LIMIT) task.output = task.output.slice(-OUTPUT_LIMIT)
  }

  function finish(task: Task, exitCode: number, signal: string | null) {
    task.running = false
    task.endedAt = Date.now()
    task.exitCode = exitCode
    if (task.status === "running") task.status = exitCode === 0 ? "done" : "failed"
    if (signal && task.status !== "stopped") task.status = "failed"
    onChange(list(), info(task))
    tell(task)
  }

  async function start(command: string, label: string): Promise<Task> {
    const task: Task = {
      id: "",
      label,
      command,
      status: "running",
      exitCode: null,
      startedAt: Date.now(),
      endedAt: null,
      running: true,
      output: "",
    }
    const terminalTasks = spawner()
    if (terminalTasks === null) {
      throw new Error("Background terminals are not available yet.")
    }
    const session = await terminalTasks.createTask(command, {
      onData: (chunk) => append(task, chunk),
      onExit: (exitCode, signal) => finish(task, exitCode, signal),
    }, cwd)
    task.id = session.id
    tasks.set(task.id, task)
    onChange(list(), null)
    return task
  }

  // The agent hears about finished tasks: right away while it is working, or
  // with the next message otherwise, so a finished task never starts a run.
  function tell(task: Task) {
    if (!api || task.status === "stopped") return
    let state = `exited with code ${task.exitCode ?? "unknown"}`
    if (task.status === "done") state = "finished"
    api.sendMessage(
      {
        customType: RESULT,
        content: `Background task ${task.id} (${task.label}) ${state}.\nLast output:\n${tail(task.output, 20)}`,
        display: false,
      },
      { deliverAs: streaming ? "followUp" : "nextTurn" },
    )
  }

  function stop(id: string): boolean {
    const task = tasks.get(id)
    if (!task || !task.running) return false
    const terminalTasks = spawner()
    if (terminalTasks === null) return false
    task.status = "stopped"
    terminalTasks.stopTask(id)
    return true
  }

  const extension: ExtensionFactory = (pi) => {
    api = pi
    pi.on("agent_start", () => {
      streaming = true
    })
    pi.on("agent_settled", () => {
      streaming = false
    })

    pi.registerTool({
      name: "bash_background",
      label: "Start background task",
      description:
        "Start a shell command that keeps running after this call returns, such as a dev server, a file watcher or a long test run. Returns a task id. You are told when it exits.",
      promptSnippet: "Run long commands like dev servers in the background",
      promptGuidelines: [
        "Use bash_background for servers, watchers and anything that runs longer than a minute. Use bash for everything else.",
        "Read output with task_output and stop tasks you no longer need with task_stop.",
      ],
      parameters: Type.Object({
        command: Type.String({ description: "The shell command to run in the project folder." }),
        label: Type.Optional(Type.String({ description: "A few words naming the task, like dev server." })),
      }),
      async execute(_id, input) {
        const { command, label } = input as { command: string; label?: string }
        if (spawner() === null) {
          return { content: [{ type: "text", text: "Background terminals are not available yet." }], details: { id: "" }, isError: true }
        }
        const task = await start(command, label?.trim() || command.slice(0, 60))
        await new Promise((resolve) => setTimeout(resolve, 1500))
        let state = "is running"
        if (task.status !== "running") state = `exited with code ${task.exitCode}`
        return {
          content: [{ type: "text", text: `Task ${task.id} ${state}.\nFirst output:\n${tail(task.output, 30) || "(none yet)"}` }],
          details: { id: task.id },
        }
      },
    })

    pi.registerTool({
      name: "task_output",
      label: "Task output",
      description: "Read the latest output and status of a background task.",
      parameters: Type.Object({
        id: Type.String({ description: "Task id from bash_background." }),
        lines: Type.Optional(Type.Number({ description: `How many trailing lines to return. Default ${DEFAULT_TAIL}.` })),
      }),
      async execute(_id, input) {
        const { id, lines } = input as { id: string; lines?: number }
        const task = tasks.get(id)
        if (!task) return { content: [{ type: "text", text: `No task ${id}. Known tasks: ${[...tasks.keys()].join(", ") || "none"}` }], details: {}, isError: true }
        const status = task.status === "running" ? "running" : `${task.status}, exit code ${task.exitCode}`
        return {
          content: [{ type: "text", text: `Task ${id} (${task.label}) is ${status}.\n${tail(task.output, lines ?? DEFAULT_TAIL)}` }],
          details: {},
        }
      },
    })

    pi.registerTool({
      name: "task_stop",
      label: "Stop task",
      description: "Stop a background task and everything it started.",
      parameters: Type.Object({ id: Type.String({ description: "Task id from bash_background." }) }),
      async execute(_id, input) {
        const { id } = input as { id: string }
        const stopped = stop(id)
        return { content: [{ type: "text", text: stopped ? `Stopping task ${id}.` : `Task ${id} is not running.` }], details: {} }
      },
    })

    pi.on("session_shutdown", () => {
      for (const task of tasks.values()) stop(task.id)
    })
  }

  return {
    extension,
    list,
    output: (id) => tasks.get(id)?.output ?? "",
    stop,
    stopAll: () => {
      for (const task of tasks.values()) stop(task.id)
    },
  }
}

function tail(text: string, lines: number): string {
  const parts = text.trimEnd().split("\n")
  return parts.slice(-Math.max(1, lines)).join("\n")
}

// CSI sequences, OSC titles and charset switches the pty stream carries.
const ANSI = /\x1b(?:\[[0-9;:?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\))/g

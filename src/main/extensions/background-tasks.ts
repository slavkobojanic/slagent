import { type ChildProcess, spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import type { ExtensionAPI, ExtensionFactory } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import type { TaskInfo } from "../../shared/types"

// Pi's bash tool waits for each command to finish. These tools start long
// commands, such as dev servers, watchers and slow test runs, in the
// background, and let the agent read their output or stop them later.

const OUTPUT_LIMIT = 200_000
const DEFAULT_TAIL = 80
const RESULT = "slagent-task-result"

type Task = TaskInfo & {
  child: ChildProcess | null
  output: string
}

export type BackgroundTasks = {
  extension: ExtensionFactory
  list: () => TaskInfo[]
  output: (id: string) => string
  stop: (id: string) => boolean
  stopAll: () => void
}

export function backgroundTasks(cwd: string, onChange: (tasks: TaskInfo[], finished: TaskInfo | null) => void): BackgroundTasks {
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

  function append(task: Task, chunk: Buffer) {
    task.output += chunk.toString("utf8")
    if (task.output.length > OUTPUT_LIMIT) task.output = task.output.slice(-OUTPUT_LIMIT)
  }

  function start(command: string, label: string): Task {
    const task: Task = {
      id: randomUUID().slice(0, 8),
      label,
      command,
      status: "running",
      exitCode: null,
      startedAt: Date.now(),
      endedAt: null,
      child: null,
      output: "",
    }
    const shell = process.env.SHELL || "/bin/zsh"
    // A new process group, so stopping a task also stops what it started.
    const child = spawn(shell, ["-lc", command], { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"], env: process.env })
    task.child = child
    child.stdout?.on("data", (chunk: Buffer) => append(task, chunk))
    child.stderr?.on("data", (chunk: Buffer) => append(task, chunk))
    child.on("error", (error) => {
      append(task, Buffer.from(`\n${error.message}\n`))
    })
    child.on("close", (code, signal) => {
      task.child = null
      task.endedAt = Date.now()
      task.exitCode = code
      if (task.status === "running") task.status = code === 0 ? "done" : "failed"
      if (signal && task.status !== "stopped") task.status = "failed"
      onChange(list(), info(task))
      tell(task)
    })
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
    if (!task?.child?.pid) return false
    task.status = "stopped"
    try {
      process.kill(-task.child.pid, "SIGTERM")
    } catch {
      task.child.kill("SIGTERM")
    }
    const child = task.child
    setTimeout(() => {
      if (child.exitCode !== null || !child.pid) return
      try {
        process.kill(-child.pid, "SIGKILL")
      } catch {
        // Already gone.
      }
    }, 3000)
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
        const task = start(command, label?.trim() || command.slice(0, 60))
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

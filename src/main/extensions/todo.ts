import type { ExtensionContext, ExtensionFactory } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import type { TodoItem, TodoStatus } from "../../shared/types"

// Pi has no built-in task list. This follows Pi's todo example: the list lives
// in the tool result details, so it is rebuilt from the session branch and
// stays right after a fork or a rewind.

const STATUSES: TodoStatus[] = ["pending", "in_progress", "completed"]

const params = Type.Object({
  todos: Type.Array(
    Type.Object({
      text: Type.String({ description: "What to do, in a few words." }),
      status: Type.Union(
        STATUSES.map((status) => Type.Literal(status)),
        { description: "pending, in_progress or completed." },
      ),
    }),
    { description: "The whole list. It replaces the previous one." },
  ),
})

type Details = { todos: TodoItem[] }

export function todoExtension(onChange: (todos: TodoItem[]) => void): ExtensionFactory {
  return (pi) => {
    function rebuild(ctx: ExtensionContext) {
      let todos: TodoItem[] = []
      for (const entry of ctx.sessionManager.getBranch()) {
        if (entry.type !== "message") continue
        const message = entry.message
        if (message.role !== "toolResult" || message.toolName !== "todo") continue
        const details = message.details as Details | undefined
        if (details && Array.isArray(details.todos)) todos = details.todos
      }
      onChange(todos)
    }

    pi.on("session_start", (_event, ctx) => rebuild(ctx))
    pi.on("session_tree", (_event, ctx) => rebuild(ctx))

    pi.registerTool({
      name: "todo",
      label: "Todo",
      description: "Write the task list shown to the user. Send the whole list each time with each item's status.",
      promptSnippet: "Track multi-step work in a visible task list",
      promptGuidelines: [
        "Use todo for work with three or more steps. Skip it for quick questions and one-step edits.",
        "Mark one item in_progress before starting it and completed as soon as it is done, then send the list again.",
        "Before ending your turn, send the list again with finished items marked completed. Never leave an item in_progress once its work is done.",
      ],
      parameters: params,
      async execute(_id, input) {
        const raw = (input as { todos?: { text?: unknown; status?: unknown }[] }).todos ?? []
        const todos: TodoItem[] = []
        for (const item of raw) {
          if (typeof item.text !== "string" || !item.text.trim()) continue
          let status: TodoStatus = "pending"
          if (STATUSES.includes(item.status as TodoStatus)) status = item.status as TodoStatus
          todos.push({ text: item.text.trim(), status })
        }
        onChange(todos)
        const done = todos.filter((todo) => todo.status === "completed").length
        const lines = todos.map((todo) => `[${mark(todo.status)}] ${todo.text}`)
        // The tool result is the one channel that reaches the model on every
        // update — use it to push back against stale lists.
        const reminder = done < todos.length ? "\nKeep this list current: re-send it as items complete, and mark finished items completed before you end your turn." : ""
        return {
          content: [{ type: "text", text: `${done}/${todos.length} done\n${lines.join("\n")}${reminder}` }],
          details: { todos } satisfies Details,
        }
      },
    })
  }
}

function mark(status: TodoStatus): string {
  if (status === "completed") return "x"
  if (status === "in_progress") return "~"
  return " "
}

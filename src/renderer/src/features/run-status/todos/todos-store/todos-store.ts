import { makeAutoObservable } from "mobx"
import type { TodoItem } from "@shared/types"
import type { RunStore } from "@/mirror/run-store"

// One todo as the panel draws it. The icon label and the spin are decided here.
export type TodoRow = {
  key: string
  text: string
  status: TodoItem["status"]
  iconLabel: string
  spinning: boolean
}

export type TodoPanelModel = {
  countText: string
  currentText: string
  rows: TodoRow[]
}

// The todo list above the prompt box. It is hidden when there is no list, and when every
// item is done and no run is live.
export class TodosStore {
  constructor(private readonly run: RunStore) {
    makeAutoObservable<TodosStore, "run">(this, { run: false })
  }

  get panel(): TodoPanelModel | null {
    const todos = this.run.todos
    if (todos.length === 0) {
      return null
    }
    const done = todos.filter((todo) => todo.status === "completed").length
    if (done === todos.length && !this.run.streaming) {
      return null
    }
    const current = todos.find((todo) => todo.status === "in_progress")
    return {
      countText: `${done}/${todos.length}`,
      currentText: current?.text ?? "Tasks",
      rows: todos.map((todo, index) => toRow(todo, index, this.run.streaming)),
    }
  }
}

// Spins only while a run is live. A stale list, left behind when the model ended its turn
// without re-sending it, must not look like it is still working.
function toRow(todo: TodoItem, index: number, streaming: boolean): TodoRow {
  return {
    key: `${index}:${todo.text}`,
    text: todo.text,
    status: todo.status,
    iconLabel: iconLabel(todo.status, streaming),
    spinning: todo.status === "in_progress" && streaming,
  }
}

function iconLabel(status: TodoItem["status"], streaming: boolean): string {
  if (status === "completed") {
    return "Done"
  }
  if (status === "in_progress") {
    return streaming ? "In progress" : "Not confirmed done"
  }
  return "To do"
}

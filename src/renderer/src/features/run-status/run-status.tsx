import type { ComponentType } from "react"

export type RunStatusBarProps = {
  Tasks: ComponentType
  Todos: ComponentType
  Queue: ComponentType
  Usage: ComponentType
}

// The status above the prompt box, top to bottom: running tasks, the todo list, queued
// messages, and the context meter. Each part hides itself when it has nothing to show.
export function RunStatusBar({ Tasks, Todos, Queue, Usage }: RunStatusBarProps) {
  return (
    <>
      <Tasks />
      <Todos />
      <Queue />
      <Usage />
    </>
  )
}

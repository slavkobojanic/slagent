import type { ComponentType } from "react"

export type RunStatusProps = {
  Tasks: ComponentType
  Todos: ComponentType
  Queue: ComponentType
}

export function RunStatus({ Tasks, Todos, Queue }: RunStatusProps) {
  return (
    <>
      <Tasks />
      <Todos />
      <Queue />
    </>
  )
}

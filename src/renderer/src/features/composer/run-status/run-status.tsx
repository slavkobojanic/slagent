import type { ComponentType } from "react"

export type RunStatusProps = {
  Tasks: ComponentType
  Todos: ComponentType
  Queue: ComponentType
  Usage: ComponentType
}

export function RunStatus({ Tasks, Todos, Queue, Usage }: RunStatusProps) {
  return (
    <>
      <Tasks />
      <Todos />
      <Queue />
      <Usage />
    </>
  )
}

import { makeAutoObservable } from "mobx"
import type { McpServerStatus } from "@shared/types"

export class McpStore {
  servers: McpServerStatus[] = []

  constructor() {
    makeAutoObservable(this)
  }

  setServers(value: McpServerStatus[]) {
    this.servers = value
  }
}

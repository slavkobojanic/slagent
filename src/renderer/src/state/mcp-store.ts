import { makeAutoObservable, observableRef } from "mobx"
import type { McpServerStatus } from "@shared/types"

// MCP server status. It comes from request-response calls, not from events, so a presenter writes it.
export class McpStore {
  servers: McpServerStatus[] = []

  constructor() {
    makeAutoObservable(this, { servers: observableRef })
  }

  setServers(value: McpServerStatus[]) {
    this.servers = value
  }
}

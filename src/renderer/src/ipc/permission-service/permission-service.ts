import type { ComputerPermissions, SlagentApi } from "@shared/types"

export interface PermissionService {
  getPermissions(): Promise<ComputerPermissions>
  requestAccessibility(): Promise<ComputerPermissions>
  requestScreenRecording(): Promise<ComputerPermissions>
  openPermissionSettings(pane: "accessibility" | "screen"): Promise<void>
}

export class IpcPermissionService implements PermissionService {
  constructor(private readonly api: SlagentApi) {}

  getPermissions = () => this.api.getPermissions()
  requestAccessibility = () => this.api.requestAccessibility()
  requestScreenRecording = () => this.api.requestScreenRecording()
  openPermissionSettings = (pane: "accessibility" | "screen") => this.api.openPermissionSettings(pane)
}

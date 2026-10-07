import { makeAutoObservable } from "mobx"
import type { ComputerPermissions } from "@shared/types"

export class PermissionsStore {
  permissions: ComputerPermissions | null = null

  constructor(private readonly platform: string) {
    makeAutoObservable(this)
  }

  get locked(): boolean {
    if (this.platform !== "darwin") {
      return false
    }
    if (this.permissions === null) {
      return true
    }
    return !this.permissions.accessibility || !this.permissions.screenRecording
  }

  setPermissions(value: ComputerPermissions | null) {
    this.permissions = value
  }
}

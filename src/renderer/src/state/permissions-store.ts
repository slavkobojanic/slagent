import { makeAutoObservable, observableRef } from "mobx"
import type { ComputerPermissions } from "@shared/types"

// macOS permissions for computer control. Until both are granted the whole window is locked
// behind the permissions wizard. Other platforms never lock.
export class PermissionsStore {
  permissions: ComputerPermissions | null = null

  constructor(private readonly platform: string) {
    makeAutoObservable(this, { permissions: observableRef })
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

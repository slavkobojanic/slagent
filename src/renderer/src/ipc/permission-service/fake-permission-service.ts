import type { ComputerPermissions } from "@shared/types"
import type { PermissionService } from "./permission-service"

// Nothing is granted in the fake, which is how a fresh macOS install looks.
function notGranted(): ComputerPermissions {
  return { accessibility: false, screenRecording: false, error: null }
}

export class FakePermissionService implements PermissionService {
  getPermissions = async () => notGranted()
  requestAccessibility = async () => notGranted()
  requestScreenRecording = async () => notGranted()
  openPermissionSettings = async () => {}
}

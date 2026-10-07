import type { CliStatus } from "@shared/types"
import type { CliService } from "./cli-service"

// No path and not installed: the state before the slagent command exists on this machine.
function missing(): CliStatus {
  return { path: "", state: "missing" }
}

export class FakeCliService implements CliService {
  cliStatus = async () => missing()
  installCli = async () => missing()
  uninstallCli = async () => missing()
}

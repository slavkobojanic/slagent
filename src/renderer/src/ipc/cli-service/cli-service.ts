import type { CliStatus, SlagentApi } from "@shared/types"

export interface CliService {
  cliStatus(): Promise<CliStatus>
  installCli(): Promise<CliStatus>
  uninstallCli(): Promise<CliStatus>
}

export class IpcCliService implements CliService {
  constructor(private readonly api: SlagentApi) {}

  cliStatus = () => this.api.cliStatus()
  installCli = () => this.api.installCli()
  uninstallCli = () => this.api.uninstallCli()
}

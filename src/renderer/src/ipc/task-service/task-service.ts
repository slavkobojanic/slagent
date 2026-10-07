import type { SlagentApi } from "@shared/types"

export interface TaskService {
  taskOutput(id: string): Promise<string>
  stopTask(id: string): Promise<void>
}

export class IpcTaskService implements TaskService {
  constructor(private readonly api: SlagentApi) {}

  taskOutput = (id: string) => this.api.taskOutput(id)
  stopTask = (id: string) => this.api.stopTask(id)
}

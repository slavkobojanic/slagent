import type { TaskService } from "./task-service"

export class FakeTaskService implements TaskService {
  taskOutput = async () => ""
  stopTask = async () => {}
}

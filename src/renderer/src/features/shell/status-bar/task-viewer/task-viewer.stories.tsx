import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ViewerTask } from "@/features/shell/status-bar/task-viewer/task-viewer"
import { TaskViewer } from "@/features/shell/status-bar/task-viewer/task-viewer"

const task: ViewerTask = {
  id: "task-1",
  label: "dev server",
  command: "pnpm dev",
  status: "running",
  statusText: "3m",
  projectName: "Atlas",
}

function props() {
  return {
    output: "ready on :5173",
    error: null,
    onClose: () => undefined,
    onStop: () => undefined,
    bindBottom: () => undefined,
  }
}

const meta = {
  component: TaskViewer,
} satisfies Meta<typeof TaskViewer>

export default meta

export const Running: StoryObj<typeof TaskViewer> = {
  args: { ...props(), task },
}

export const Finished: StoryObj<typeof TaskViewer> = {
  args: { ...props(), task: { ...task, status: "done", statusText: "done" } },
}

export const Empty: StoryObj<typeof TaskViewer> = {
  args: { ...props(), task: null, output: "No output yet." },
}

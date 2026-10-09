import type { Meta, StoryObj } from "@storybook/react-vite"
import type { StatusTask, StatusTerminal } from "@/features/shell/status-bar/status-bar"
import { StatusBar, type StatusBarProps } from "@/features/shell/status-bar/status-bar"

const terminal: StatusTerminal = { id: "terminal-1", title: "zsh", exited: false, origin: "user", color: null }
const running: StatusTask = { id: "task-1", label: "dev server", status: "running", statusText: "3m", projectName: "Atlas", color: "#3b82f6", exitCode: null }
const failed: StatusTask = { id: "task-2", label: "tests", status: "failed", statusText: "exit 1", projectName: "Atlas", color: "#3b82f6", exitCode: null }

function base(overrides: Partial<StatusBarProps> = {}): StatusBarProps {
  return {
    terminals: [],
    tasks: [],
    onTerminal: () => undefined,
    onTask: () => undefined,
    onTaskTerminal: () => undefined,
    onStopTask: () => undefined,
    ...overrides,
  }
}

const meta = {
  component: StatusBar,
} satisfies Meta<typeof StatusBar>

export default meta

export const Empty: StoryObj<typeof StatusBar> = {
  args: base(),
}

export const WithTerminals: StoryObj<typeof StatusBar> = {
  args: base({ terminals: [terminal, { ...terminal, id: "terminal-2", title: "node", exited: true }] }),
}

export const WithTasks: StoryObj<typeof StatusBar> = {
  args: base({ terminals: [terminal], tasks: [running, failed] }),
}

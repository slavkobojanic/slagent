import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Editor } from "@/features/editor/editor"
import { fill } from "@/storybook/slots"

const meta = {
  title: "Features/Editor/Editor",
  component: Editor,
  parameters: { layout: "fullscreen" },
  args: {
    status: "ready",
    error: null,
    tabs: [
      { absolutePath: "/p/src/a.ts", path: "src/a.ts", name: "a.ts", dirty: false },
      { absolutePath: "/p/src/b.ts", path: "src/b.ts", name: "b.ts", dirty: true },
    ],
    activePath: "/p/src/a.ts",
    banner: null,
    FileTree: fill("FileTree"),
    hostRef: fn(),
    onSelectTab: fn(),
    onCloseTab: fn(),
    onAnswerClose: fn(),
    onReload: fn(),
    onOverwrite: fn(),
    onDismiss: fn(),
    onExit: fn(),
  },
} satisfies Meta<typeof Editor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { tabs: [], activePath: null } }

export const Loading: Story = { args: { status: "loading" } }

export const Failed: Story = { args: { status: "failed", error: "The editor could not start." } }

export const ClosingWithChanges: Story = { args: { banner: { kind: "closing", name: "b.ts" } } }

export const Conflict: Story = { args: { banner: { kind: "conflict", name: "a.ts" } } }

export const SaveError: Story = { args: { banner: { kind: "error", message: "EACCES: permission denied" } } }

export const BinaryNotice: Story = { args: { tabs: [], activePath: null, banner: { kind: "notice", message: "logo.png is a binary file." } } }

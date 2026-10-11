import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Editor } from "@/features/editor/editor"

const meta = {
  title: "Features/Editor/Editor",
  component: Editor,
  parameters: { layout: "fullscreen" },
  args: {
    url: "about:blank",
    status: "ready",
    error: null,
    frameRef: fn(),
    onFrameLoad: fn(),
    onCommand: fn(),
    onRetry: fn(),
    onExit: fn(),
  },
} satisfies Meta<typeof Editor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Loading: Story = { args: { status: "loading" } }

export const Starting: Story = { args: { url: null, status: "loading" } }

export const Failed: Story = { args: { url: null, status: "failed", error: "The editor server stopped (exit 1)." } }

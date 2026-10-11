import type { Meta, StoryObj } from "@storybook/react-vite"
import { EditorFrame } from "@/features/shell/editor-frame/editor-frame"
import { fill } from "@/storybook/slots"

const meta = {
  title: "Features/Shell/EditorFrame",
  component: EditorFrame,
  parameters: { layout: "fullscreen" },
  args: { editorMode: true, Editor: fill("Editor") },
} satisfies Meta<typeof EditorFrame>

export default meta
type Story = StoryObj<typeof meta>

export const EditorMode: Story = {}

export const ChatMode: Story = { args: { editorMode: false } }

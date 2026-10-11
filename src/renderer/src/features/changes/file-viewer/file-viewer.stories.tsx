import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { FileViewer } from "@/features/changes/file-viewer/file-viewer"

const file = {
  path: "src/shared/types.ts",
  absolutePath: "/work/slagent/src/shared/types.ts",
  line: 12,
  contents: "export type AppMeta = {\n  ready: boolean\n}",
  size: 4096,
  binary: false,
  truncated: false,
}

const meta = {
  title: "Features/Changes/FileViewer",
  component: FileViewer,
  parameters: { layout: "fullscreen" },
  args: { file, sizeLabel: "4 KB", ready: true, themeType: "dark", scrollRef: fn(), onOpenInEditor: fn() },
} satisfies Meta<typeof FileViewer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Binary: Story = { args: { file: { ...file, binary: true } } }

export const Truncated: Story = { args: { file: { ...file, truncated: true } } }

export const NotReady: Story = { args: { ready: false } }

import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { FileTree } from "@/features/editor/file-tree/file-tree"

const row = (path: string, depth: number, dir = false, expanded = false) => ({ path, name: path.split("/").pop() ?? path, depth, dir, expanded, loading: false })

const meta = {
  title: "Features/Editor/FileTree",
  component: FileTree,
  decorators: [(Story) => <div className="flex h-96"><Story /></div>],
  args: {
    rows: [row("src", 0, true, true), row("src/ui", 1, true), row("src/index.ts", 1), row("src/app.tsx", 1), row("package.json", 0), row("README.md", 0)],
    activePath: "src/index.ts",
    error: null,
    onToggle: fn(),
    onOpen: fn(),
    onRefresh: fn(),
  },
} satisfies Meta<typeof FileTree>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { rows: [], activePath: null } }

export const WithError: Story = { args: { rows: [], error: "The project folder could not be read." } }

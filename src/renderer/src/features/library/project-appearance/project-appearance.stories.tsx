import type { Meta, StoryObj } from "@storybook/react-vite"
import { ProjectAppearance, type ProjectAppearanceProps } from "@/features/library/project-appearance/project-appearance"

function base(overrides: Partial<ProjectAppearanceProps> = {}): ProjectAppearanceProps {
  return {
    open: true,
    projectName: "Atlas",
    icon: null,
    color: null,
    busy: false,
    error: null,
    onIcon: () => undefined,
    onColor: () => undefined,
    onCancel: () => undefined,
    onConfirm: () => undefined,
    ...overrides,
  }
}

const meta = {
  component: ProjectAppearance,
} satisfies Meta<typeof ProjectAppearance>

export default meta

export const Default: StoryObj<typeof ProjectAppearance> = {
  args: base(),
}

export const Selected: StoryObj<typeof ProjectAppearance> = {
  args: base({ icon: "rocket", color: "blue" }),
}

export const Saving: StoryObj<typeof ProjectAppearance> = {
  args: base({ busy: true }),
}

export const Failed: StoryObj<typeof ProjectAppearance> = {
  args: base({ error: "Unknown icon." }),
}

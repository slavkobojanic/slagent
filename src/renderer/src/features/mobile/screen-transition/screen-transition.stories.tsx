import type { Meta } from "@storybook/react"
import { ScreenTransition } from "./screen-transition"

export default {
  title: "Features/Mobile/ScreenTransition",
  component: ScreenTransition,
  args: {
    screen: "chats",
    current: "chats",
    leaving: null,
    direction: "push",
    entering: false,
    onScreenChange: () => undefined,
  },
} satisfies Meta<typeof ScreenTransition>

export const Default = {}

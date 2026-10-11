import type { Meta } from "@storybook/react"
import { ScreenTransition } from "./screen-transition"

export default {
  title: "Features/Mobile/ScreenTransition",
  component: ScreenTransition,
} satisfies Meta<typeof ScreenTransition>

export const Default = { args: { screen: "chats" } }

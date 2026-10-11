import type { Meta } from "@storybook/react"
import { SavedServers } from "./saved-servers"

export default {
  title: "Features/Mobile/SavedServers",
  component: SavedServers,
} satisfies Meta<typeof SavedServers>

export const Default = { args: { servers: [] } }

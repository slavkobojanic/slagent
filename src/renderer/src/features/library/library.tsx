import type { ComponentType } from "react"

export type LibraryProps = {
  Sidebar: ComponentType
  ChatDeletion: ComponentType
  ProjectRemoval: ComponentType
  ProjectAppearance: ComponentType
  CommandPalette: ComponentType
}

// The sidebar's aside comes first: the shell's slot styles it as a direct child. The dialogs portal out.
export function Library({ Sidebar, ChatDeletion, ProjectRemoval, ProjectAppearance, CommandPalette }: LibraryProps) {
  return (
    <>
      <Sidebar />
      <ChatDeletion />
      <ProjectRemoval />
      <ProjectAppearance />
      <CommandPalette />
    </>
  )
}

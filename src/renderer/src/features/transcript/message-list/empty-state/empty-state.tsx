import { ConversationEmptyState } from "@/components/ai-elements/conversation"
import { Button } from "@/components/ui/button"

export type EmptyStateProps = {
  configured: boolean
  cwd: string
  onConnect: () => void
  onChoose: () => void
  onNewChat: () => void
}

// Asks for the first thing missing: a folder, then a connected model.
export function EmptyState({ configured, cwd, onConnect, onChoose, onNewChat }: EmptyStateProps) {
  if (!cwd) {
    return (
      <ConversationEmptyState>
        <h1 className="text-xl font-medium tracking-tight">Choose a folder</h1>
        <p className="max-w-md text-sm text-muted-foreground">A project is the folder the agent works in.</p>
        <div className="mt-2 flex gap-2">
          <Button type="button" onClick={onChoose}>
            Choose folder
          </Button>
          <Button type="button" variant="outline" onClick={onNewChat}>
            New chat
          </Button>
        </div>
      </ConversationEmptyState>
    )
  }

  if (!configured) {
    return (
      <ConversationEmptyState>
        <h1 className="text-xl font-medium tracking-tight">Connect OpenRouter</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Add an API key, or sign in with the Pi CLI. slagent uses the same credentials. To use your Claude subscription instead,
          pick a Claude Code model from the model menu.
        </p>
        <Button type="button" className="mt-2" onClick={onConnect}>
          Add API key
        </Button>
      </ConversationEmptyState>
    )
  }

  return (
    <ConversationEmptyState>
      <h1 className="text-xl font-medium tracking-tight">Ask for a change in this folder</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The agent can read files, edit them, and run commands. Pi extensions and skills load from this folder and from your Pi config.
      </p>
      <p className="font-mono text-xs break-all text-muted-foreground/70">{cwd}</p>
    </ConversationEmptyState>
  )
}

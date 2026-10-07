import { EMPTY_PERSONALISATION, type Snapshot, type UiEvent } from "@shared/types"
import type { AppService } from "./app-service"

export class FakeAppService implements AppService {
  readonly platform = "darwin"
  readonly systemVersion = "24.0.0"
  private readonly snapshot = seedSnapshot()
  private readonly listeners = new Set<(event: UiEvent) => void>()

  getSnapshot = async () => this.snapshot

  onEvent = (listener: (event: UiEvent) => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Tests drive the mirror through this: every onEvent listener receives the event.
  emit = (event: UiEvent) => {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  openExternal = async () => {}
}

// An empty library, no open chat, and OpenRouter not configured.
function seedSnapshot(): Snapshot {
  return {
    revision: 0,
    meta: {
      ready: true,
      error: null,
      cwd: "/Users/you/projects/example",
      agentDir: "/Users/you/.slagent/agent",
      modelId: null,
      modelName: null,
      modelProvider: null,
      models: [],
      openRouter: { configured: false, source: null, type: null, envKey: false },
      extensions: [],
      extensionErrors: [],
      usageTotals: { tokens: 0, cost: 0, chats: 0 },
      personalisation: { ...EMPTY_PERSONALISATION },
    },
    library: { projects: [], openProjectId: null, chats: [], openChatId: null },
    messages: [],
    streaming: false,
    notice: null,
    queue: [],
    usage: null,
    todos: [],
    planMode: false,
    planProposal: null,
    question: null,
    tasks: [],
    windowStart: 0,
    hasOlder: false,
    hasNewer: false,
  }
}

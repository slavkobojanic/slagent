import type {
  ChatMessage,
  PromptRequest,
  QuestionReply,
  QueueMode,
  RewindMode,
  RewindResult,
  SlagentApi,
  TranscriptPage,
} from "@shared/types"

export interface ChatService {
  prompt(request: PromptRequest): Promise<void>
  abort(): Promise<void>
  newChat(): Promise<void>
  editMessage(id: string, text: string): Promise<void>
  rewind(id: string, mode: RewindMode): Promise<RewindResult>
  undoRewind(commit: string): Promise<void>
  compact(): Promise<void>
  setQueueMode(id: string, mode: QueueMode): Promise<void>
  removeQueued(id: string): Promise<void>
  setPlanMode(enabled: boolean): Promise<void>
  approvePlan(): Promise<void>
  answerQuestion(id: string, reply: QuestionReply): Promise<void>
  pageTranscript(page: TranscriptPage): Promise<void>
  readTranscript(chatId: string): Promise<ChatMessage[]>
}

export class IpcChatService implements ChatService {
  constructor(private readonly api: SlagentApi) {}

  prompt = (request: PromptRequest) => this.api.prompt(request)
  abort = () => this.api.abort()
  newChat = () => this.api.newChat()
  editMessage = (id: string, text: string) => this.api.editMessage(id, text)
  rewind = (id: string, mode: RewindMode) => this.api.rewind(id, mode)
  undoRewind = (commit: string) => this.api.undoRewind(commit)
  compact = () => this.api.compact()
  setQueueMode = (id: string, mode: QueueMode) => this.api.setQueueMode(id, mode)
  removeQueued = (id: string) => this.api.removeQueued(id)
  setPlanMode = (enabled: boolean) => this.api.setPlanMode(enabled)
  approvePlan = () => this.api.approvePlan()
  answerQuestion = (id: string, reply: QuestionReply) => this.api.answerQuestion(id, reply)
  pageTranscript = (page: TranscriptPage) => this.api.pageTranscript(page)
  readTranscript = (chatId: string) => this.api.readTranscript(chatId)
}

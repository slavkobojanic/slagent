import type { ChatMessage, RewindResult } from "@shared/types"
import type { ChatService } from "./chat-service"

// Writes resolve without effect, since the fake has no run to change. Reads return empty seeds.
export class FakeChatService implements ChatService {
  prompt = async () => {}
  abort = async () => {}
  newChat = async () => {}
  editMessage = async () => {}
  rewind = async (): Promise<RewindResult> => ({ text: "", undo: null })
  undoRewind = async () => {}
  compact = async () => {}
  setQueueMode = async () => {}
  removeQueued = async () => {}
  setPlanMode = async () => {}
  approvePlan = async () => {}
  answerQuestion = async () => {}
  pageTranscript = async () => {}
  readTranscript = async (): Promise<ChatMessage[]> => []
}

import type { ChatSearchResult } from "@shared/types"
import type { LibraryService } from "./library-service"

// The library itself lives in the app snapshot. These calls only succeed with no effect.
export class FakeLibraryService implements LibraryService {
  openProject = async () => {}
  openChat = async () => {}
  searchChats = async (): Promise<ChatSearchResult[]> => []
  pinProject = async () => {}
  pinChat = async () => {}
  renameChat = async () => {}
  deleteChat = async () => {}
  removeProject = async () => {}
  chooseFolder = async () => {}
}

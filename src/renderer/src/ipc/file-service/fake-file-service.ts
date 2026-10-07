import type { FileMatch, FileView } from "@shared/types"
import type { FileService } from "./file-service"

export class FakeFileService implements FileService {
  searchFiles = async (): Promise<FileMatch[]> => []
  readFile = async (): Promise<FileView | null> => null
  // Nothing opens in the fake, so report that the editor did not take the file.
  openInEditor = async () => false
  pathForFile = (file: File) => `/fake/${file.name}`
}

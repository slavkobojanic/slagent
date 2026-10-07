import type { FileMatch, FileView, SlagentApi } from "@shared/types"

export interface FileService {
  searchFiles(query: string): Promise<FileMatch[]>
  readFile(path: string): Promise<FileView | null>
  openInEditor(path: string): Promise<boolean>
  pathForFile(file: File): string
}

export class IpcFileService implements FileService {
  constructor(private readonly api: SlagentApi) {}

  searchFiles = (query: string) => this.api.searchFiles(query)
  readFile = (path: string) => this.api.readFile(path)
  openInEditor = (path: string) => this.api.openInEditor(path)
  pathForFile = (file: File) => this.api.pathForFile(file)
}

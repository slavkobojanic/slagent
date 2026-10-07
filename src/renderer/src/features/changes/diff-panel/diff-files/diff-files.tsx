import type { ComponentType } from "react"
import type { FileDiff } from "@/lib/diff"

export type DiffFilesProps = {
  files: FileDiff[]
  emptyText: string
  DiffFile: ComponentType<{ file: FileDiff }>
}

export function DiffFiles({ files, emptyText, DiffFile }: DiffFilesProps) {
  if (files.length === 0) {
    return <p className="px-4 py-6 text-sm text-white/50">{emptyText}</p>
  }
  return (
    <>
      {files.map((file) => (
        <DiffFile key={file.path} file={file} />
      ))}
    </>
  )
}

import type { ChangeEvent } from "react"

export type FileInputProps = {
  attach: (element: HTMLInputElement | null) => void
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function FileInput({ attach, onChange }: FileInputProps) {
  return <input ref={attach} type="file" multiple aria-label="Upload files" title="Upload files" className="hidden" onChange={onChange} />
}

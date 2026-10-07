export type ToolLabelProps = {
  // The sentence to show when the step is not about a file.
  text: string
  // The file the tool works on. When set, its path is a button that opens the file.
  file: { name: string; path: string } | null
  onOpenFile: (path: string) => void
}

// The label of one tool step: a sentence, or the tool name and the file it touched.
export function ToolLabel({ text, file, onOpenFile }: ToolLabelProps) {
  if (file === null) {
    return <>{text}</>
  }
  return (
    <>
      {file.name}{" "}
      <button
        type="button"
        className="text-left underline-offset-2 hover:text-foreground hover:underline"
        title="View file"
        onClick={() => onOpenFile(file.path)}
      >
        {file.path}
      </button>
    </>
  )
}

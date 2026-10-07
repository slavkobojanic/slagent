// Splits a unified diff into files and numbers each line on its side.
export type DiffLine = {
  kind: "hunk" | "add" | "del" | "context"
  text: string
  oldLine: number | null
  newLine: number | null
}

export type FileDiff = {
  path: string
  // This file's part of the diff, as a patch Pierre can render.
  patch: string
  lines: DiffLine[]
  added: number
  removed: number
}

export function parseDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = []
  let current: FileDiff | null = null
  let oldLine = 0
  let newLine = 0
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = / b\/(.+)$/.exec(line)
      current = { path: match?.[1] ?? line.slice(11), patch: "", lines: [], added: 0, removed: 0 }
      files.push(current)
    }
    if (!current) continue
    current.patch += `${line}\n`
    if (line.startsWith("diff --git ")) continue
    if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      if (line.startsWith("+++ b/")) current.path = line.slice(6).replace(/\t$/, "")
      continue
    }
    if (/^(index |new file mode|deleted file mode|similarity index|rename from|rename to|old mode|new mode)/.test(line)) continue
    if (line.startsWith("@@")) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line)
      oldLine = Number(match?.[1] ?? 0)
      newLine = Number(match?.[2] ?? 0)
      current.lines.push({ kind: "hunk", text: line, oldLine: null, newLine: null })
      continue
    }
    if (line.startsWith("\\")) continue
    if (line.startsWith("+")) {
      current.added += 1
      current.lines.push({ kind: "add", text: line, oldLine: null, newLine })
      newLine += 1
      continue
    }
    if (line.startsWith("-")) {
      current.removed += 1
      current.lines.push({ kind: "del", text: line, oldLine, newLine: null })
      oldLine += 1
      continue
    }
    // Real context lines start with a space; an empty one is the end of the diff.
    if (!line) continue
    current.lines.push({ kind: "context", text: line, oldLine, newLine })
    oldLine += 1
    newLine += 1
  }
  return files
}

// The text of one line on one side, for quoting it in a comment.
export function lineText(file: FileDiff, side: "old" | "new", line: number): string {
  for (const item of file.lines) {
    if (side === "old" && item.oldLine === line && item.kind !== "add") return item.text.slice(1)
    if (side === "new" && item.newLine === line && item.kind !== "del") return item.text.slice(1)
  }
  return ""
}

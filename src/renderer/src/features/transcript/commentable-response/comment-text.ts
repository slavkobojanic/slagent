const LIST_ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])[ \t]/

// Splits a top-level list block into its items, nested lines staying with their item. Anything
// that is not a list of two or more items stays whole.
export function listItems(block: string): string[] | null {
  const lines = block.replace(/\s+$/, "").split("\n")
  const first = LIST_ITEM.exec(lines[0] ?? "")
  if (!first) {
    return null
  }
  const indent = first[1]?.length ?? 0
  const items: string[][] = []
  for (const line of lines) {
    const match = LIST_ITEM.exec(line)
    const dedented = line.replace(new RegExp(`^ {0,${indent}}`), "")
    if (match && (match[1]?.length ?? 0) === indent) {
      items.push([dedented])
    } else {
      items.at(-1)?.push(dedented)
    }
  }
  if (items.length < 2) {
    return null
  }
  return items.map((item) => item.join("\n").trim())
}

// Collapses whitespace so a selection matches the rendered text however it was split across elements.
export function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

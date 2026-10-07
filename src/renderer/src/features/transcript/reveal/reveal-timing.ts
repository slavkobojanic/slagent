// A streamed response shows one block at a time, each one step after the block before it.
export const REVEAL_STEP_MS = 220

// When block `index` appears. The first block shows at the origin. Each later block shows at its
// own slot, or one step after the block before it when that is later.
export function blockStart(origin: number, index: number, previousStart: number): number {
  if (index === 0) {
    return origin
  }
  const slot = origin + index * REVEAL_STEP_MS
  const afterPrevious = previousStart + REVEAL_STEP_MS
  return Math.max(slot, afterPrevious)
}

// A fenced code block. Code blocks fade in as a whole rather than word by word.
export function isCodeBlock(block: string): boolean {
  return block.trimStart().startsWith("```")
}
